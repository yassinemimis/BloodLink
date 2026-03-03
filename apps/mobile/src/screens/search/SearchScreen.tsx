import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../../services/api';
import { locationService } from '../../services/locationService';
import { BloodGroup, BLOOD_GROUP_LABELS, URGENCY_COLORS } from '../../types';

interface DonorResult {
  id: string;
  firstName: string;
  lastName: string;
  bloodGroup: BloodGroup;
  city?: string;
  distance: number;
  totalDonations: number;
  score?: number;
}

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function SearchScreen() {
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(25);
  const [donors, setDonors] = useState<DonorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!selectedBloodGroup) {
      Alert.alert('Erreur', 'Veuillez sélectionner un groupe sanguin');
      return;
    }

    setLoading(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (!location) {
        Alert.alert('Erreur', "Impossible d'obtenir votre position");
        setLoading(false);
        return;
      }

      const response = await api.get('/matching/donors', {
        params: {
          bloodGroup: selectedBloodGroup,
          latitude: location.latitude,
          longitude: location.longitude,
          radius: selectedRadius,
        },
      });

      setDonors(response.data);
      setSearched(true);
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Blood Group Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Groupe sanguin recherché</Text>
        <View style={styles.bloodGroupGrid}>
          {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.bloodGroupItem,
                selectedBloodGroup === value && styles.bloodGroupSelected,
              ]}
              onPress={() => setSelectedBloodGroup(value as BloodGroup)}
            >
              <Text
                style={[
                  styles.bloodGroupItemText,
                  selectedBloodGroup === value && styles.bloodGroupSelectedText,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Radius Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rayon de recherche</Text>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusItem, selectedRadius === r && styles.radiusSelected]}
              onPress={() => setSelectedRadius(r)}
            >
              <Text
                style={[
                  styles.radiusText,
                  selectedRadius === r && styles.radiusSelectedText,
                ]}
              >
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search Button */}
      <TouchableOpacity
        style={[styles.searchButton, loading && { opacity: 0.7 }]}
        onPress={handleSearch}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.searchButtonText}>🔍 Rechercher des donneurs</Text>
        )}
      </TouchableOpacity>

      {/* Results */}
      {searched && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Résultats ({donors.length} donneur{donors.length > 1 ? 's' : ''})
          </Text>

          {donors.length > 0 ? (
            donors.map((donor, index) => (
              <View key={donor.id} style={styles.donorCard}>
                <View style={styles.donorHeader}>
                  <View style={styles.donorAvatar}>
                    <Text style={styles.donorInitials}>
                      {donor.firstName[0]}{donor.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.donorInfo}>
                    <Text style={styles.donorName}>
                      {donor.firstName} {donor.lastName}
                    </Text>
                    <Text style={styles.donorMeta}>
                      📍 {donor.distance?.toFixed(1)} km
                      {donor.city ? ` • ${donor.city}` : ''}
                    </Text>
                    <Text style={styles.donorMeta}>
                      💉 {donor.totalDonations} don{donor.totalDonations > 1 ? 's' : ''} effectué{donor.totalDonations > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.donorBloodBadge}>
                    <Text style={styles.donorBloodText}>
                      {BLOOD_GROUP_LABELS[donor.bloodGroup]}
                    </Text>
                  </View>
                </View>

                {/* Score Bar */}
                {donor.score !== undefined && (
                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreLabel}>Compatibilité</Text>
                    <View style={styles.scoreBar}>
                      <View
                        style={[
                          styles.scoreFill,
                          {
                            width: `${donor.score}%`,
                            backgroundColor:
                              donor.score > 70 ? '#059669' : donor.score > 40 ? '#D97706' : '#DC2626',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.scoreText}>{donor.score?.toFixed(0)}%</Text>
                  </View>
                )}

                {/* Contact Button */}
                <TouchableOpacity style={styles.contactButton}>
                  <Text style={styles.contactButtonText}>📞 Contacter</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>😔</Text>
              <Text style={styles.emptyText}>
                Aucun donneur trouvé dans un rayon de {selectedRadius} km
              </Text>
              <Text style={styles.emptySubtext}>
                Essayez d'augmenter le rayon de recherche
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  bloodGroupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodGroupItem: {
    width: '23%', paddingVertical: 14, borderRadius: 12,
    borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#fff',
  },
  bloodGroupSelected: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  bloodGroupItemText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  bloodGroupSelectedText: { color: '#DC2626' },
  radiusRow: { flexDirection: 'row', gap: 8 },
  radiusItem: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#fff',
  },
  radiusSelected: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  radiusText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  radiusSelectedText: { color: '#DC2626' },
  searchButton: {
    marginHorizontal: 16, backgroundColor: '#DC2626', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  donorCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6',
  },
  donorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  donorAvatar: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
  donorInitials: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  donorInfo: { flex: 1 },
  donorName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  donorMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  donorBloodBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  donorBloodText: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  scoreContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
  },
  scoreLabel: { fontSize: 12, color: '#6B7280', width: 80 },
  scoreBar: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3 },
  scoreFill: { height: 6, borderRadius: 3 },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#374151', width: 35 },
  contactButton: {
    marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  contactButtonText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});