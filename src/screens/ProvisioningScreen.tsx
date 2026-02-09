import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { Colors } from '../utils/colors';
import { saveProvisioning } from '../services/deviceStorage';
import { Feather } from '@react-native-vector-icons/feather';

interface ProvisioningScreenProps {
  onProvisioned: () => void;
}

export const ProvisioningScreen: React.FC<ProvisioningScreenProps> = ({
  onProvisioned,
}) => {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingQR, setProcessingQR] = useState(false);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !processingQR && !loading) {
        const code = codes[0];
        if (code.value) {
          handleQRCodeScanned(code.value);
        }
      }
    },
  });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, []);

  const handleQRCodeScanned = async (data: string) => {
    if (!data || loading || processingQR) return;

    try {
      setProcessingQR(true);
      setLoading(true);
      setScanning(false);

      const provisioning = JSON.parse(data);

      if (!provisioning?.deviceId || !provisioning?.deviceKey) {
        throw new Error('Invalid provisioning QR code');
      }

      await saveProvisioning({
        deviceId: provisioning.deviceId,
        deviceKey: provisioning.deviceKey,
        apiBase: provisioning.apiBase,
      });

      Alert.alert('Success', 'Device provisioned successfully!', [
        { text: 'OK', onPress: onProvisioned },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid QR code');
      setScanning(true);
      setProcessingQR(false);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setProcessingQR(false);
      }, 2000);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="camera-off" size={64} color={Colors.textSecondary} />
          <Text style={styles.errorText}>Camera permission required</Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="camera-off" size={64} color={Colors.textSecondary} />
          <Text style={styles.errorText}>Camera not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} text="Provisioning device..." />

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name="shield" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Device Provisioning</Text>
        <Text style={styles.subtitle}>
          Scan the QR code from the admin dashboard to provision this validator
          device
        </Text>
      </View>

      {scanning ? (
        <View style={styles.cameraContainer}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={scanning}
            codeScanner={codeScanner}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            <View style={styles.scanInstructions}>
              <Text style={styles.scanText}>
                Position QR code within the frame
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.instructionsCard}>
          <Feather name="info" size={24} color={Colors.info} />
          <Text style={styles.instructionsTitle}>How to provision:</Text>
          <Text style={styles.instructionsText}>
            1. Go to admin dashboard{'\n'}
            2. Navigate to Devices section{'\n'}
            3. Select this device{'\n'}
            4. Click "Generate Provisioning QR"{'\n'}
            5. Scan the displayed QR code
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title={scanning ? 'Cancel Scan' : 'Start Scanning'}
          onPress={() => setScanning(!scanning)}
          variant={scanning ? 'secondary' : 'primary'}
          icon={
            <Feather
              name={scanning ? 'x' : 'camera'}
              size={20}
              color={Colors.textPrimary}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: { padding: 24, alignItems: 'center' },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    width: 40,
    height: 40,
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
  scanInstructions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  instructionsCard: {
    margin: 16,
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  footer: { padding: 16 },
  button: { marginTop: 16 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
});