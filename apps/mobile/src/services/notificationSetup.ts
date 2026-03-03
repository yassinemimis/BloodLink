import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications(): Promise<string | null> {
  // Demander la permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ Permission notifications refusée');
    return null;
  }

  // Obtenir le token push (pour Expo)
  const tokenData = await Notifications.getExpoPushTokenAsync();
  console.log('📱 Push token:', tokenData.data);

  // Configuration Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Urgences',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  return tokenData.data;
}