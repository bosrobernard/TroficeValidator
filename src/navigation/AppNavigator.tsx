import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ProvisioningScreen} from '../screens/ProvisioningScreen';
import {DashboardScreen} from '../screens/DashboardScreen';
import {TripSelectScreen} from '../screens/TripSelectScreen';
import {ScanPassengerScreen} from '../screens/ScanPassengerScreen';
import {SyncScreen} from '../screens/SyncScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Provisioning" component={ProvisioningScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="TripSelect" component={TripSelectScreen} />
        <Stack.Screen name="ScanPassenger" component={ScanPassengerScreen} />
        <Stack.Screen name="Sync" component={SyncScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};