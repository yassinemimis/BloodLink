import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { BloodGroup, BLOOD_GROUP_LABELS } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [role, setRole] = useState<'DONOR' | 'PATIENT'>('DONOR');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleRegister = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) return Alert.alert('Erreur', 'Nom et prénom requis');
    if (!email.trim()) return Alert.alert('Erreur', 'Email requis');
    if (!bloodGroup) return Alert.alert('Erreur', 'Sélectionnez un groupe sanguin');
    if (password.length < 8) return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
    if (password !== confirmPassword) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');

    setLoading(true);
    try {
      const response = await authService.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        bloodGroup,
        role,
      });
      setAuth(response.user);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🩸 BloodLink</Text>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez la communauté BloodLink</Text>
        </View>

        {/* Role Selection */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleItem, role === 'DONOR' && styles.roleActive]}
            onPress={() => setRole('DONOR')}
          >
            <Text style={styles.roleEmoji}>🩸</Text>
            <Text style={[styles.roleText, role === 'DONOR' && styles.roleTextActive]}>Donneur</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleItem, role === 'PATIENT' && styles.roleActive]}
            onPress={() => setRole('PATIENT')}
          >
            <Text style={styles.roleEmoji}>🏥</Text>
            <Text style={[styles.roleText, role === 'PATIENT' && styles.roleTextActive]}>Patient</Text>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ahmed"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.nameField}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Benali"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="votre@email.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Phone */}
        <Text style={styles.label}>Téléphone (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+213 5XX XXX XXX"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />

        {/* Blood Group */}
        <Text style={styles.label}>Groupe sanguin</Text>
        <View style={styles.bloodGrid}>
          {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.bloodItem, bloodGroup === value && styles.bloodItemActive]}
              onPress={() => setBloodGroup(value as BloodGroup)}
            >
              <Text style={[styles.bloodText, bloodGroup === value && styles.bloodTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Passwords */}
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
        />

        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 24, fontWeight: '800', color: '#DC2626', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleItem: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2,
    borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  roleActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  roleEmoji: { fontSize: 24, marginBottom: 4 },
  roleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  roleTextActive: { color: '#DC2626' },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#111827',
  },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodItem: {
    width: '23%', paddingVertical: 12, borderRadius: 10, borderWidth: 2,
    borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  bloodItemActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  bloodText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  bloodTextActive: { color: '#DC2626' },
  submitButton: {
    backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 24, shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: '#6B7280' },
  loginLink: { fontSize: 14, color: '#DC2626', fontWeight: '700' },
});