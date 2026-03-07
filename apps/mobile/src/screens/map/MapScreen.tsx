import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import MapView, {
  Marker,
  Callout,
  Circle,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import api from '../../services/api';
import { locationService } from '../../services/locationService';
import { Center } from '../../types';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [location, centersRes] = await Promise.all([
        locationService.getCurrentLocation(),
        api.get('/centers', { params: { limit: 100 } }),
      ]);

      if (location) {
        setUserLocation(location);
      }
      setCenters(centersRes.data.data || []);
    } catch (error) {
      console.error('Erreur chargement carte:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de la carte');
    } finally {
      setLoading(false);
    }
  };

  const centerMapOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const openNavigation = (center: Center) => {
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${center.latitude},${center.longitude}(${center.name})`
        : `geo:0,0?q=${center.latitude},${center.longitude}(${center.name})`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}`,
      );
    });
  };

  const callCenter = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      }
    : {
        // الجزائر العاصمة كـ fallback
        latitude: 36.752887,
        longitude: 3.042048,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };

  return (
    <View style={styles.container}>
      {/* ✅ إصلاح: PROVIDER_GOOGLE على Android، DEFAULT على iOS */}
      <MapView
        ref={mapRef}
        style={styles.map}  // ✅ إصلاح: flex: 1 بدل height كامل الشاشة
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
      >
        {/* دائرة حول موقع المستخدم */}
        {userLocation && (
          <Circle
            center={userLocation}
            radius={25000}
            strokeColor="rgba(220, 38, 38, 0.3)"
            fillColor="rgba(220, 38, 38, 0.05)"
            strokeWidth={2}
          />
        )}

        {/* Markers المراكز */}
        {centers.map((center) => (
          <Marker
            key={center.id}
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            pinColor="#DC2626"
            onPress={() => setSelectedCenter(center)}
          >
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{center.name}</Text>
                <Text style={styles.calloutAddress}>📍 {center.address}</Text>
                {center.openingHours && (
                  <Text style={styles.calloutHours}>🕐 {center.openingHours}</Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* زر موقعي */}
      <TouchableOpacity style={styles.myLocationButton} onPress={centerMapOnUser}>
        <Text style={styles.myLocationEmoji}>📍</Text>
      </TouchableOpacity>

      {/* عدد المراكز */}
      <View style={styles.centerCountBadge}>
        <Text style={styles.centerCountText}>🏥 {centers.length} centres</Text>
      </View>

      {/* Bottom Sheet لتفاصيل المركز */}
      {selectedCenter && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedCenter(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.sheetTitle}>{selectedCenter.name}</Text>
          <Text style={styles.sheetAddress}>
            📍 {selectedCenter.address}, {selectedCenter.city}
          </Text>

          {selectedCenter.openingHours && (
            <Text style={styles.sheetInfo}>🕐 {selectedCenter.openingHours}</Text>
          )}
          {selectedCenter.phone && (
            <Text style={styles.sheetInfo}>📞 {selectedCenter.phone}</Text>
          )}

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={() => openNavigation(selectedCenter)}
            >
              <Text style={styles.navigateButtonText}>🗺️ Itinéraire</Text>
            </TouchableOpacity>

            {selectedCenter.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => callCenter(selectedCenter.phone!)}
              >
                <Text style={styles.callButtonText}>📞 Appeler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,  // ✅ flex:1 بدل تحديد الحجم يدوياً
  },
  // ✅ الإصلاح الرئيسي: StyleSheet.absoluteFillObject بدل width/height ثابت
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  myLocationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  myLocationEmoji: { fontSize: 22 },
  centerCountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  centerCountText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  callout: { width: 220, padding: 4 },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  calloutAddress: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  calloutHours: { fontSize: 11, color: '#6B7280' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    paddingRight: 32,
  },
  sheetAddress: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  sheetInfo: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  navigateButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navigateButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  callButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  callButtonText: { color: '#374151', fontWeight: '700', fontSize: 14 },
});