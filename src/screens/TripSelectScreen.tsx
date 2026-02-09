import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather';
import { Colors } from '../utils/colors';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { ValidatorApi } from '../api/validatorApi';
import { saveTripPack } from '../services/sqliteService';
import { useTripStore } from '../store/tripStore';
import { useAlert } from '../contexts/AlertContext';
import { useDeviceStore } from '../store/deviceStore';

interface TripSelectScreenProps {
  navigation: any;
}

export const TripSelectScreen: React.FC<TripSelectScreenProps> = ({
  navigation,
}) => {
  const [loading, setLoading] = useState(false);
  const setCurrentTrip = useTripStore((state: any) => state.setCurrentTrip);
  const bootstrapData = useDeviceStore(state => state.bootstrapData);
  const api = new ValidatorApi('https://trofice.com/api/validator');
  const { showAlert } = useAlert();

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

    try {
      // Step 1: Get current trip ID for the batch
      console.log('📥 Fetching current trip for batch:', assignedBatchId);
      const tripResult = await api.getCurrentTripByBatchId(assignedBatchId);
      console.log('-----------:', tripResult);

      if (!tripResult.success) {
        showAlert({
          title: 'Error',
          message: tripResult.message,
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // Check if data is null (no active trip)
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

      const tripId = tripResult.data._id; // Use _id instead of tripId
      console.log('✅ Got trip ID:', tripId);

      // Step 2: Download trip manifest
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
      await saveTripPack(
        manifestResult.data.trip.tripId,
        manifestResult.data.manifestVersion,
        manifestResult.data.trip,
        manifestResult.data.manifest,
      );

      // ✅ DEBUG: Verify what was saved
      console.log('🔍 Verifying saved data...');
      const {
        debugDatabaseContents,
        getAllManifestForTrip,
      } = require('../services/sqliteService');
      await debugDatabaseContents();

      const savedManifest = await getAllManifestForTrip(
        manifestResult.data.trip.tripId,
      );
      console.log('✅ Verified manifest entries:', savedManifest?.length);
      if (savedManifest && savedManifest.length > 0) {
        console.log('First entry hash:', savedManifest[0].uniqueCodeHash);
      }

      // Update store
      setCurrentTrip(manifestResult.data);

      showAlert({
        title: 'Success',
        message: `Trip downloaded successfully!\n${manifestResult.data.manifest.length} passengers in manifest`,
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
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader visible={loading} text="Downloading trip manifest..." />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Trip</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="map-pin" size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Download Trip Manifest</Text>
        <Text style={styles.subtitle}>
          Download the passenger manifest for your assigned batch to begin
          validation
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
                <Feather name="check-circle" size={14} color={Colors.success} />
                <Text style={styles.assignedText}>Active</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noBatchContainer}>
              <Feather name="alert-circle" size={20} color={Colors.warning} />
              <Text style={styles.noBatchText}>
                No batch assigned to this device
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={Colors.info} />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>How it works:</Text>
            <Text style={styles.infoDescription}>
              The manifest contains all approved passengers for this trip. Once
              downloaded, you can scan passengers offline and sync later.
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
      </View>
    </SafeAreaView>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
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
