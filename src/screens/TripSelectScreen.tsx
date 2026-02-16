import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather';
import { Colors } from '../utils/colors';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { ValidatorApi } from '../api/validatorApi';
import { saveTripPack, updateManifestDiff } from '../services/sqliteService';
import { useTripStore } from '../store/tripStore';
import { useAlert } from '../contexts/AlertContext';
import { useDeviceStore } from '../store/deviceStore';
import BackgroundSyncService from '../services/backgroundSyncService';

interface TripSelectScreenProps {
  navigation: any;
}

  const api = new ValidatorApi('https://trofice.com/api/validator');

  
export const TripSelectScreen: React.FC<TripSelectScreenProps> = ({
  navigation,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const setCurrentTrip = useTripStore((state: any) => state.setCurrentTrip);
  const currentTrip = useTripStore((state: any) => state.currentTrip);
  const bootstrapData = useDeviceStore(state => state.bootstrapData);
  const { showAlert } = useAlert();
  const backgroundSync = BackgroundSyncService.getInstance();

  // Auto-refresh manifest every 30 seconds when there's an active trip
  useEffect(() => {
    if (!currentTrip) return;

    const intervalId = setInterval(() => {
      refreshManifestInBackground();
    }, 30000); // 30 seconds

    console.log('⏰ [TripSelect] Auto-refresh manifest enabled (30s interval)');

    // Perform initial refresh after 5 seconds
    const timeoutId = setTimeout(() => {
      refreshManifestInBackground();
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      console.log('⏸️ [TripSelect] Auto-refresh manifest disabled');
    };
  }, [currentTrip?.trip?.tripId]); // Only re-run when trip ID changes

  const refreshManifestInBackground = async () => {
    if (!currentTrip) return;

    try {
      console.log('🔄 [Background] Refreshing manifest...');

      const manifestResult = await api.downloadTripPack(
        currentTrip.trip.tripId,
        currentTrip.manifestVersion,
      );

      if ('notModified' in manifestResult) {
        console.log('ℹ️ [Background] Manifest not modified');
        return;
      }

      if (!manifestResult.success) {
        console.log(
          '❌ [Background] Failed to refresh manifest:',
          manifestResult.message,
        );

        // ✅ If authentication error, don't retry in background
        if (
          manifestResult.message.toLowerCase().includes('auth') ||
          manifestResult.message.toLowerCase().includes('token')
        ) {
          console.log(
            '⏸️ [Background] Auth error detected, stopping auto-refresh',
          );
          return; // Stop trying
        }
        return;
      }

      console.log('✅ [Background] Manifest updated, checking for changes...');

      // Compare and update only changed records
      const changes = await updateManifestDiff(
        manifestResult.data.trip.tripId,
        manifestResult.data.manifestVersion,
        manifestResult.data.manifest,
      );

      if (changes.updated > 0 || changes.added > 0 || changes.removed > 0) {
        console.log(`✅ [Background] Manifest changes applied:`, changes);

        // Update the current trip with new manifest version
        setCurrentTrip(manifestResult.data);

        // Notify user of significant changes (optional - can be removed if too noisy)
        if (changes.updated > 0) {
          console.log(
            `📢 ${changes.updated} passenger(s) payment status updated`,
          );
          // Uncomment to show alert to user:
          // showAlert({
          //   title: 'Manifest Updated',
          //   message: `${changes.updated} passenger(s) updated`,
          //   type: 'info',
          // });
        }
      } else {
        console.log('ℹ️ [Background] No changes detected in manifest');
      }
    } catch (error: any) {
      console.error('❌ [Background] Manifest refresh error:', error.message);
    }
  };

  const handleDownloadTrip = async () => {
    const assignedBatchId = bootstrapData?.device.assignedBatchId;

    if (!assignedBatchId) {
      showAlert({
        title: 'Error',
        message: 'No batch assigned to this device',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setLoadingMessage('Fetching trip information...');

    try {
      // Step 1: Get current trip ID for the batch
      console.log('📥 Fetching current trip for batch:', assignedBatchId);
      const tripResult = await api.getCurrentTripByBatchId(assignedBatchId);

      if (!tripResult.success) {
        showAlert({
          title: 'Error',
          message: tripResult.message,
          type: 'error',
        });
        setLoading(false);
        return;
      }

      if (!tripResult.data || !tripResult.data._id) {
        showAlert({
          title: 'No Active Trip',
          message:
            'There is no active trip for this batch. Please ask the driver to start a trip first.',
          type: 'warning',
        });
        setLoading(false);
        return;
      }

      const tripId = tripResult.data._id;
      console.log('✅ Got trip ID:', tripId);

      // Step 2: Download trip manifest
      setLoadingMessage('Downloading manifest...');
      console.log('📥 Downloading trip manifest for Trip ID:', tripId);
      const manifestResult = await api.downloadTripPack(tripId);

      if ('notModified' in manifestResult) {
        showAlert({
          title: 'Info',
          message: 'Trip manifest is up to date',
          type: 'info',
        });
        setLoading(false);
        return;
      }

      if (!manifestResult.success) {
        showAlert({
          title: 'Error',
          message: manifestResult.message,
          type: 'error',
        });
        setLoading(false);
        return;
      }

      console.log('✅ Trip manifest downloaded:', manifestResult.data);

      // Save to SQLite
      setLoadingMessage('Saving manifest...');
      await saveTripPack(
        manifestResult.data.trip.tripId,
        manifestResult.data.manifestVersion,
        manifestResult.data.trip,
        manifestResult.data.manifest,
      );

      // Update store
      setCurrentTrip(manifestResult.data);

      // Start background sync with current trip
      backgroundSync.enable();

      showAlert({
        title: 'Success',
        message: `Trip downloaded successfully!\n${manifestResult.data.manifest.length} passengers in manifest\n\nManifest auto-refreshes every 30 seconds`,
        type: 'success',
        buttons: [
          {
            text: 'Start Scanning',
            onPress: () => navigation.navigate('ScanPassenger'),
          },
        ],
      });
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to download trip',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRefreshManifest = async () => {
    if (!currentTrip) {
      showAlert({
        title: 'No Active Trip',
        message: 'Please download a trip first',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    setLoadingMessage('Refreshing manifest...');

    try {
      const manifestResult = await api.downloadTripPack(
        currentTrip.trip.tripId,
        currentTrip.manifestVersion,
      );

      if ('notModified' in manifestResult) {
        showAlert({
          title: 'Up to Date',
          message: 'Manifest is already up to date',
          type: 'info',
        });
        setLoading(false);
        return;
      }

      if (!manifestResult.success) {
        showAlert({
          title: 'Error',
          message: manifestResult.message,
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // Update manifest with differential changes
      const changes = await updateManifestDiff(
        manifestResult.data.trip.tripId,
        manifestResult.data.manifestVersion,
        manifestResult.data.manifest,
      );

      setCurrentTrip(manifestResult.data);

      showAlert({
        title: 'Manifest Refreshed',
        message: `Updated: ${changes.updated}\nAdded: ${changes.added}\nRemoved: ${changes.removed}\n\nTotal passengers: ${manifestResult.data.manifest.length}`,
        type: 'success',
      });
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to refresh manifest',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Loader visible={loading} text={loadingMessage || 'Processing...'} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Management</Text>
        {currentTrip && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshManifest}
            disabled={loading}
          >
            <Feather name="refresh-cw" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {!currentTrip && <View style={styles.placeholder} />}
      </View>

      <View style={styles.content}>
        {/* Current Trip Status */}
        {currentTrip && (
          <View style={styles.activeTripCard}>
            <View style={styles.activeTripHeader}>
              <Feather name="check-circle" size={24} color={Colors.success} />
              <Text style={styles.activeTripTitle}>Active Trip</Text>
              <View style={styles.autoRefreshBadge}>
                <Feather name="zap" size={12} color={Colors.info} />
                <Text style={styles.autoRefreshText}>Auto: 30s</Text>
              </View>
            </View>
            <View style={styles.activeTripInfo}>
              <View style={styles.tripInfoRow}>
                <Text style={styles.tripInfoLabel}>Trip ID</Text>
                <Text style={styles.tripInfoValue} numberOfLines={1}>
                  {currentTrip.trip.tripId.substring(0, 12)}...
                </Text>
              </View>
              <View style={styles.tripInfoRow}>
                <Text style={styles.tripInfoLabel}>Route</Text>
                <Text style={styles.tripInfoValue}>
                  {currentTrip.trip.routeId}
                </Text>
              </View>
              <View style={styles.tripInfoRow}>
                <Text style={styles.tripInfoLabel}>Passengers</Text>
                <Text style={styles.tripInfoValue}>
                  {currentTrip.manifest.length}
                </Text>
              </View>
            </View>
            <Button
              title="Continue Scanning"
              onPress={() => navigation.navigate('ScanPassenger')}
              icon={
                <Feather name="camera" size={20} color={Colors.textPrimary} />
              }
            />
          </View>
        )}

        {/* Download New Trip */}
        {!currentTrip && (
          <>
            <View style={styles.iconContainer}>
              <Feather name="map-pin" size={48} color={Colors.primary} />
            </View>

            <Text style={styles.title}>Download Trip Manifest</Text>
            <Text style={styles.subtitle}>
              Download the passenger manifest for your assigned batch. Manifest
              auto-refreshes every 30 seconds to capture payment updates.
            </Text>

            <View style={styles.batchCard}>
              <View style={styles.batchHeader}>
                <Feather name="package" size={24} color={Colors.primary} />
                <Text style={styles.batchTitle}>Assigned Batch</Text>
              </View>

              {bootstrapData?.device.assignedBatchId ? (
                <View style={styles.batchIdContainer}>
                  <Text style={styles.batchIdLabel}>Batch ID</Text>
                  <Text style={styles.batchId}>
                    {bootstrapData.device.assignedBatchId}
                  </Text>
                  <View style={styles.assignedBadge}>
                    <Feather
                      name="check-circle"
                      size={14}
                      color={Colors.success}
                    />
                    <Text style={styles.assignedText}>Active</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noBatchContainer}>
                  <Feather
                    name="alert-circle"
                    size={20}
                    color={Colors.warning}
                  />
                  <Text style={styles.noBatchText}>
                    No batch assigned to this device
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.infoCard}>
              <Feather name="info" size={20} color={Colors.info} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Auto-Refresh Feature:</Text>
                <Text style={styles.infoDescription}>
                  • Manifest updates every 30s automatically{'\n'}• Captures
                  payment status changes{'\n'}• Works in background while
                  scanning{'\n'}• Manual refresh available anytime
                </Text>
              </View>
            </View>

            <Button
              title="Download Manifest"
              onPress={handleDownloadTrip}
              loading={loading}
              disabled={!bootstrapData?.device.assignedBatchId || loading}
              icon={
                <Feather name="download" size={20} color={Colors.textPrimary} />
              }
            />
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  activeTripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  activeTripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  autoRefreshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.info}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoRefreshText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.info,
  },
  activeTripInfo: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  tripInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tripInfoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tripInfoValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  batchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  batchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  batchIdContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  batchIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  batchId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  assignedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.success,
    textTransform: 'uppercase',
  },
  noBatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${Colors.warning}10`,
    padding: 16,
    borderRadius: 12,
  },
  noBatchText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${Colors.info}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
