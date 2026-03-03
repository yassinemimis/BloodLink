import * as Location from 'expo-location';

export const locationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  },

  async getAddress(latitude: number, longitude: number): Promise<string> {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        return [address.street, address.city, address.region]
          .filter(Boolean)
          .join(', ');
      }
      return '';
    } catch {
      return '';
    }
  },
};