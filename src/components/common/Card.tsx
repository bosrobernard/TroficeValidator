import React from 'react';
import {View, Text, StyleSheet, ViewStyle, TouchableOpacity, StyleProp} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Feather } from '@react-native-vector-icons/feather';
import type { FeatherIconName } from '@react-native-vector-icons/feather';
import {Colors} from '../../utils/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'gradient' | 'outlined';
  padding?: number;
  onPress?: () => void;
}


export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 20,
  onPress,
}) => {
  const content = (
    <View style={[styles.container, {padding}, style]}>
      {children}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        activeOpacity={onPress ? 0.8 : 1}
        onPress={onPress}
        disabled={!onPress}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.gradient, style]}>
          {children}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outlined') {
    return (
      <TouchableOpacity
        activeOpacity={onPress ? 0.8 : 1}
        onPress={onPress}
        disabled={!onPress}>
        <View style={[styles.container, styles.outlined, {padding}, style]}>
          {children}
        </View>
      </TouchableOpacity>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.container, {padding}, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return content;
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: FeatherIconName;
  iconColor?: string;
  rightElement?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconColor = Colors.primary,
  rightElement,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {icon && (
          <View style={[styles.iconBadge, {backgroundColor: `${iconColor}20`}]}>
            <Feather name={icon} size={24} color={iconColor} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement}
    </View>
  );
};

interface CardSectionProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}

export const CardSection: React.FC<CardSectionProps> = ({
  children,
  title,
  style,
}) => {
  return (
    <View style={[styles.section, style]}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
};

interface CardRowProps {
  label: string;
  value: string | number;
  icon?: FeatherIconName;
  valueColor?: string;
}

export const CardRow: React.FC<CardRowProps> = ({
  label,
  value,
  icon,
  valueColor = Colors.textPrimary,
}) => {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon && (
          <Feather
            name={icon}
            size={16}
            color={Colors.textSecondary}
            style={styles.rowIcon}
          />
        )}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, {color: valueColor}]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gradient: {
    borderRadius: 16,
    padding: 20,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});