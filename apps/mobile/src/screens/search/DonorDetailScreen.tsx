import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import api from '../../services/api';
import { User, BLOOD_GROUP_LABELS } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DonorDetail'>;

export default function DonorDetailScreen({ route }: Props) {
  const { donorId } = route.params;
  const [donor, setDonor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDonor();
  }, []);

  const loadDonor = async () => {
    try {
      const response = await api.get(`/users/${donorId}`);
      setDonor(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Donneur non trouvé');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (donor?.phone) {
      Linking.openURL(`tel:${donor.phone}`);
    }
  };

  const handleSMS = () => {
    if (donor?.phone) {
      Linking.openURL(`sms:${donor.phone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!donor) return null;

  const daysSinceLastDonation = donor.lastDonationAt
    ? Math.floor((Date.now() - new Date(donor.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const canDonate = daysSinceLastDonation === null || daysSinceLastDonation >= 56;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {donor.firstName[0]}{donor.lastName[0]}
          </Text>
        </View>
        <Text style={styles.name}>{donor.firstName} {donor.lastName}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodBadgeText}>
              🩸 {BLOOD_GROUP_LABELS[donor.bloodGroup]}
            </Text>
          </View>
          <View style={[styles.statusBadge, canDonate ? styles.statusGreen : styles.statusOrange]}>
            <Text style={[styles.statusText, canDonate ? styles.statusGreenText : styles.statusOrangeText]}>
              {canDonate ? '✅ Éligible' : '⏳ Non éligible'}
            </Text>
          </View>
          <View style={[styles.statusBadge, donor.isAvailable ? styles.statusGreen : styles.statusRed]}>
            <Text style={[styles.statusText, donor.isAvailable ? styles.statusGreenText : styles.statusRedText]}>
              {donor.isAvailable ? '🟢 Disponible' : '🔴 Indisponible'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>💉</Text>
          <Text style={styles.statValue}>{donor.totalDonations}</Text>
          <Text style={styles.statLabel}>Dons</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📅</Text>
          <Text style={styles.statValueSmall}>
            {donor.lastDonationAt
              ? new Date(donor.lastDonationAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              : 'Aucun'}
          </Text>
          <Text style={styles.statLabel}>Dernier don</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📆</Text>
          <Text style={styles.statValueSmall}>
            {new Date(donor.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
          <Text style={styles.statLabel}>Inscrit</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Informations</Text>

        {donor.city && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoLabel}>Ville</Text>
            <Text style={styles.infoValue}>{donor.city}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🩸</Text>
          <Text style={styles.infoLabel}>Groupe sanguin</Text>
          <Text style={styles.infoValue}>{BLOOD_GROUP_LABELS[donor.bloodGroup]}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>✅</Text>
          <Text style={styles.infoLabel}>Vérifié</Text>
          <Text style={styles.infoValue}>{donor.isVerified ? 'Oui' : 'Non'}</Text>
        </View>

        {daysSinceLastDonation !== null && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⏳</Text>
            <Text style={styles.infoLabel}>Jours depuis dernier don</Text>
            <Text style={styles.infoValue}>{daysSinceLastDonation}j</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {donor.phone && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Text style={styles.callButtonText}>📞 Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smsButton} onPress={handleSMS}>
            <Text style={styles.smsButtonText}>💬 SMS</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#DC2626', paddingTop: 24, paddingBottom: 28,
    alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  bloodBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  bloodBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusGreen: { backgroundColor: 'rgba(5, 150, 105, 0.2)' },
  statusOrange: { backgroundColor: 'rgba(217, 119, 6, 0.2)' },
  statusRed: { backgroundColor: 'rgba(220, 38, 38, 0.2)' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusGreenText: { color: '#D1FAE5' },
  statusOrangeText: { color: '#FDE68A' },
  statusRedText: { color: '#FEE2E2' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10, marginTop: -15 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statValueSmall: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  infoCard: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  infoIcon: { fontSize: 16, marginRight: 10 },
  infoLabel: { flex: 1, fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  actionsContainer: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16,
  },
  callButton: {
    flex: 1, backgroundColor: '#DC2626', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  callButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  smsButton: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  smsButtonText: { color: '#374151', fontWeight: '700', fontSize: 15 },
});