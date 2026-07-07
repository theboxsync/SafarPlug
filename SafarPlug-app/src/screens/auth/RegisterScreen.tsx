import React, { useState } from 'react';
import {
  ActivityIndicator,
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

type UserRole    = 'ev_user' | 'station_owner';
type VehicleType = 'car' | 'bike' | 'both';

const USER_TYPES: { id: UserRole; icon: string; label: string; sub: string }[] = [
  { id: 'ev_user',        icon: '🚗', label: "I'm an EV Owner",     sub: 'Find and book charging slots' },
  { id: 'station_owner',  icon: '⚡', label: "I'm a Station Owner",  sub: 'List your charging point' },
];

const VEHICLE_TYPES: { id: VehicleType; icon: string; label: string }[] = [
  { id: 'car',  icon: '🚗', label: 'Car'  },
  { id: 'bike', icon: '🛵', label: 'Bike' },
  { id: 'both', icon: '🔌', label: 'Both' },
];

export const RegisterScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const [userRole,    setUserRole]    = useState<UserRole>('ev_user');
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [agreedToTC,  setAgreedToTC]  = useState(false);

  const { register, isLoading, error, clearError } = useAuthStore();

  const isFormValid =
    name.trim() && email.trim() && phone.trim() && password.length >= 6 && agreedToTC;

  const handleRegister = async () => {
    if (!isFormValid) return;
    clearError();
    try {
      await register({
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        phone:       phone.trim(),
        password,
        userType:    userRole,
        vehicleType: userRole === 'ev_user' ? vehicleType : undefined,
      });
      const user = useAuthStore.getState().user;
      if (user) {
        navigation.replace(user.userType === 'station_owner' ? 'OwnerDashboard' : 'MainTabs');
      }
    } catch {
      // error shown from store
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* ── Brand strip ──────────────────────────────────────────────── */}
      <View style={styles.brandStrip}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.brandLogo}>⚡ SafarPlug</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join SafarPlug and start your EV journey</Text>
          </View>

          {/* ── 1. User type selector ────────────────────────────────── */}
          <Text style={styles.sectionLabel}>I am a…</Text>
          <View style={styles.userTypeRow}>
            {USER_TYPES.map((ut) => (
              <TouchableOpacity
                key={ut.id}
                style={[styles.userTypeCard, userRole === ut.id && styles.userTypeCardActive]}
                onPress={() => { clearError(); setUserRole(ut.id); }}
                activeOpacity={0.8}
              >
                <Text style={styles.userTypeIcon}>{ut.icon}</Text>
                <Text style={[styles.userTypeLabel, userRole === ut.id && styles.userTypeLabelActive]}>
                  {ut.label}
                </Text>
                <Text style={styles.userTypeSub}>{ut.sub}</Text>
                {userRole === ut.id && <Text style={styles.userTypeCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Error banner ─────────────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* ── 2. Name ──────────────────────────────────────────────── */}
          <Field label="Full Name" icon="👤">
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={(t) => { clearError(); setName(t); }}
              returnKeyType="next"
            />
          </Field>

          {/* ── 3. Email ─────────────────────────────────────────────── */}
          <Field label="Email Address" icon="📧">
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={(t) => { clearError(); setEmail(t); }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </Field>

          {/* ── 4. Phone ─────────────────────────────────────────────── */}
          <Field label="Mobile Number" icon="📱">
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textLight}
              value={phone}
              onChangeText={(t) => { clearError(); setPhone(t); }}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </Field>

          {/* ── 5. Password ──────────────────────────────────────────── */}
          <Field label="Password" icon="🔒" rightSlot={
            <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          }>
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={(t) => { clearError(); setPassword(t); }}
              secureTextEntry={!showPass}
              returnKeyType="done"
            />
          </Field>

          {/* ── 6. Vehicle type (EV user only) ───────────────────────── */}
          {userRole === 'ev_user' && (
            <>
              <Text style={styles.sectionLabel}>Primary Vehicle</Text>
              <View style={styles.vehicleRow}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehicleChip, vehicleType === v.id && styles.vehicleChipActive]}
                    onPress={() => setVehicleType(v.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.vehicleIcon}>{v.icon}</Text>
                    <Text style={[styles.vehicleLabel, vehicleType === v.id && styles.vehicleLabelActive]}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── 7. T&C checkbox ──────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.tcRow}
            onPress={() => setAgreedToTC((p) => !p)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreedToTC && styles.checkboxActive]}>
              {agreedToTC && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.tcText}>
              I agree to SafarPlug's{' '}
              <Text style={styles.tcLink}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.tcLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* ── Register button ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.registerBtn, (!isFormValid || isLoading) && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.registerBtnText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* ── Login link ───────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => { clearError(); navigation.navigate('Login'); }}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Field helper component ───────────────────────────────────────────────────
const Field: React.FC<{ label: string; icon: string; children: React.ReactNode; rightSlot?: React.ReactNode }> = ({
  label, icon, children, rightSlot,
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputBox}>
      <Text style={styles.inputIcon}>{icon}</Text>
      {children}
      {rightSlot}
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },

  brandStrip: {
    backgroundColor: colors.primaryDark, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backBtn:     { width: 32, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  brandLogo:   { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

  header:   { marginTop: 24, marginBottom: 20 },
  title:    { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  // ── User type selector ──
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  userTypeRow:  { flexDirection: 'row', gap: 10, marginBottom: 20 },
  userTypeCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    position: 'relative',
  },
  userTypeCardActive:  { borderColor: colors.primary, backgroundColor: '#F0FDF4' },
  userTypeIcon:        { fontSize: 28, marginBottom: 6 },
  userTypeLabel:       { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  userTypeLabelActive: { color: colors.primary },
  userTypeSub:         { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 4 },
  userTypeCheck:       { position: 'absolute', top: 8, right: 10, fontSize: 13, color: colors.primary, fontWeight: '900' },

  // ── Error ──
  errorBanner: {
    backgroundColor: '#FFF1F2', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: '600' },

  // ── Fields ──
  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 7 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10,
  },
  inputIcon:  { fontSize: 18 },
  input:      { flex: 1, fontSize: 15, color: colors.text },
  eyeBtn:     { padding: 4 },
  eyeIcon:    { fontSize: 18 },

  // ── Vehicle type ──
  vehicleRow:       { flexDirection: 'row', gap: 10, marginBottom: 16 },
  vehicleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  vehicleChipActive:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  vehicleIcon:        { fontSize: 20 },
  vehicleLabel:       { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  vehicleLabelActive: { color: colors.primary },

  // ── T&C ──
  tcRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20, marginTop: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick:    { color: '#fff', fontSize: 13, fontWeight: '900' },
  tcText:          { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  tcLink:          { color: colors.primary, fontWeight: '700' },

  // ── Register btn ──
  registerBtn: {
    backgroundColor: colors.primary, borderRadius: 16, height: 56,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  registerBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  registerBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800' },

  loginLink:     { alignItems: 'center', paddingVertical: 4, marginBottom: 8 },
  loginLinkText: { fontSize: 15, color: colors.textSecondary },
  loginLinkBold: { color: colors.primary, fontWeight: '800' },
});
