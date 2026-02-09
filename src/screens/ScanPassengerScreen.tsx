import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  Vibration,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather';
import { Colors } from '../utils/colors';
import { TripHeader } from '../components/TripHeader';
import { ScannerView } from '../components/ScannerView';
import { Card, CardSection } from '../components/common/Card';
import { useTripStore } from '../store/tripStore';
import {
  getAllManifestForTrip,
  lookupPassenger,
} from '../services/sqliteService';
import { enqueueEvent } from '../services/offlineQueue';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto-js';
import { useAlert } from '../contexts/AlertContext';

interface ScanPassengerScreenProps {
  navigation: any;
}

type ScanMode = 'nfc' | 'qr';

export const ScanPassengerScreen: React.FC<ScanPassengerScreenProps> = ({
  navigation,
}) => {
  const [scanMode, setScanMode] = useState<ScanMode>('nfc');
  const currentTrip = useTripStore((state: any) => state.currentTrip);
  const incrementScanned = useTripStore((state: any) => state.incrementScanned);
  const { scannedCount, onboardCount, absentCount } = useTripStore();
  const { showAlert } = useAlert();

  const hashCode = (code: string): string => {
    return CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(code.trim())).toString();
  };

  const processPassenger = async (code: string) => {
    if (!currentTrip) {
      showAlert({
        title: 'Error',
        message: 'No active trip selected',
        type: 'error',
      });
      return;
    }

    // ✅ DEBUG: Log the raw scanned code
    console.log('═══════════════════════════════');
    console.log('📱 Raw scanned code:', code);
    console.log('📱 Code length:', code.length);
    console.log('📱 Code type:', typeof code);

    // ✅ DEBUG: Log current trip ID
    console.log('🎫 Current trip ID:', currentTrip.trip.tripId);

    // Hash the code
    const codeHash = hashCode(code);
    console.log('🔐 Generated hash:', codeHash);
    console.log('🔐 Hash length:', codeHash.length);

    // ✅ DEBUG: Check what's in the database
    // const allPassengers = await getAllManifestForTrip(currentTrip.trip.tripId);
    // console.log('📋 Total passengers in manifest:', allPassengers?.length || 0);
    // if (allPassengers && allPassengers.length > 0) {
    //   console.log('📋 First passenger hash:', allPassengers[0].uniqueCodeHash);
    //   console.log('📋 All hashes in manifest:');
    //   allPassengers.forEach((p: any, i: number) => {
    //     console.log(`   ${i + 1}. ${p.uniqueCodeHash}`);
    //   });
    // }

    // Look up passenger
    const passenger = await lookupPassenger(currentTrip.trip.tripId, codeHash);
    console.log('🔍 Lookup result:', passenger);
    console.log('═══════════════════════════════');

    if (!passenger) {
      Vibration.vibrate([0, 200, 100, 200]);
      showAlert({
        title: 'Not Found',
        message: `Passenger not in manifest for this trip\n\nScanned: ${code}\nHash: ${codeHash.substring(
          0,
          16,
        )}...`,
        type: 'error',
      });
      return;
    }

    if (!passenger.active) {
      Vibration.vibrate([0, 200, 100, 200]);
      showAlert({
        title: 'Inactive',
        message: 'Passenger membership is inactive',
        type: 'warning',
      });
      return;
    }

    if (!passenger.canBoard) {
      Vibration.vibrate([0, 200, 100, 200]);
      showAlert({
        title: 'Cannot Board',
        message: passenger.reason || 'Passenger cannot board this trip',
        type: 'error',
      });
      return;
    }

    // Record scan
    await enqueueEvent({
      eventId: uuidv4(),
      memberId: passenger.memberId,
      customerId: passenger.customerId,
      status: 'onboard',
      operation: scanMode === 'nfc' ? 'card' : 'qrcode',
      scannedAt: new Date().toISOString(),
    });

    incrementScanned('onboard');
    Vibration.vibrate(100);

    // ✅ Success alert
    showAlert({
      title: 'Success ✓',
      message: `Passenger boarded successfully${
        passenger.isPAYG
          ? `\n\nRemaining balance: GHS ${passenger.spendable?.toFixed(2)}`
          : ''
      }`,
      type: 'success',
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Trip Header */}
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

      {/* Stats Cards */}
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

      {/* Scanner */}
      <ScannerView
        mode={scanMode}
        onScan={processPassenger}
        onModeChange={setScanMode}
        enabled={true}
        showModeSwitch={true}
      />
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
});
