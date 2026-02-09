import React, {useEffect, useState} from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {AppNavigator} from './src/navigation/AppNavigator';
import {Loader} from './src/components/common/Loader';
import {initDatabase} from './src/services/sqliteService';
import {getProvisioning} from './src/services/deviceStorage';
import {Colors} from './src/utils/colors';

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string>('Provisioning');

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      // Initialize database
      await initDatabase();

      // Check if device is provisioned
      const credentials = await getProvisioning();
      if (credentials) {
        setInitialRoute('Dashboard');
      }
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setInitializing(false);
    }
  };

  if (initializing) {
    return <Loader visible={true} text="Initializing..." />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.background}
        />
        <AppNavigator />
        <Toast />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default App;