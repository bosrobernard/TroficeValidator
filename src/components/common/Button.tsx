import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../../utils/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  icon,
}) => {
  const isDisabled = disabled || loading;

  const renderContent = () => (
    <TouchableOpacity
      style={[
        styles.container,
        styles[`${size}Container`],
        variant !== 'primary' && styles[`${variant}Container`],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? Colors.primary : Colors.textPrimary}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              styles[`${size}Text`],
              variant !== 'primary' && styles[`${variant}Text`],
              textStyle,
            ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  if (variant === 'primary' && !isDisabled) {
    return (
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.gradient, style]}>
        {renderContent()}
      </LinearGradient>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  mdContainer: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  smContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  lgContainer: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  secondaryContainer: {
    backgroundColor: Colors.surface,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dangerContainer: {
    backgroundColor: Colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  mdText: {
    fontSize: 16,
  },
  smText: {
    fontSize: 14,
  },
  lgText: {
    fontSize: 18,
  },
  secondaryText: {
    color: Colors.textPrimary,
  },
  outlineText: {
    color: Colors.primary,
  },
  dangerText: {
    color: Colors.textPrimary,
  },
});