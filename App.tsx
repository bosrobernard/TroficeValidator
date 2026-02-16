import React, {useEffect, useState} from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {AppNavigator} from './src/navigation/AppNavigator';
import {Loader} from './src/components/common/Loader';
import {AlertProvider} from './src/contexts/AlertContext'; // ✅ Import
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
      await initDatabase();
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
      <AlertProvider> {/* ✅ Wrap with AlertProvider */}
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar
            barStyle="light-content"
            backgroundColor={Colors.background}
          />
          <AppNavigator initialRoute={initialRoute} />
          <Toast />
        </SafeAreaView>
      </AlertProvider>
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


// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   Button,
//   ScrollView,
// } from 'react-native';

// const TEST_URL = 'https://jsonplaceholder.typicode.com/posts/1'; 
// const TEST_URL2 = 'https://google.com';

// const App = () => {
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState<string>('Not tested yet');
//   const [error, setError] = useState<string | null>(null);

//   const testNetwork = async () => {
//     setLoading(true);
//     setResult('Testing...');
//     setError(null);

//     try {
//       const response = await fetch(TEST_URL);
//       const data = await response.json();

//       setResult(JSON.stringify(data, null, 2));
//     } catch (err: any) {
//       console.log('Network Error:', err);
//       setError(err.message || 'Unknown error');
//       setResult('Failed');
//     } finally {
//       setLoading(false);
//     }
//   };

//     const testNetworktWO = async () => {
//     setLoading(true);
//     setResult('Testing...');
//     setError(null);

//     try {
//       const response = await fetch(TEST_URL2);
//       const data = await response.json();

//       setResult(JSON.stringify(data, null, 2));
//     } catch (err: any) {
//       console.log('Network Error:', err);
//       setError(err.message || 'Unknown error');
//       setResult('Failed');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     testNetwork();
//   }, []);

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>Network Test</Text>

//       {loading && <ActivityIndicator size="large" />}

//       <Button title="Test Network 1" onPress={testNetwork} />
//        <Button title="Test Network 2" onPress={testNetworktWO} />

//       <Text style={styles.label}>Result:</Text>
//       <Text style={styles.result}>{result}</Text>

//       {error && (
//         <>
//           <Text style={styles.errorTitle}>Error:</Text>
//           <Text style={styles.error}>{error}</Text>
//         </>
//       )}
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flexGrow: 1,
//     padding: 20,
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   label: {
//     marginTop: 20,
//     fontWeight: 'bold',
//   },
//   result: {
//     marginTop: 10,
//   },
//   errorTitle: {
//     marginTop: 20,
//     color: 'red',
//     fontWeight: 'bold',
//   },
//   error: {
//     color: 'red',
//   },
// });

// export default App;
