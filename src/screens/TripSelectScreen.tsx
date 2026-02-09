import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {Feather} from '@react-native-vector-icons/feather';
import {Colors} from '../utils/colors';
import {Button} from '../components/common/Button';
import {Loader} from '../components/common/Loader';
import {ValidatorApi} from '../api/validatorApi';
import {saveTripPack} from '../services/sqliteService';
import {useTripStore} from '../store/tripStore';

interface TripSelectScreenProps {
  navigation: any;
}

export const TripSelectScreen: React.FC<TripSelectScreenProps> = ({
  navigation,
}) => {
  const [tripId, setTripId] = useState('');
  const [loading, setLoading] = useState(false);
  const setCurrentTrip = useTripStore((state:any) => state.setCurrentTrip);
  const api = new ValidatorApi('https://api.trofice.com');

  const handleDownloadTrip = async () => {
    if (!tripId.trim()) {
      Alert.alert('Error', 'Please enter a trip ID');
      return;
    }

    setLoading(true);

    try {
      const result = await api.downloadTripPack(tripId.trim());

      if ('notModified' in result) {
        Alert.alert('Info', 'Trip manifest is up to date');
        setLoading(false);
        return;
      }

      if (!result.success) {
        Alert.alert('Error', result.message);
        setLoading(false);
        return;
      }

      // Save to SQLite
      await saveTripPack(
        result.data.trip.tripId,
        result.data.manifestVersion,
        result.data.trip,
        result.data.manifest,
      );

      // Update store
      setCurrentTrip(result.data);

      Alert.alert(
        'Success',
        `Trip downloaded successfully!\n${result.data.manifest.length} passengers in manifest`,
        [
          {
            text: 'Start Scanning',
            onPress: () => navigation.navigate('ScanPassenger'),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to download trip');
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
          onPress={() => navigation.goBack()}>
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
          Enter the trip ID to download the passenger manifest for validation
        </Text>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Trip ID</Text>
          <View style={styles.inputContainer}>
            <Feather
              name="hash"
              size={20}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter trip ID"
              placeholderTextColor={Colors.textTertiary}
              value={tripId}
              onChangeText={setTripId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
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
          icon={<Feather name="download" size={20} color={Colors.textPrimary} />}
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
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
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