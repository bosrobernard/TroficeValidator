import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {Feather} from '@react-native-vector-icons/feather';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../utils/colors';
import {Button} from '../components/common/Button';
import {Loader} from '../components/common/Loader';
import {ValidatorApi} from '../api/validatorApi';
import {getProvisioning, clearProvisioning} from '../services/deviceStorage';
import {getQueueCount} from '../services/offlineQueue';
import {BootstrapResponse} from '../types';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<BootstrapResponse | null>(null);
  const [pendingEvents, setPendingEvents] = useState(0);
  const api = new ValidatorApi('https://api.trofice.com');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await api.bootstrap();
      console.log('results---',result)
      if (result.success) {
        setDeviceInfo(result.data);
      } else {
        Alert.alert('Error', result.message);
      }

      const count = await getQueueCount();
      setPendingEvents(count);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to unprovision this device?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearProvisioning();
            navigation.replace('Provisioning');
          },
        },
      ],
    );
  };

  if (loading) {
    return <Loader visible={true} text="Loading dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }>
        {/* Header */}
        <LinearGradient
          colors={[`${Colors.primary}20`, 'transparent']}
          style={styles.headerGradient}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Trofice Validator</Text>
              <Text style={styles.deviceId}>
                {deviceInfo?.device.deviceId || 'N/A'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}>
              <Feather name="log-out" size={24} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Device Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Feather name="shield" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Device Status</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                deviceInfo?.device.status === 'ACTIVE'
                  ? styles.activeBadge
                  : styles.revokedBadge,
              ]}>
              <View
                style={[
                  styles.statusDot,
                  deviceInfo?.device.status === 'ACTIVE'
                    ? styles.activeDot
                    : styles.revokedDot,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  deviceInfo?.device.status === 'ACTIVE'
                    ? styles.activeText
                    : styles.revokedText,
                ]}>
                {deviceInfo?.device.status || 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Type</Text>
            <Text style={styles.statusValue}>
              {deviceInfo?.device.deviceType || 'N/A'}
            </Text>
          </View>

          {deviceInfo?.device.name && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Name</Text>
              <Text style={styles.statusValue}>{deviceInfo.device.name}</Text>
            </View>
          )}
        </View>

        {/* Sync Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Feather name="refresh-cw" size={24} color={Colors.info} />
            </View>
            <Text style={styles.cardTitle}>Sync Status</Text>
          </View>

          <View style={styles.syncInfo}>
            <View style={styles.syncStat}>
              <Text style={styles.syncNumber}>{pendingEvents}</Text>
              <Text style={styles.syncLabel}>Pending Events</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.syncStat}>
              <Text style={styles.syncNumber}>
                {deviceInfo?.sync.recommendedIntervalSeconds || 60}s
              </Text>
              <Text style={styles.syncLabel}>Sync Interval</Text>
            </View>
          </View>

          {pendingEvents > 0 && (
            <Button
              title="Sync Now"
              onPress={() => navigation.navigate('Sync')}
              variant="outline"
              size="sm"
              style={styles.syncButton}
              icon={<Feather name="upload-cloud" size={18} color={Colors.primary} />}
            />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TripSelect')}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.actionGradient}>
              <Feather name="map" size={32} color={Colors.textPrimary} />
              <Text style={styles.actionTitle}>Start Trip</Text>
              <Text style={styles.actionSubtitle}>
                Select and download trip manifest
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Sync')}>
            <View style={[styles.actionGradient, styles.secondaryAction]}>
              <Feather name="database" size={32} color={Colors.primary} />
              <Text style={styles.actionTitle}>Sync Data</Text>
              <Text style={styles.actionSubtitle}>
                Upload pending scans
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Server Time */}
        <Text style={styles.serverTime}>
          Server Time: {new Date(deviceInfo?.serverTime || '').toLocaleString()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  headerGradient: {
    borderRadius: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
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
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  activeBadge: {
    backgroundColor: `${Colors.success}20`,
  },
  revokedBadge: {
    backgroundColor: `${Colors.error}20`,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: Colors.success,
  },
  revokedDot: {
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  activeText: {
    color: Colors.success,
  },
  revokedText: {
    color: Colors.error,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  syncStat: {
    alignItems: 'center',
  },
  syncNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  syncLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  syncButton: {
    marginTop: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  secondaryAction: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  serverTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});