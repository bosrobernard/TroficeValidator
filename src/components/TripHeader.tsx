import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Feather} from '@react-native-vector-icons/feather';
import {Colors} from '../utils/colors';
import {format} from 'date-fns';

interface TripHeaderProps {
  tripId: string;
  route: string;
  from?: string;
  to?: string;
  departureTime?: string;
  fare?: number;
  currency?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  onBack?: () => void;
  onSync?: () => void;
  showSync?: boolean;
}

export const TripHeader: React.FC<TripHeaderProps> = ({
  tripId,
  route,
  from,
  to,
  departureTime,
  fare,
  currency = 'GHS',
  status = 'ACTIVE',
  onBack,
  onSync,
  showSync = false,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'ACTIVE':
        return Colors.success;
      case 'COMPLETED':
        return Colors.info;
      case 'CANCELLED':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[`${Colors.primary}20`, 'transparent']}
        style={styles.gradient}
      />

      {/* Navigation Row */}
      <View style={styles.navRow}>
        {onBack && (
          <TouchableOpacity style={styles.navButton} onPress={onBack}>
            <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Trip Details</Text>
        </View>
        {showSync && onSync ? (
          <TouchableOpacity style={styles.navButton} onPress={onSync}>
            <Feather name="refresh-cw" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navButton} />
        )}
      </View>

      {/* Trip Info Card */}
      <View style={styles.infoCard}>
        {/* Trip ID & Status */}
        <View style={styles.headerRow}>
          <View style={styles.tripIdContainer}>
            <Feather
              name="hash"
              size={16}
              color={Colors.textSecondary}
              style={styles.hashIcon}
            />
            <Text style={styles.tripId}>{tripId}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: `${getStatusColor()}20`},
            ]}>
            <View
              style={[styles.statusDot, {backgroundColor: getStatusColor()}]}
            />
            <Text style={[styles.statusText, {color: getStatusColor()}]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Route Display */}
        {from && to ? (
          <View style={styles.routeContainer}>
            <View style={styles.locationBox}>
              <Text style={styles.locationLabel}>From</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {from}
              </Text>
            </View>

            <View style={styles.routeArrow}>
              <View style={styles.arrowCircle}>
                <Feather name="arrow-right" size={20} color={Colors.textPrimary} />
              </View>
              <View style={styles.arrowLine} />
            </View>

            <View style={styles.locationBox}>
              <Text style={styles.locationLabel}>To</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {to}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.routeSimple}>{route}</Text>
        )}

        {/* Additional Info Row */}
        <View style={styles.detailsRow}>
          {departureTime && (
            <View style={styles.detailItem}>
              <Feather
                name="clock"
                size={16}
                color={Colors.textSecondary}
                style={styles.detailIcon}
              />
              <View>
                <Text style={styles.detailLabel}>Departure</Text>
                <Text style={styles.detailValue}>
                  {format(new Date(departureTime), 'MMM dd, HH:mm')}
                </Text>
              </View>
            </View>
          )}

          {fare && (
            <View style={styles.detailItem}>
              <Feather
                name="dollar-sign"
                size={16}
                color={Colors.textSecondary}
                style={styles.detailIcon}
              />
              <View>
                <Text style={styles.detailLabel}>Fare</Text>
                <Text style={styles.detailValue}>
                  {currency} {fare.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hashIcon: {
    marginRight: 4,
  },
  tripId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  locationBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  },
  locationLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  routeArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLine: {
    position: 'absolute',
    width: 100,
    height: 2,
    backgroundColor: Colors.border,
    zIndex: -1,
  },
  routeSimple: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailIcon: {
    marginRight: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});