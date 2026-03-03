import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import api from '../../services/api';
import { locationService } from '../../services/locationService';
import {
  BloodGroup,
  UrgencyLevel,
  BLOOD_GROUP_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewRequest'>;

export default function NewRequestScreen({ navigation }: Props) {
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel | null>(null);
  const [unitsNeeded, setUnitsNeeded] = useState('1');
  const [hospital, setHospital] = useState('');
  const [description, setDescription] = useState('');
  const [searchRadius, setSearchRadius] = useState(25);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGetLocation = async () => {
    setLocating(true);
    const loc = await locationService.getCurrentLocation();
    if (loc) {
      setLocation(loc);
    } else {
      Alert.alert('Erreur', "Impossible d'obtenir votre position. Vérifiez les permissions.");
    }
    setLocating(false);
  };

  const handleSubmit = async () => {
    if (!bloodGroup) return Alert.alert('Erreur', 'Sélectionnez un groupe sanguin');
    if (!urgencyLevel) return Alert.alert('Erreur', "Sélectionnez un niveau d'urgence");
    if (!hospital.trim()) return Alert.alert('Erreur', "Entrez le nom de l'hôpital");
    if (!location) return Alert.alert('Erreur', 'Détectez votre position');

    setLoading(true);
    try {
      const result = await api.post('/blood-requests', {
        bloodGroup,
        urgencyLevel,
        unitsNeeded: parseInt(unitsNeeded) || 1,
        hospital: hospital.trim(),
        description: description.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        searchRadius,
      });

      Alert.alert(
        '✅ Demande créée',
        `${result.data.matching.donorsFound} donneurs compatibles trouvés et notifiés !`,
        [
          {
            text: 'Voir la demande',
            onPress: () =>
              navigation.replace('RequestDetail', { requestId: result.data.request.id }),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const urgencyEmojis: Record<string, string> = {
    CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢',
  };

  return (
    <ScrollView style={styles.container}>
      {/* Blood Group */}
      <View style={styles.section}>
        <Text style={styles.label}>Groupe sanguin requis *</Text>
        <View style={styles.grid4}>
          {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.gridItem, bloodGroup === value && styles.gridItemActive]}
              onPress={() => setBloodGroup(value as BloodGroup)}
            >
              <Text style={[styles.gridItemText, bloodGroup === value && styles.gridItemTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Urgency Level */}
      <View style={styles.section}>
        <Text style={styles.label}>Niveau d'urgence *</Text>
        <View style={styles.grid2}>
          {Object.entries(URGENCY_LABELS).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.urgencyItem,
                urgencyLevel === value && {
                  borderColor: URGENCY_COLORS[value as UrgencyLevel],
                  backgroundColor: URGENCY_COLORS[value as UrgencyLevel] + '15',
                },
              ]}
              onPress={() => setUrgencyLevel(value as UrgencyLevel)}
            >
              <Text style={styles.urgencyEmoji}>{urgencyEmojis[value]}</Text>
              <Text
                style={[
                  styles.urgencyLabel,
                  urgencyLevel === value && { color: URGENCY_COLORS[value as UrgencyLevel], fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Critical Warning */}
      {urgencyLevel === UrgencyLevel.CRITICAL && (
        <View style={styles.warningBox}>
          <Text style={styles.warningEmoji}>⚠️</Text>
          <Text style={styles.warningText}>
            Urgence critique : Tous les donneurs compatibles dans un rayon de 50 km seront notifiés par push et SMS.
          </Text>
        </View>
      )}

      {/* Units Needed */}
      <View style={styles.section}>
        <Text style={styles.label}>Nombre d'unités *</Text>
        <View style={styles.unitsRow}>
          <TouchableOpacity
            style={styles.unitButton}
            onPress={() => setUnitsNeeded(String(Math.max(1, parseInt(unitsNeeded) - 1)))}
          >
            <Text style={styles.unitButtonText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.unitInput}
            value={unitsNeeded}
            onChangeText={setUnitsNeeded}
            keyboardType="numeric"
            textAlign="center"
          />
          <TouchableOpacity
            style={styles.unitButton}
            onPress={() => setUnitsNeeded(String(Math.min(20, parseInt(unitsNeeded) + 1)))}
          >
            <Text style={styles.unitButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hospital */}
      <View style={styles.section}>
        <Text style={styles.label}>Hôpital *</Text>
        <TextInput
          style={styles.textInput}
          value={hospital}
          onChangeText={setHospital}
          placeholder="Ex: CHU Mustapha Pacha"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Informations supplémentaires..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Search Radius */}
      <View style={styles.section}>
        <Text style={styles.label}>Rayon de recherche</Text>
        <View style={styles.radiusRow}>
          {[5, 10, 25, 50].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusItem, searchRadius === r && styles.radiusItemActive]}
              onPress={() => setSearchRadius(r)}
            >
              <Text style={[styles.radiusText, searchRadius === r && styles.radiusTextActive]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.label}>Localisation *</Text>
        <TouchableOpacity
          style={[styles.locationButton, location && styles.locationDetected]}
          onPress={handleGetLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <Text style={styles.locationButtonText}>
              {location ? '✅ Position détectée' : '📍 Détecter ma position'}
            </Text>
          )}
        </TouchableOpacity>
        {location && (
          <Text style={styles.locationCoords}>
            Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>🩸 Créer la demande</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  section: { paddingHorizontal: 16, marginTop: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: {
    width: '23%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  gridItemActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  gridItemText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  gridItemTextActive: {
    color: '#DC2626',
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  urgencyItem: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  urgencyEmoji: { fontSize: 22, marginBottom: 4 },
  urgencyLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  warningBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningEmoji: { fontSize: 18 },
  warningText: { flex: 1, fontSize: 12, color: '#991B1B', lineHeight: 18 },
  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitButtonText: { fontSize: 22, fontWeight: '700', color: '#374151' },
  unitInput: {
    width: 60,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#fff',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  radiusRow: { flexDirection: 'row', gap: 8 },
  radiusItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radiusItemActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  radiusText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  radiusTextActive: { color: '#DC2626' },
  locationButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  locationDetected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
    borderStyle: 'solid',
  },
  locationButtonText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  locationCoords: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});