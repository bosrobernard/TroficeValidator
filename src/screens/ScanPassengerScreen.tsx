import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Vibration,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather';
import { Colors } from '../utils/colors';
import { TripHeader } from '../components/TripHeader';
import { ScannerView } from '../components/ScannerView';
import { Card, CardSection } from '../components/common/Card';
import { useTripStore } from '../store/tripStore';
import { lookupPassenger } from '../services/sqliteService';
import { enqueueEvent } from '../services/offlineQueue';
import CryptoJS from 'crypto-js';
import { useAlert } from '../contexts/AlertContext';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scanSound } from '../utils/scanSound';

interface ScanPassengerScreenProps {
  navigation: any;
}

export const ScanPassengerScreen: React.FC<ScanPassengerScreenProps> = ({
  navigation,
}) => {
  const currentTrip = useTripStore((state: any) => state.currentTrip);
  const incrementScanned = useTripStore((state: any) => state.incrementScanned);
  const { scannedCount, onboardCount, absentCount } = useTripStore();
  const { showAlert } = useAlert();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const recentScansRef = useRef<Map<string, number>>(new Map());
  const DUPLICATE_SCAN_THRESHOLD = 5000; // 5 seconds

  const hashCode = (code: string): string => {
    return CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(code.trim())).toString();
  };

  // Clean up old scans every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const scans = recentScansRef.current;
      for (const [hash, timestamp] of scans.entries()) {
        if (now - timestamp > DUPLICATE_SCAN_THRESHOLD) {
          scans.delete(hash);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const detectScanMethod = (code: string): 'card' | 'qrcode' => {
    if (code.startsWith('TRFVCV') || code.length > 80) {
      return 'qrcode';
    }
    return 'card';
  };

  const processPassenger = async (code: string) => {
    if (!currentTrip) {
      showAlert({
        title: 'Error',
        message: 'No active trip selected',
        type: 'error',
        autoDismiss: true, // ✅ Auto-dismiss
        duration: 2500, // ✅ 2.5 seconds
      });
      return;
    }

    console.log('═══════════════════════════════');
    console.log('📱 Raw scanned code:', code);
    console.log('📱 Code length:', code.length);
    console.log('📱 Code type:', typeof code);
    console.log('🎫 Current trip ID:', currentTrip.trip.tripId);

    const codeHash = hashCode(code);
    console.log('🔐 Generated hash:', codeHash);
    console.log('🔐 Hash length:', codeHash.length);

    const scanMethod = detectScanMethod(code);
    console.log('📡 Detected scan method:', scanMethod);

    // ✅ Duplicate scan check
    const now = Date.now();
    const lastScanTime = recentScansRef.current.get(codeHash);

    if (lastScanTime && now - lastScanTime < DUPLICATE_SCAN_THRESHOLD) {
      const secondsAgo = Math.round((now - lastScanTime) / 1000);
      console.log(`⏭️ Duplicate scan detected (scanned ${secondsAgo}s ago)`);

      scanSound.play('duplicate');
      Vibration.vibrate([0, 100, 100, 100, 100, 100]);

      showAlert({
        title: 'Already Scanned',
        message: `Scanned ${secondsAgo}s ago. Please wait.`,
        type: 'warning',
        autoDismiss: true, // ✅ Auto-dismiss
        duration: 2000, // ✅ 2 seconds
      });
      return;
    }

    // Look up passenger
    const passenger = await lookupPassenger(currentTrip.trip.tripId, codeHash);
    console.log('🔍 Lookup result:', passenger);
    console.log('═══════════════════════════════');

    if (!passenger) {
      scanSound.play('error');
      Vibration.vibrate([0, 200, 100, 200]);
      showAlert({
        title: 'Not Found',
        message: 'Passenger not in manifest',
        type: 'error',
        autoDismiss: true, // ✅ Auto-dismiss
        duration: 2500,
      });
      return;
    }

    if (!passenger.active) {
      scanSound.play('error');
      Vibration.vibrate([0, 200, 100, 200]);
      showAlert({
        title: 'Inactive',
        message: 'Passenger membership is inactive',
        type: 'warning',
        autoDismiss: true, // ✅ Auto-dismiss
        duration: 2500,
      });
      return;
    }

    if (!passenger.canBoard) {
      scanSound.play('error');
      Vibration.vibrate([0, 200, 100, 200]);
      showAlert({
        title: 'Cannot Board',
        message: passenger.reason || 'Passenger cannot board',
        type: 'error',
        autoDismiss: true, // ✅ Auto-dismiss
        duration: 2500,
      });
      return;
    }

    // Record this scan to prevent duplicates
    recentScansRef.current.set(codeHash, now);

    // Record scan event
    await enqueueEvent({
      eventId: uuidv4(),
      memberId: passenger.memberId,
      customerId: passenger.customerId,
      status: 'onboard',
      operation: scanMethod,
      scannedAt: new Date().toISOString(),
    });

    incrementScanned('onboard');

    scanSound.play('success');
    Vibration.vibrate(100);
    showAlert({
      title: 'Success ✓',
      message: `Passenger boarded${
        passenger.isPAYG
          ? `\nBalance: GHS ${passenger.spendable?.toFixed(2)}`
          : ''
      }`,
      type: 'success',
      autoDismiss: true, // ✅ Auto-dismiss success
      duration: 2000, // ✅ Only 2 seconds for quick scanning
    });
  };

  if (!currentTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorText}>No active trip</Text>
          <Text style={styles.errorSubtext}>
            Please select a trip to start scanning
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Fixed Fullscreen Scanner View
  if (isFullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        <StatusBar hidden />

        {/* ✅ Scanner takes full screen */}
        <ScannerView onScan={processPassenger} enabled={true} />

        {/* ✅ Overlay only for UI elements - pointer-events="box-none" allows touches to pass through */}
        <View style={styles.fullscreenOverlay} pointerEvents="box-none">
          {/* Top bar with stats */}
          <View style={styles.fullscreenTopBar} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.exitButton}
              onPress={() => setIsFullscreen(false)}
            >
              <Feather name="x" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.fullscreenStats} pointerEvents="none">
              <View style={styles.fullscreenStatBadge}>
                <Feather name="users" size={16} color={Colors.primary} />
                <Text style={styles.fullscreenStatText}>{scannedCount}</Text>
              </View>
              <View style={[styles.fullscreenStatBadge, styles.successBadge]}>
                <Feather name="check-circle" size={16} color={Colors.success} />
                <Text style={styles.fullscreenStatText}>{onboardCount}</Text>
              </View>
              <View style={[styles.fullscreenStatBadge, styles.errorBadge]}>
                <Feather name="x-circle" size={16} color={Colors.error} />
                <Text style={styles.fullscreenStatText}>{absentCount}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Normal View
  return (
    <SafeAreaView style={styles.container}>
      <TripHeader
        tripId={currentTrip.trip.tripId}
        route={currentTrip.trip.routeId}
        departureTime={currentTrip.trip.validFrom}
        fare={currentTrip.trip.fare}
        currency={currentTrip.trip.currency}
        status="ACTIVE"
        onBack={() => navigation.goBack()}
        onSync={() => navigation.navigate('Sync')}
        showSync={true}
      />

      <View style={styles.statsContainer}>
        <Card style={styles.statCard} variant="outlined">
          <CardSection style={styles.statContent}>
            <Text style={styles.statNumber}>{scannedCount}</Text>
            <Text style={styles.statLabel}>Total Scanned</Text>
          </CardSection>
        </Card>

        <Card
          style={[styles.statCard, { borderColor: Colors.success }]}
          variant="outlined"
        >
          <CardSection style={styles.statContent}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>
              {onboardCount}
            </Text>
            <Text style={styles.statLabel}>Onboard</Text>
          </CardSection>
        </Card>

        <Card
          style={[styles.statCard, { borderColor: Colors.error }]}
          variant="outlined"
        >
          <CardSection style={styles.statContent}>
            <Text style={[styles.statNumber, { color: Colors.error }]}>
              {absentCount}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </CardSection>
        </Card>
      </View>

      <ScannerView onScan={processPassenger} enabled={true} />

      <View style={styles.fullscreenButtonContainer}>
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => setIsFullscreen(true)}
        >
          <Feather name="maximize" size={24} color={Colors.textPrimary} />
          <Text style={styles.fullscreenButtonText}>Fullscreen Scan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 0,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  fullscreenButtonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  fullscreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  fullscreenButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenStats: {
    flexDirection: 'row',
    gap: 12,
  },
  fullscreenStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 164, 28, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  successBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: Colors.success,
  },
  errorBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: Colors.error,
  },
  fullscreenStatText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
});
