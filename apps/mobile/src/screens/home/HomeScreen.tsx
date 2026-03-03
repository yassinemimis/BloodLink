import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import { locationService } from '../../services/locationService';
import {
  BloodRequest,
  BLOOD_GROUP_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '../../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const { user, updateUser } = useAuthStore();
  const navigation = useNavigation<NavProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState<BloodRequest[]>([]);
  const [stats, setStats] = useState({ totalDonors: 0, pendingRequests: 0, totalDonations: 0 });

  useEffect(() => {
    loadData();
    updateLocation();
  }, []);

  const updateLocation = async () => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      try {
        await api.patch('/users/location', {
          latitude: location.latitude,
          longitude: location.longitude,
        });
        updateUser(location);
      } catch (e) {
        // silently fail
      }
    }
  };

  const loadData = async () => {
    try {
      const [requestsRes, statsRes] = await Promise.all([
        api.get('/blood-requests', { params: { limit: 5, status: 'PENDING' } }),
        api.get('/users/stats'),
      ]);
      setNearbyRequests(requestsRes.data.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSOS = () => {
    Alert.alert(
      '🚨 Urgence SOS',
      'Cela enverra une demande urgente à tous les donneurs compatibles à proximité. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer SOS',
          style: 'destructive',
          onPress: () => navigation.navigate('NewRequest'),
        },
      ],
    );
  };

  const handleToggleAvailability = async () => {
    try {
      const response = await api.patch('/users/toggle-availability');
      updateUser({ isAvailable: response.data.isAvailable });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer la disponibilité');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeText}>Bonjour, {user?.firstName} 👋</Text>
            <Text style={styles.welcomeSubtext}>
              {user?.isAvailable ? '🟢 Disponible pour donner' : '🔴 Indisponible'}
            </Text>
          </View>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodBadgeText}>
              {user?.bloodGroup ? BLOOD_GROUP_LABELS[user.bloodGroup] : '?'}
            </Text>
          </View>
        </View>

        {/* Availability Toggle */}
        <TouchableOpacity
          style={[
            styles.availabilityButton,
            user?.isAvailable ? styles.availableBtn : styles.unavailableBtn,
          ]}
          onPress={handleToggleAvailability}
        >
          <Text style={styles.availabilityText}>
            {user?.isAvailable ? '✅ Je suis disponible' : '⛔ Je suis indisponible'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>👥</Text>
          <Text style={styles.statNumber}>{stats.totalDonors}</Text>
          <Text style={styles.statLabel}>Donneurs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⏳</Text>
          <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>💉</Text>
          <Text style={styles.statNumber}>{stats.totalDonations}</Text>
          <Text style={styles.statLabel}>Dons</Text>
        </View>
      </View>

      {/* SOS Button */}
      <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
        <Text style={styles.sosEmoji}>🚨</Text>
        <View>
          <Text style={styles.sosTitle}>Bouton SOS</Text>
          <Text style={styles.sosSubtitle}>
            Envoyer une demande urgente
          </Text>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('NewRequest')}
        >
          <Text style={styles.actionEmoji}>➕</Text>
          <Text style={styles.actionText}>Nouvelle{'\n'}demande</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {/* Navigate to search */}}
        >
          <Text style={styles.actionEmoji}>🔍</Text>
          <Text style={styles.actionText}>Chercher{'\n'}donneur</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {/* Navigate to map */}}
        >
          <Text style={styles.actionEmoji}>🗺️</Text>
          <Text style={styles.actionText}>Centres{'\n'}proches</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {/* Navigate to history */}}
        >
          <Text style={styles.actionEmoji}>📋</Text>
          <Text style={styles.actionText}>Mon{'\n'}historique</Text>
        </TouchableOpacity>
      </View>

      {/* Nearby Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Demandes récentes</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>Voir tout →</Text>
        </TouchableOpacity>
      </View>

      {nearbyRequests.length > 0 ? (
        nearbyRequests.map((request) => (
          <TouchableOpacity
            key={request.id}
            style={styles.requestCard}
            onPress={() => navigation.navigate('RequestDetail', { requestId: request.id })}
          >
            <View style={styles.requestHeader}>
              <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLORS[request.urgencyLevel] }]} />
              <View style={styles.requestInfo}>
                <Text style={styles.requestHospital}>{request.hospital}</Text>
                <Text style={styles.requestMeta}>
                  {BLOOD_GROUP_LABELS[request.bloodGroup]} • {request.unitsNeeded} unités • {URGENCY_LABELS[request.urgencyLevel]}
                </Text>
              </View>
              <View style={styles.bloodGroupBadge}>
                <Text style={styles.bloodGroupText}>
                  {BLOOD_GROUP_LABELS[request.bloodGroup]}
                </Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(request.unitsFulfilled / request.unitsNeeded) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {request.unitsFulfilled}/{request.unitsNeeded}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyText}>Aucune demande en attente</Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  welcomeCard: {
    margin: 16, backgroundColor: '#DC2626', borderRadius: 20,
    padding: 20, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  welcomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  welcomeSubtext: { fontSize: 13, color: '#FEE2E2', marginTop: 4 },
  bloodBadge: {
    width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bloodBadgeText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  availabilityButton: {
    marginTop: 16, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  availableBtn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  unavailableBtn: { backgroundColor: 'rgba(0,0,0,0.2)' },
  availabilityText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6',
  },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  sosButton: {
    margin: 16, backgroundColor: '#FEF2F2', borderWidth: 2,
    borderColor: '#DC2626', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  sosEmoji: { fontSize: 32 },
  sosTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  sosSubtitle: { fontSize: 12, color: '#991B1B' },
  quickActions: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8,
  },
  actionCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6',
  },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionText: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  requestCard: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6',
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  urgencyDot: { width: 12, height: 12, borderRadius: 6 },
  requestInfo: { flex: 1 },
  requestHospital: { fontSize: 14, fontWeight: '600', color: '#111827' },
  requestMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bloodGroupBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  bloodGroupText: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
  progressContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
  },
  progressBar: {
    flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3,
  },
  progressFill: { height: 6, backgroundColor: '#DC2626', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  emptyState: {
    alignItems: 'center', paddingVertical: 40, marginHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 16,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280' },
});