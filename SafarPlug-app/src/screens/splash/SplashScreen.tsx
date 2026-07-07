import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../core/constants/colors';

export const SplashScreen = ({ navigation }: any) => {
  const { hydrate, initializeAuth } = useAuthStore();

  // ── Animations ────────────────────────────────────────────────────────────
  const logoScale  = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineY   = useRef(new Animated.Value(20)).current;
  const taglineOp  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo in
    Animated.parallel([
      Animated.spring(logoScale,  { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start(() => {
      // Then tagline fades up
      Animated.parallel([
        Animated.timing(taglineY,  { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(taglineOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    });

    // Hydrate auth in background, navigate after ≥2 s
    const boot = async () => {
      const startMs = Date.now();
      await (hydrate ?? initializeAuth)();
      const elapsed = Date.now() - startMs;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        const { user } = useAuthStore.getState();
        if (user) {
          navigation.replace(user.userType === 'station_owner' ? 'OwnerDashboard' : 'MainTabs');
        } else {
          navigation.replace('Login');
        }
      }, remaining);
    };
    boot();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <View style={styles.center}>
        {/* Glowing ring behind logo */}
        <View style={styles.glow} />

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.logoText}>SafarPlug</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          style={[styles.tagline, { opacity: taglineOp, transform: [{ translateY: taglineY }] }]}
        >
          Charge anywhere, anytime
        </Animated.Text>
      </View>

      {/* Bottom branding */}
      <View style={styles.bottom}>
        <Text style={styles.bottomText}>Empowering India's EV Future 🇮🇳</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.primaryDark, justifyContent: 'space-between', paddingVertical: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  glow: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
  },

  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoBadge: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  logoEmoji: { fontSize: 48 },
  logoText:  { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -1 },

  tagline: {
    fontSize: 16, color: 'rgba(255,255,255,0.7)',
    fontWeight: '500', letterSpacing: 0.3, textAlign: 'center',
  },

  bottom:      { alignItems: 'center', gap: 4 },
  bottomText:  { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  version:     { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
});
