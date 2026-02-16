import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../utils/colors';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { ValidatorApi } from '../api/validatorApi';
import {
  getPendingEvents,
  markEventsSynced,
  getQueueCount,
} from '../services/offlineQueue';
import { useTripStore } from '../store/tripStore';
import { format } from 'date-fns';
import { useAlert } from '../contexts/AlertContext';
import { useDeviceStore } from '../store/deviceStore';
import BackgroundSyncService from '../services/backgroundSyncService';

interface SyncScreenProps {
  navigation: any;
}

  const api = new ValidatorApi('https://trofice.com/api/validator');


export const SyncScreen: React.FC<SyncScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [nextAutoSync, setNextAutoSync] = useState<Date | null>(null);

  const currentTrip = useTripStore((state: any) => state.currentTrip);
  const bootstrapData = useDeviceStore(state => state.bootstrapData);
  const recommendedInterval =
    bootstrapData?.sync?.recommendedIntervalSeconds || 60;
  const { showAlert } = useAlert();

  const backgroundSync = BackgroundSyncService.getInstance();
  const updateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadPendingCount();

    // Configure background sync
    backgroundSync.setInterval(recommendedInterval);
    if (isAutoSyncEnabled) {
      backgroundSync.enable();
    }

    // Listen for sync completion to update UI
    const unsubscribe = backgroundSync.addListener(() => {
      loadPendingCount();
      setLastSync(new Date());
    });

    // Update next sync countdown every second
    startCountdownTimer();

    return () => {
      unsubscribe();
      stopCountdownTimer();
    };
  }, []);

  useEffect(() => {
    if (isAutoSyncEnabled) {
      backgroundSync.enable();
    } else {
      backgroundSync.disable();
    }
  }, [isAutoSyncEnabled]);

  useEffect(() => {
    backgroundSync.setInterval(recommendedInterval);
  }, [recommendedInterval]);

  const startCountdownTimer = () => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    updateTimerRef.current = setInterval(() => {
      // Force re-render to update countdown
      setNextAutoSync(new Date(Date.now() + recommendedInterval * 1000));
    }, 1000) as unknown as number;
  };

  const stopCountdownTimer = () => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  };

  const loadPendingCount = async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  };

  const handleManualSync = async () => {
    if (!currentTrip) {
      showAlert({
        title: 'Error',
        message: 'No active trip selected',
        type: 'error',
      });
      return;
    }

    const count = await getQueueCount();
    if (count === 0) {
      showAlert({
        title: 'Info',
        message: 'No pending events to sync',
        type: 'info',
      });
      return;
    }

    setLoading(true);
    setSyncResults(null);

    try {
      const pending = await getPendingEvents();
      const result = await api.syncEvents({
        tripId: currentTrip.trip.tripId,
        manifestVersion: currentTrip.manifestVersion,
        events: pending,
      });

      if (!result.success) {
        showAlert({
          title: 'Sync Failed',
          message: result.message,
          type: 'error',
        });
        return;
      }

      const syncedIds = result.data.results
        .filter(r => r.accepted || r.duplicate)
        .map(r => r.eventId!)
        .filter(Boolean);

      await markEventsSynced(syncedIds);
      await loadPendingCount();
      setLastSync(new Date());
      setSyncResults(result.data);

      const rejected = result.data.results.filter(
        r => !r.accepted && !r.duplicate,
      );

      if (rejected.length === 0) {
        showAlert({
          title: 'Success',
          message: `Successfully synced ${result.data.processed} events!`,
          type: 'success',
        });
      } else {
        showAlert({
          title: 'Partially Synced',
          message: `${syncedIds.length} events synced, ${rejected.length} rejected. Check results for details.`,
          type: 'warning',
        });
      }
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to sync events',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoSync = () => {
    setIsAutoSyncEnabled(!isAutoSyncEnabled);
    if (!isAutoSyncEnabled) {
      showAlert({
        title: 'Auto-Sync Enabled',
        message: `Events will sync automatically every ${recommendedInterval} seconds in the background`,
        type: 'success',
      });
    } else {
      showAlert({
        title: 'Auto-Sync Disabled',
        message: 'You can still sync manually',
        type: 'info',
      });
    }
  };

  const truncateString = (str: string, maxLength: number = 20): string => {
    if (!str) return 'N/A';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };

  const getNextSyncCountdown = (): string => {
    if (!isAutoSyncEnabled) return '';
    const seconds = recommendedInterval;
    return `in ~${seconds}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} text="Syncing events..." />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Data</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadPendingCount}
        >
          <Feather name="refresh-cw" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.statusCard}
        >
          <View style={styles.statusContent}>
            <View style={styles.iconBadge}>
              <Feather name="database" size={32} color={Colors.textPrimary} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.pendingCount}>{pendingCount}</Text>
              <Text style={styles.pendingLabel}>Pending Events</Text>
            </View>
          </View>
          {lastSync && (
            <Text style={styles.lastSyncText}>
              Last sync: {format(lastSync, 'MMM dd, yyyy HH:mm:ss')}
            </Text>
          )}
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather
              name={isAutoSyncEnabled ? 'zap' : 'zap-off'}
              size={24}
              color={isAutoSyncEnabled ? Colors.success : Colors.textSecondary}
            />
            <Text style={styles.cardTitle}>Background Auto-Sync</Text>
          </View>
          <View style={styles.autoSyncContent}>
            <View style={styles.autoSyncInfo}>
              <Text style={styles.autoSyncLabel}>
                {isAutoSyncEnabled ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={styles.autoSyncDescription}>
                {isAutoSyncEnabled
                  ? `Syncing every ${recommendedInterval}s (even when app is in background)`
                  : 'Manual sync only'}
              </Text>
              {isAutoSyncEnabled && (
                <Text style={styles.nextSyncText}>
                  Next sync {getNextSyncCountdown()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                isAutoSyncEnabled && styles.toggleButtonActive,
              ]}
              onPress={toggleAutoSync}
            >
              <Feather
                name={isAutoSyncEnabled ? 'toggle-right' : 'toggle-left'}
                size={32}
                color={
                  isAutoSyncEnabled ? Colors.success : Colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {currentTrip && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="map" size={24} color={Colors.primary} />
              <Text style={styles.cardTitle}>Active Trip</Text>
            </View>
            <View style={styles.tripInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trip ID</Text>
                <Text style={styles.infoValue}>
                  {truncateString(currentTrip.trip.tripId, 15)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Route</Text>
                <Text style={styles.infoValue}>
                  {truncateString(currentTrip.trip.routeId, 15)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Manifest Version</Text>
                <TouchableOpacity
                  onPress={() => {
                    showAlert({
                      title: 'Manifest Version',
                      message: currentTrip.manifestVersion,
                      type: 'info',
                    });
                  }}
                >
                  <View style={styles.versionContainer}>
                    <Text style={styles.infoValue}>
                      {truncateString(currentTrip.manifestVersion, 12)}
                    </Text>
                    <Feather
                      name="info"
                      size={14}
                      color={Colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {syncResults && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="check-circle" size={24} color={Colors.success} />
              <Text style={styles.cardTitle}>Sync Results</Text>
            </View>

            <View style={styles.resultsGrid}>
              <View style={styles.resultStat}>
                <Text style={styles.resultNumber}>{syncResults.processed}</Text>
                <Text style={styles.resultLabel}>Processed</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={[styles.resultNumber, { color: Colors.success }]}>
                  {syncResults.results.filter((r: any) => r.accepted).length}
                </Text>
                <Text style={styles.resultLabel}>Accepted</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={[styles.resultNumber, { color: Colors.warning }]}>
                  {syncResults.results.filter((r: any) => r.duplicate).length}
                </Text>
                <Text style={styles.resultLabel}>Duplicates</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={[styles.resultNumber, { color: Colors.error }]}>
                  {
                    syncResults.results.filter(
                      (r: any) => !r.accepted && !r.duplicate,
                    ).length
                  }
                </Text>
                <Text style={styles.resultLabel}>Rejected</Text>
              </View>
            </View>

            <View style={styles.resultsList}>
              {syncResults.results.map((result: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.resultItem,
                    result.accepted && styles.resultAccepted,
                    result.duplicate && styles.resultDuplicate,
                    !result.accepted &&
                      !result.duplicate &&
                      styles.resultRejected,
                  ]}
                >
                  <Feather
                    name={
                      result.accepted
                        ? 'check-circle'
                        : result.duplicate
                        ? 'alert-circle'
                        : 'x-circle'
                    }
                    size={20}
                    color={
                      result.accepted
                        ? Colors.success
                        : result.duplicate
                        ? Colors.warning
                        : Colors.error
                    }
                  />
                  <View style={styles.resultItemContent}>
                    <Text style={styles.resultItemMessage}>
                      {result.message}
                    </Text>
                    {result.eventId && (
                      <Text style={styles.resultItemId}>
                        Event: {result.eventId.substring(0, 8)}...
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.instructionsCard}>
          <Feather name="info" size={20} color={Colors.info} />
          <View style={styles.instructionsContent}>
            <Text style={styles.instructionsTitle}>About Background Sync</Text>
            <Text style={styles.instructionsText}>
              • Events sync automatically in the background{'\n'}•
              Auto-sync interval: {recommendedInterval} seconds{'\n'}•
              Works even when the app is in the background{'\n'}•
              Accepted events are permanently recorded{'\n'}• Duplicates are
              ignored automatically
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={
            pendingCount > 0
              ? `Sync ${pendingCount} Events Now`
              : 'No Events to Sync'
          }
          onPress={handleManualSync}
          disabled={pendingCount === 0 || !currentTrip}
          icon={
            <Feather name="upload-cloud" size={20} color={Colors.textPrimary} />
          }
        />
      </View>
    </SafeAreaView>
  );
};

// ... (styles remain the same)
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
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  pendingCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  pendingLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    opacity: 0.9,
    marginTop: 4,
  },
  lastSyncText: {
    fontSize: 12,
    color: Colors.textPrimary,
    opacity: 0.7,
    marginTop: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  autoSyncContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoSyncInfo: {
    flex: 1,
  },
  autoSyncLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  autoSyncDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nextSyncText: {
    fontSize: 12,
    color: Colors.info,
    marginTop: 4,
    fontStyle: 'italic',
  },
  toggleButton: {
    padding: 8,
  },
  toggleButtonActive: {},
  tripInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  resultStat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resultNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  resultLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  resultsList: {
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  resultAccepted: {
    backgroundColor: `${Colors.success}10`,
  },
  resultDuplicate: {
    backgroundColor: `${Colors.warning}10`,
  },
  resultRejected: {
    backgroundColor: `${Colors.error}10`,
  },
  resultItemContent: {
    flex: 1,
  },
  resultItemMessage: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  resultItemId: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: `${Colors.info}10`,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});