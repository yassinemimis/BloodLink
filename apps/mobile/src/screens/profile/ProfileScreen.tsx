import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import api from '../../services/api';
import { BLOOD_GROUP_LABELS } from '../../types';

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const [toggling, setToggling] = useState(false);

  if (!user) return null;

  const handleToggleAvailability = async () => {
    setToggling(true);
    try {
      const response = await api.patch('/users/toggle-availability');
      updateUser({ isAvailable: response.data.isAvailable });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer la disponibilité');
    } finally {
      setToggling(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          logout();
        },
      },
    ]);
  };

  const daysSinceLastDonation = user.lastDonationAt
    ? Math.floor((Date.now() - new Date(user.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const canDonate = daysSinceLastDonation === null || daysSinceLastDonation >= 56;
  const daysRemaining = daysSinceLastDonation !== null ? Math.max(0, 56 - daysSinceLastDonation) : 0;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user.firstName[0]}{user.lastName[0]}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.profileEmail}>{user.email}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.bloodBadgeLarge}>
            <Text style={styles.bloodBadgeLargeText}>
              🩸 {BLOOD_GROUP_LABELS[user.bloodGroup]}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user.role === 'DONOR' ? '💉 Donneur' : user.role === 'PATIENT' ? '🏥 Patient' : user.role === 'DOCTOR' ? '👨‍⚕️ Médecin' : '⚙️ Admin'}
            </Text>
          </View>
          {user.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✅ Vérifié</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      {user.role === 'DONOR' && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💉</Text>
            <Text style={styles.statValue}>{user.totalDonations}</Text>
            <Text style={styles.statLabel}>Dons effectués</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={styles.statValueSmall}>
              {user.lastDonationAt
                ? new Date(user.lastDonationAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                : 'Aucun'}
            </Text>
            <Text style={styles.statLabel}>Dernier don</Text>
          </View>
          <View style={[styles.statCard, canDonate ? styles.statGreen : styles.statOrange]}>
            <Text style={styles.statEmoji}>{canDonate ? '✅' : '⏳'}</Text>
            <Text style={styles.statValueSmall}>
              {canDonate ? 'Éligible' : `${daysRemaining}j`}
            </Text>
            <Text style={styles.statLabel}>Éligibilité</Text>
          </View>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📧 Email</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📱 Téléphone</Text>
          <Text style={styles.infoValue}>{user.phone || 'Non renseigné'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍 Ville</Text>
          <Text style={styles.infoValue}>{user.city || 'Non renseignée'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🩸 Groupe sanguin</Text>
          <Text style={styles.infoValue}>{BLOOD_GROUP_LABELS[user.bloodGroup]}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📆 Inscrit le</Text>
          <Text style={styles.infoValue}>
            {new Date(user.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* Availability Toggle */}
      {user.role === 'DONOR' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilité</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>
                {user.isAvailable ? '🟢 Disponible' : '🔴 Indisponible'}
              </Text>
              <Text style={styles.toggleSubtitle}>
                {user.isAvailable
                  ? 'Vous recevez les notifications de demandes'
                  : 'Vous ne recevez pas les notifications'}
              </Text>
            </View>
            <Switch
              value={user.isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
              thumbColor={user.isAvailable ? '#DC2626' : '#9CA3AF'}
              disabled={toggling}
            />
          </View>
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>

        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsEmoji}>🔔</Text>
          <Text style={styles.settingsText}>Préférences de notification</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsEmoji}>🔒</Text>
          <Text style={styles.settingsText}>Confidentialité</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsEmoji}>🌍</Text>
          <Text style={styles.settingsText}>Langue</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsEmoji}>❓</Text>
          <Text style={styles.settingsText}>Aide et support</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsEmoji}>📄</Text>
          <Text style={styles.settingsText}>Conditions d'utilisation</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Déconnexion</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>BloodLink v1.0.0</Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  profileHeader: {
    backgroundColor: '#DC2626', paddingTop: 30, paddingBottom: 30,
    alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 14, color: '#FEE2E2', marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  bloodBadgeLarge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  bloodBadgeLargeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  roleBadgeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  verifiedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  verifiedText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 10, marginTop: -15 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statGreen: { backgroundColor: '#ECFDF5' },
  statOrange: { backgroundColor: '#FFFBEB' },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  statValueSmall: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  section: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff',
    borderRadius: 20, padding: 16, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  toggleSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  settingsEmoji: { fontSize: 18, marginRight: 12 },
  settingsText: { flex: 1, fontSize: 14, color: '#374151' },
  settingsArrow: { fontSize: 20, color: '#D1D5DB' },
  logoutButton: {
    marginHorizontal: 16, marginTop: 20, backgroundColor: '#FEE2E2',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  versionText: {
    textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 16,
  },
});