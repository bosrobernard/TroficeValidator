import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Platform,
} from 'react-native';
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
  mode: 'nfc' | 'qr';
  onScan: (data: string) => Promise<void>;
  onModeChange: (mode: 'nfc' | 'qr') => void;
  enabled?: boolean;
  showModeSwitch?: boolean;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  mode,
  onScan,
  onModeChange,
  enabled = true,
  showModeSwitch = true,
}) => {
  const [scanning, setScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isInitializingNfc = useRef(false); // ✅ Track NFC initialization

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (codes.length > 0 && !isScanning && enabled && mode === 'qr') {
        const code = codes[0];
        if (code.value) {
          handleQrScan(code.value);
        }
      }
    },
  });

  useEffect(() => {
    checkNfcSupport();
    if (mode === 'qr' && !hasPermission) {
      requestPermission();
    }

    // Cleanup on unmount
    return () => {
      stopPulseAnimation();
      cleanupNfc();
    };
  }, []);

  // ✅ Handle mode switching with proper async cleanup
  useEffect(() => {
    const handleModeChange = async () => {
      console.log('🔄 Mode changed to:', mode);
      
      // Stop any ongoing scans
      setScanning(false);
      setIsScanning(false);
      
      // Stop animation
      stopPulseAnimation();
      
      if (mode === 'nfc' && nfcSupported) {
        // Switch to NFC mode
        await reinitializeNfc();
      } else {
        // Switch away from NFC mode
        await cleanupNfc();
      }
    };

    handleModeChange();
  }, [mode, nfcSupported]);

  // Handle NFC scanning state
  useEffect(() => {
    if (scanning && mode === 'nfc') {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [scanning, mode]);

  const checkNfcSupport = async () => {
    try {
      const supported = await NfcManager.isSupported();
      console.log('📱 NFC supported:', supported);
      setNfcSupported(supported);
      if (supported) {
        await NfcManager.start();
        console.log('✅ NFC Manager started');
      }
    } catch (error) {
      console.log('❌ NFC check error:', error);
      setNfcSupported(false);
    }
  };

  // ✅ Cleanup NFC properly
  const cleanupNfc = async () => {
    try {
      console.log('🧹 Cleaning up NFC...');
      await NfcManager.cancelTechnologyRequest();
      console.log('✅ NFC cleanup complete');
    } catch (error) {
      console.log('⚠️ NFC cleanup error (safe to ignore):', error);
    }
  };

  // ✅ Reinitialize NFC when switching back
  const reinitializeNfc = async () => {
    if (isInitializingNfc.current) {
      console.log('⏳ NFC initialization already in progress...');
      return;
    }

    try {
      isInitializingNfc.current = true;
      console.log('🔄 Reinitializing NFC...');
      
      // First, cancel any existing requests
      await cleanupNfc();
      
      // Small delay to ensure cleanup completes
      await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
      
      // Restart NFC manager
      await NfcManager.start();
      console.log('✅ NFC reinitialized and ready');
    } catch (error) {
      console.log('❌ NFC reinitialization error:', error);
    } finally {
      isInitializingNfc.current = false;
    }
  };

  const startPulseAnimation = () => {
    // Stop any existing animation
    stopPulseAnimation();

    // Create new animation
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
    pulseAnim.setValue(1); // Reset to default scale
  };

  const handleNfcScan = async () => {
    if (!enabled || mode !== 'nfc') return;

    // If already scanning, this is a cancel action
    if (scanning) {
      console.log('❌ Cancelling NFC scan');
      setScanning(false);
      stopPulseAnimation();
      await cleanupNfc();
      return;
    }

    try {
      console.log('🔵 Starting NFC scan');
      setScanning(true);
      
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Ready to scan NFC card',
      });

      const tag = await NfcManager.getTag();
      console.log('📱 NFC tag detected:', tag);

      if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
        const record = tag.ndefMessage[0];
        const payload = Uint8Array.from(record.payload);
        const text = Ndef.text.decodePayload(payload);
        
        console.log('✅ NFC data:', text);
        Vibration.vibrate(100);
        await onScan(text);
      } else {
        console.log('⚠️ No NDEF message found');
      }
    } catch (error: any) {
      console.log('NFC scan error:', error);
      // Don't show error if user cancelled
      if (error.toString().includes('cancelled')) {
        console.log('User cancelled NFC scan');
      }
    } finally {
      setScanning(false);
      stopPulseAnimation();
      await cleanupNfc();
    }
  };

  const handleQrScan = async (data: string) => {
    if (!enabled || isScanning || !data || mode !== 'qr') return;

    console.log('📷 QR scanned:', data);
    setIsScanning(true);
    Vibration.vibrate(100);
    
    try {
      await onScan(data);
    } catch (error) {
      console.log('QR scan error:', error);
    } finally {
      setTimeout(() => setIsScanning(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Mode Switch */}
      {showModeSwitch && (
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'nfc' && styles.modeButtonActive,
            ]}
            onPress={() => {
              console.log('🔄 Switching to NFC mode');
              onModeChange('nfc');
            }}
            disabled={!nfcSupported}
          >
            <Feather
              name="credit-card"
              size={20}
              color={mode === 'nfc' ? Colors.textPrimary : Colors.textSecondary}
            />
            <Text
              style={[styles.modeText, mode === 'nfc' && styles.modeTextActive]}
            >
              NFC Card
            </Text>
            {!nfcSupported && (
              <View style={styles.disabledBadge}>
                <Text style={styles.disabledText}>N/A</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'qr' && styles.modeButtonActive,
            ]}
            onPress={() => {
              console.log('🔄 Switching to QR mode');
              onModeChange('qr');
            }}
          >
            <Feather
              name="maximize"
              size={20}
              color={mode === 'qr' ? Colors.textPrimary : Colors.textSecondary}
            />
            <Text
              style={[styles.modeText, mode === 'qr' && styles.modeTextActive]}
            >
              QR Code
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scanner Content */}
      {mode === 'nfc' ? (
        <View style={styles.nfcContainer}>
          <View style={styles.nfcCard}>
            <Animated.View
              style={[
                styles.nfcIconContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Feather
                name="smartphone"
                size={80}
                color={scanning ? Colors.primary : Colors.textSecondary}
              />
            </Animated.View>

            <Text style={styles.nfcTitle}>
              {scanning ? 'Scanning...' : 'Ready to Scan'}
            </Text>
            <Text style={styles.nfcSubtitle}>
              {scanning ? 'Hold card near device' : 'Tap "Scan NFC" to start'}
            </Text>

            {scanning && (
              <View style={styles.scanningIndicator}>
                <View style={styles.scanningDot} />
                <Text style={styles.scanningText}>Waiting for card...</Text>
              </View>
            )}
          </View>

          <View style={styles.nfcActions}>
            <TouchableOpacity
              style={[
                styles.scanButton,
                scanning && styles.scanButtonActive,
                !enabled && styles.scanButtonDisabled,
              ]}
              onPress={handleNfcScan}
              disabled={!enabled}
            >
              <Feather
                name={scanning ? 'x' : 'radio'}
                size={24}
                color={Colors.textPrimary}
              />
              <Text style={styles.scanButtonText}>
                {scanning ? 'Cancel Scan' : 'Scan NFC'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.qrContainer}>
          {!hasPermission ? (
            <View style={styles.permissionContainer}>
              <Feather
                name="camera-off"
                size={64}
                color={Colors.textSecondary}
              />
              <Text style={styles.permissionText}>
                Camera permission required
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>
                  Grant Permission
                </Text>
              </TouchableOpacity>
            </View>
          ) : !device ? (
            <View style={styles.permissionContainer}>
              <Feather
                name="camera-off"
                size={64}
                color={Colors.textSecondary}
              />
              <Text style={styles.permissionText}>Camera not available</Text>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={mode === 'qr' && enabled}
                codeScanner={codeScanner}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                  <View style={styles.scanLine} />
                </View>

                <View style={styles.qrInstructions}>
                  <Text style={styles.qrInstructionText}>
                    Position QR code within the frame
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Styles remain exactly the same
const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  modeSwitch: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    position: 'relative',
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: Colors.textPrimary,
  },
  disabledBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  disabledText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  nfcContainer: {
    flex: 1,
    padding: 16,
  },
  nfcCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  nfcIconContainer: {
    marginBottom: 24,
  },
  nfcTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  nfcSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  scanningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  nfcActions: {
    marginTop: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  scanButtonActive: {
    backgroundColor: Colors.error,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  qrContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
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
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: Colors.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
  },
  qrInstructions: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  qrInstructionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginVertical: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});