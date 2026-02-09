import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../../utils/colors';

interface StatusBadgeProps {
  status: 'ACTIVE' | 'REVOKED' | 'VALID' | 'USED' | 'CANCELLED' | 'EXPIRED';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'ACTIVE':
      case 'VALID':
        return {
          backgroundColor: `${Colors.success}20`,
          borderColor: `${Colors.success}40`,
          textColor: Colors.success,
          dotColor: Colors.success,
        };
      case 'USED':
        return {
          backgroundColor: `${Colors.info}20`,
          borderColor: `${Colors.info}40`,
          textColor: Colors.info,
          dotColor: Colors.info,
        };
      case 'CANCELLED':
      case 'REVOKED':
        return {
          backgroundColor: `${Colors.error}20`,
          borderColor: `${Colors.error}40`,
          textColor: Colors.error,
          dotColor: Colors.error,
        };
      case 'EXPIRED':
        return {
          backgroundColor: `${Colors.textSecondary}20`,
          borderColor: `${Colors.textSecondary}40`,
          textColor: Colors.textSecondary,
          dotColor: Colors.textSecondary,
        };
      default:
        return {
          backgroundColor: `${Colors.textSecondary}20`,
          borderColor: `${Colors.textSecondary}40`,
          textColor: Colors.textSecondary,
          dotColor: Colors.textSecondary,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.container,
        styles[`${size}Container`],
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}>
      <View style={[styles.dot, {backgroundColor: config.dotColor}]} />
      <Text
        style={[
          styles.text,
          styles[`${size}Text`],
          {color: config.textColor},
        ]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    gap: 6,
  },
  smContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mdContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lgContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  smText: {
    fontSize: 10,
  },
  mdText: {
    fontSize: 12,
  },
  lgText: {
    fontSize: 14,
  },
});