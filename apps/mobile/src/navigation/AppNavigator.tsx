import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import RequestDetailScreen from '../screens/requests/RequestDetailScreen';
import NewRequestScreen from '../screens/requests/NewRequestScreen';
import DonorDetailScreen from '../screens/search/DonorDetailScreen';

export type RootStackParamList = {
  Main: undefined;
  RequestDetail: { requestId: string };
  NewRequest: undefined;
  DonorDetail: { donorId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // أو شاشة التحميل
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#DC2626' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RequestDetail"
            component={RequestDetailScreen}
            options={{ title: 'Détails de la demande' }}
          />
          <Stack.Screen
            name="NewRequest"
            component={NewRequestScreen}
            options={{ title: 'Nouvelle demande' }}
          />
          <Stack.Screen
            name="DonorDetail"
            component={DonorDetailScreen}
            options={{ title: 'Profil du donneur' }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}