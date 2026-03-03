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

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      setAuth(response.user);
    } catch (error: any) {
      Alert.alert(
        'Erreur de connexion',
        error.response?.data?.message || 'Email ou mot de passe incorrect',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🩸</Text>
          </View>
          <Text style={styles.appName}>BloodLink</Text>
          <Text style={styles.tagline}>Sauver des vies, ensemble</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>
            Connectez-vous à votre compte
          </Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Adresse email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerLink}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLinkText}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1,245</Text>
            <Text style={styles.statLabel}>Donneurs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>890</Text>
            <Text style={styles.statLabel}>Vies sauvées</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>Centres</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 28, fontWeight: '800', color: '#DC2626' },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  formSection: { marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#111827',
  },
  loginButton: {
    backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerLink: {
    flexDirection: 'row', justifyContent: 'center', marginTop: 20,
  },
  registerText: { fontSize: 14, color: '#6B7280' },
  registerLinkText: { fontSize: 14, color: '#DC2626', fontWeight: '700' },
  statsSection: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#DC2626' },
  statLabel: { fontSize: 11, color: '#991B1B', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#FECACA' },
});