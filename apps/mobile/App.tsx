import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { authService } from './src/services/authService';

export default function App() {
  const { setAuth, setLoading, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const profile = await authService.getProfile();
        setAuth(profile);
      } else {
        setLoading(false);
      }
    } catch (error) {
      await authService.logout();
      logout();
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#DC2626" />
      <AppNavigator />
      <Toast />
    </SafeAreaProvider>
  );
}