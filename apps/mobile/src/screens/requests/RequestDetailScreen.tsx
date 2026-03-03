import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
  BloodRequest,
  BLOOD_GROUP_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetail'>;

const statusLabels: Record<string, string> = {
  PENDING: '⏳ En attente',
  SEARCHING: '🔍 Recherche',
  MATCHED: '✅ Donneur trouvé',
  FULFILLED: '🎉 Satisfaite',
  CANCELLED: '❌ Annulée',
  EXPIRED: '⏰ Expirée',
};

const donationStatusLabels: Record<string, string> = {
  NOTIFIED: '📤 Notifié',
  ACCEPTED: '✅ Accepté',
  IN_PROGRESS: '🔄 En cours',
  COMPLETED: '🎉 Complété',
  REJECTED: '❌ Rejeté',
  CANCELLED: '🚫 Annulé',
};

export default function RequestDetailScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const { user } = useAuthStore();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, []);

  const loadRequest = async () => {
    try {
      const response = await api.get(`/blood-requests/${requestId}`);
      setRequest(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Demande non trouvée');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDonation = async () => {
    Alert.alert(
      'Confirmer',
      'Voulez-vous accepter cette demande de don ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            setAccepting(true);
            try {
              await api.post('/donations/accept', { requestId });
              Alert.alert('Merci ! 🩸', 'Votre acceptation a été enregistrée. Le patient sera informé.');
              loadRequest();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.message || 'Erreur');
            } finally {
              setAccepting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!request) return null;

  const progress = (request.unitsFulfilled / request.unitsNeeded) * 100;

  return (
    <ScrollView style={styles.container}>
      {/* Blood Group Header */}
      <View style={[styles.headerCard, { borderLeftColor: URGENCY_COLORS[request.urgencyLevel] }]}>
        <View style={styles.headerTop}>
          <View style={styles.bloodGroupCircle}>
            <Text style={styles.bloodGroupLarge}>
              {BLOOD_GROUP_LABELS[request.bloodGroup]}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Besoin de sang {BLOOD_GROUP_LABELS[request.bloodGroup]}</Text>
            <Text style={styles.headerHospital}>🏥 {request.hospital}</Text>
            <View style={[styles.urgencyBadge, { backgroundColor: URGENCY_COLORS[request.urgencyLevel] + '20' }]}>
              <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLORS[request.urgencyLevel] }]} />
              <Text style={[styles.urgencyText, { color: URGENCY_COLORS[request.urgencyLevel] }]}>
                {URGENCY_LABELS[request.urgencyLevel]}
              </Text>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {statusLabels[request.status] || request.status}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Progression</Text>
          <Text style={styles.progressCount}>
            {request.unitsFulfilled} / {request.unitsNeeded} unités
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Détails</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🩸</Text>
          <Text style={styles.detailLabel}>Groupe sanguin</Text>
          <Text style={styles.detailValue}>{BLOOD_GROUP_LABELS[request.bloodGroup]}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>💉</Text>
          <Text style={styles.detailLabel}>Unités nécessaires</Text>
          <Text style={styles.detailValue}>{request.unitsNeeded}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🏥</Text>
          <Text style={styles.detailLabel}>Hôpital</Text>
          <Text style={styles.detailValue}>{request.hospital}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailLabel}>Date de création</Text>
          <Text style={styles.detailValue}>
            {new Date(request.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

        {request.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>📝 Description</Text>
            <Text style={styles.descriptionText}>{request.description}</Text>
          </View>
        )}
      </View>

      {/* Patient Info */}
      {request.patient && (
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Patient</Text>
          <View style={styles.patientRow}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientInitials}>
                {request.patient.firstName[0]}{request.patient.lastName[0]}
              </Text>
            </View>
            <View>
              <Text style={styles.patientName}>
                {request.patient.firstName} {request.patient.lastName}
              </Text>
              <Text style={styles.patientBlood}>
                {BLOOD_GROUP_LABELS[request.patient.bloodGroup]}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Donations List */}
      {request.donations && request.donations.length > 0 && (
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>
            Réponses des donneurs ({request.donations.length})
          </Text>
          {request.donations.map((donation: any) => (
            <View key={donation.id} style={styles.donationRow}>
              <View style={styles.donationAvatar}>
                <Text style={styles.donationInitials}>
                  {donation.donor?.firstName?.[0]}{donation.donor?.lastName?.[0]}
                </Text>
              </View>
              <View style={styles.donationInfo}>
                <Text style={styles.donationName}>
                  {donation.donor?.firstName} {donation.donor?.lastName}
                </Text>
                <Text style={styles.donationDate}>
                  {new Date(donation.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={styles.donationStatus}>
                {donationStatusLabels[donation.status] || donation.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Accept Button (for Donors) */}
      {user?.role === 'DONOR' &&
        request.status !== 'FULFILLED' &&
        request.status !== 'CANCELLED' && (
          <TouchableOpacity
            style={[styles.acceptButton, accepting && { opacity: 0.7 }]}
            onPress={handleAcceptDonation}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>🩸 Accepter de donner</Text>
            )}
          </TouchableOpacity>
        )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 18,
    borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerTop: { flexDirection: 'row', gap: 14 },
  bloodGroupCircle: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
  bloodGroupLarge: { fontSize: 22, fontWeight: '800', color: '#DC2626' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerHospital: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  urgencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, marginTop: 6,
  },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  urgencyText: { fontSize: 12, fontWeight: '600' },
  statusRow: {
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  statusText: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center' },
  progressCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff',
    borderRadius: 16, padding: 16, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  progressCount: { fontSize: 14, color: '#6B7280' },
  progressBarBg: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5 },
  progressBarFill: { height: 10, backgroundColor: '#DC2626', borderRadius: 5 },
  detailsCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff',
    borderRadius: 16, padding: 16, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  detailIcon: { fontSize: 16, marginRight: 10 },
  detailLabel: { flex: 1, fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  descriptionBox: {
    marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
  },
  descriptionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  descriptionText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientAvatar: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
  patientInitials: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  patientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  patientBlood: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  donationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  donationAvatar: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  donationInitials: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  donationInfo: { flex: 1 },
  donationName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  donationDate: { fontSize: 11, color: '#9CA3AF' },
  donationStatus: { fontSize: 12, color: '#6B7280' },
  acceptButton: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: '#DC2626',
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  acceptButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});