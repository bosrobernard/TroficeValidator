import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {Colors} from '../../utils/colors';

interface LoaderProps {
  visible: boolean;
  text?: string;
  fullscreen?: boolean;
  size?: 'small' | 'large';
}

export const Loader: React.FC<LoaderProps> = ({
  visible,
  text = 'Loading...',
  fullscreen = true,
  size = 'large',
}) => {
  if (!visible) return null;

  if (!fullscreen) {
    return (
      <View style={styles.inline}>
        <ActivityIndicator size={size} color={Colors.primary} />
        {text && <Text style={styles.text}>{text}</Text>}
      </View>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          reducedTransparencyFallbackColor={Colors.overlay}
        />
        <View style={styles.container}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size={size} color={Colors.primary} />
            {text && <Text style={styles.text}>{text}</Text>}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
});