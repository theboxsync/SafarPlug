import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../core/constants/colors';

export const LoginScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
      const user = useAuthStore.getState().user;
      if (user) {
        navigation.replace(user.userType === 'station_owner' ? 'OwnerDashboard' : 'MainTabs');
      }
    } catch {
      // error shown from store
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Password reset via email is coming soon. Please contact support at support@safarplug.in for assistance.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* ── Brand strip ──────────────────────────────────────────────── */}
      <View style={styles.brandStrip}>
        <Text style={styles.brandLogo}>⚡ SafarPlug</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back 👋</Text>
            <Text style={styles.subtitle}>Sign in to find and book EV charging slots</Text>
          </View>

          {/* ── Error banner ─────────────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* ── Email field ──────────────────────────────────────────── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                testID="email-input"
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={(t) => { clearError(); setEmail(t); }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* ── Password field ───────────────────────────────────────── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                testID="password-input"
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={(t) => { clearError(); setPassword(t); }}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Forgot password ──────────────────────────────────────── */}
          <TouchableOpacity style={styles.forgotWrap} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* ── Login button ─────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.loginBtn, (!email || !password || isLoading) && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={!email || !password || isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.loginBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* ── Divider ──────────────────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Register link ────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => { clearError(); navigation.navigate('Register'); }}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={styles.registerLinkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  scroll:  { paddingHorizontal: 24, paddingTop: 8 },

  brandStrip: {
    backgroundColor: colors.primaryDark, paddingHorizontal: 24, paddingVertical: 14,
    alignItems: 'flex-start',
  },
  brandLogo: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

  header:   { marginTop: 28, marginBottom: 24 },
  title:    { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 21 },

  errorBanner: {
    backgroundColor: '#FFF1F2', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: '600' },

  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, height: 54, gap: 10,
  },
  inputIcon:  { fontSize: 18 },
  input:      { flex: 1, fontSize: 15, color: colors.text },
  eyeBtn:     { padding: 4 },
  eyeIcon:    { fontSize: 18 },

  forgotWrap: { alignItems: 'flex-end', marginBottom: 24, marginTop: -4 },
  forgotText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  loginBtn: {
    backgroundColor: colors.primary, borderRadius: 16, height: 56,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  loginBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textLight, fontWeight: '600' },

  registerLink:     { alignItems: 'center', paddingVertical: 4 },
  registerLinkText: { fontSize: 15, color: colors.textSecondary },
  registerLinkBold: { color: colors.primary, fontWeight: '800' },
});
