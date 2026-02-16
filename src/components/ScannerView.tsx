import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Vibration, Animated } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { Feather } from '@react-native-vector-icons/feather';
import { Colors } from '../utils/colors';

interface ScannerViewProps {
  onScan: (data: string) => Promise<void>;
  enabled?: boolean;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onScan,
  enabled = true,
}) => {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const nfcLoopRef = useRef(true);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (codes.length > 0 && !isProcessingQr && enabled) {
        const code = codes[0];
        if (code.value) {
          handleQrScan(code.value);
        }
      }
    },
  });

  useEffect(() => {
    checkNfcSupport();
    if (!hasPermission) {
      requestPermission();
    }

    return () => {
      stopPulseAnimation();
      cleanupNfc();
    };
  }, []);

  // Start NFC scanning loop when enabled
  useEffect(() => {
    if (nfcSupported && enabled) {
      startNfcLoop();
    } else {
      stopNfcLoop();
    }

    return () => {
      stopNfcLoop();
    };
  }, [nfcSupported, enabled]);

  // Handle pulse animation for NFC
  useEffect(() => {
    if (nfcScanning) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [nfcScanning]);

  const checkNfcSupport = async () => {
    try {
      console.log('🔍 [NFC] Checking NFC support...');
      const supported = await NfcManager.isSupported();
      console.log('📱 [NFC] Device NFC support:', supported);
      
      if (supported) {
        try {
          await NfcManager.start();
          console.log('✅ [NFC] NFC Manager started successfully');
          setNfcSupported(true);
        } catch (startError) {
          console.error('❌ [NFC] Failed to start NFC Manager:', startError);
          setNfcSupported(false);
        }
      } else {
        console.log('ℹ️ [NFC] Device does not support NFC');
        setNfcSupported(false);
      }
    } catch (error) {
      console.error('❌ [NFC] Error checking NFC support:', error);
      setNfcSupported(false);
    }
  };

  const cleanupNfc = async () => {
    try {
      console.log('🧹 [NFC] Cleaning up NFC...');
      nfcLoopRef.current = false;
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      // Ignore cleanup errors
      console.log('ℹ️ [NFC] Cleanup error (ignored):', error);
    }
  };

  const startPulseAnimation = () => {
    stopPulseAnimation();

    pulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimationRef.current.start();
  };

  const stopPulseAnimation = () => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }
    pulseAnim.setValue(1);
  };

  // Continuous NFC scanning loop
  const startNfcLoop = async () => {
    nfcLoopRef.current = true;
    console.log('🔵 [NFC] Starting continuous NFC scanning');

    while (nfcLoopRef.current && nfcSupported && enabled) {
      try {
        setNfcScanning(true);

        await NfcManager.requestTechnology(NfcTech.Ndef, {
          alertMessage: 'Ready to scan NFC card',
        });

        const tag = await NfcManager.getTag();
        console.log('📱 [NFC] Tag detected:', tag);

        if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
          const record = tag.ndefMessage[0];
          const payload = Uint8Array.from(record.payload);
          const text = Ndef.text.decodePayload(payload);

          console.log('✅ [NFC] Data decoded:', text);
          Vibration.vibrate(100);

          // Check for duplicate scan (within 3 seconds)
          const now = Date.now();
          if (now - lastScanTime > 3000) {
            setLastScanTime(now);
            await onScan(text);
          } else {
            console.log('⏭️ [NFC] Duplicate scan ignored (too soon)');
            Vibration.vibrate([0, 100, 100, 100]); // Different vibration for duplicate
          }
        }

        // Cancel technology request after successful read
        await NfcManager.cancelTechnologyRequest();

        // Small delay before next scan
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
      } catch (error: any) {
        // Silently handle errors and continue loop
        const errorStr = error.toString();

        if (
          !errorStr.includes('cancelled') &&
          !errorStr.includes('Session invalidated')
        ) {
          console.log('⚠️ [NFC] Scan error:', errorStr);
        }

        try {
          await NfcManager.cancelTechnologyRequest();
        } catch (e) {
          // Ignore cleanup errors
        }

        // Small delay before retry
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
      }
    }

    setNfcScanning(false);
    console.log('⏸️ [NFC] Scanning loop stopped');
  };

  const stopNfcLoop = () => {
    console.log('🛑 [NFC] Stopping NFC loop');
    nfcLoopRef.current = false;
    cleanupNfc();
  };

  const handleQrScan = async (data: string) => {
    if (!enabled || isProcessingQr || !data) return;

    console.log('📷 [QR] QR code scanned:', data);

    // Check for duplicate scan (within 3 seconds)
    const now = Date.now();
    if (now - lastScanTime < 3000) {
      console.log('⏭️ [QR] Duplicate scan ignored (too soon)');
      Vibration.vibrate([0, 100, 100, 100]); // Different vibration for duplicate
      return;
    }

    setIsProcessingQr(true);
    setLastScanTime(now);
    Vibration.vibrate(100);

    try {
      await onScan(data);
    } catch (error) {
      console.error('❌ [QR] Scan error:', error);
    } finally {
      // Prevent rapid re-scans
      setTimeout(() => setIsProcessingQr(false), 3000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Indicators */}
      <View style={styles.statusBar}>
        {/* NFC Status */}
        <View style={styles.statusItem}>
          <Animated.View
            style={[styles.statusIcon, { transform: [{ scale: pulseAnim }] }]}
          >
            <Feather
              name="smartphone"
              size={20}
              color={nfcScanning ? Colors.primary : nfcSupported ? Colors.success : Colors.textSecondary}
            />
          </Animated.View>
          <View style={styles.statusText}>
            <Text style={styles.statusLabel}>NFC</Text>
            <Text
              style={[
                styles.statusValue,
                nfcScanning && styles.statusValueActive,
              ]}
            >
              {nfcScanning ? 'Scanning...' : nfcSupported ? 'Ready' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* QR Status */}
        <View style={styles.statusItem}>
          <View style={styles.statusIcon}>
            <Feather
              name="maximize"
              size={20}
              color={hasPermission ? Colors.primary : Colors.textSecondary}
            />
          </View>
          <View style={styles.statusText}>
            <Text style={styles.statusLabel}>QR Code</Text>
            <Text
              style={[
                styles.statusValue,
                hasPermission && styles.statusValueActive,
              ]}
            >
              {hasPermission ? 'Scanning...' : 'No Permission'}
            </Text>
          </View>
        </View>
      </View>

      {/* QR Scanner */}
      <View style={styles.qrContainer}>
        {!hasPermission ? (
          <View style={styles.permissionContainer}>
            <Feather name="camera-off" size={64} color={Colors.textSecondary} />
            <Text style={styles.permissionText}>
              Camera permission required for QR scanning
            </Text>
          </View>
        ) : !device ? (
          <View style={styles.permissionContainer}>
            <Feather name="camera-off" size={64} color={Colors.textSecondary} />
            <Text style={styles.permissionText}>Camera not available</Text>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={enabled && hasPermission}
              codeScanner={codeScanner}
            />
            <View style={styles.scanOverlay}>
              {/* ✅ Improved scan frame with better corner positioning */}
              <View style={styles.scanFrame}>
                {/* Top Left Corner */}
                <View style={[styles.corner, styles.topLeft]} />
                {/* Top Right Corner */}
                <View style={[styles.corner, styles.topRight]} />
                {/* Bottom Left Corner */}
                <View style={[styles.corner, styles.bottomLeft]} />
                {/* Bottom Right Corner */}
                <View style={[styles.corner, styles.bottomRight]} />
                
                {/* Scan Line Animation */}
                <View style={styles.scanLineContainer}>
                  <View style={styles.scanLine} />
                </View>
              </View>

              <View style={styles.qrInstructions}>
                <Feather name="info" size={16} color={Colors.textPrimary} />
                <View style={styles.instructionTextContainer}>
                  <Text style={styles.qrInstructionText}>
                    Scan QR code or tap NFC card
                  </Text>
                  <Text style={styles.qrInstructionSubtext}>
                    {nfcSupported ? 'Both methods work simultaneously' : 'QR scanning only (NFC not available)'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusValueActive: {
    color: Colors.primary,
  },
  qrContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderRadius: 20,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.primary,
    borderWidth: 5,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLineContainer: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    marginTop: -1,
  },
  scanLine: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  qrInstructions: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    maxWidth: '85%',
  },
  instructionTextContainer: {
    flex: 1,
  },
  qrInstructionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  qrInstructionSubtext: {
    color: Colors.textPrimary,
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 20,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginVertical: 16,
    textAlign: 'center',
  },
});