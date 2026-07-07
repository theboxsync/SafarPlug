import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../core/constants/colors';
import { Charger, ChargerType } from '../../../models/chargerModel';
import { Station } from '../../../models/stationModel';
import { paymentService } from '../../../services/paymentService';
import { sessionService } from '../../../services/sessionService';
import { useAuthStore } from '../../../store/authStore';

// ─── Charger type labels ──────────────────────────────────────────────────────
const CHARGER_LABELS: Record<ChargerType, { label: string; icon: string; color: string }> = {
  ac_slow_2w:  { label: 'AC Slow 2W',  icon: '🛵', color: '#D97706' },
  ac_slow_car: { label: 'AC Slow Car', icon: '⚡', color: '#1D9E75' },
  ac_fast_car: { label: 'AC Fast Car', icon: '⚡', color: '#0369A1' },
  dc_fast_car: { label: 'DC Fast',     icon: '🔋', color: '#7C3AED' },
};

const CONNECTOR_LABELS: Record<string, string> = {
  type2: 'Type 2', ccs2: 'CCS2', home_plug: 'Home Plug',
};

// ─── Platform fee ─────────────────────────────────────────────────────────────
const PLATFORM_FEE_RS = 2;

interface BookingBottomSheetProps {
  station: Station;
  chargers: Charger[];
  onClose: () => void;
  onBookingSuccess: (sessionId: string) => void;
}

export const BookingBottomSheet: React.FC<BookingBottomSheetProps> = ({
  station,
  chargers,
  onClose,
  onBookingSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%', '85%'], []);

  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const user = useAuthStore((s) => s.user);
  const availableChargers = chargers.filter((c) => c.isAvailable);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  const handleConfirmBooking = async () => {
    if (!selectedCharger) {
      Alert.alert('Select a slot', 'Please choose a charger slot first.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create a Razorpay order for the ₹2 platform fee
      const tempSessionId = `temp-${Date.now()}`;
      const order = await paymentService.createOrder(tempSessionId, PLATFORM_FEE_RS * 100); // paise

      // 2. Open Razorpay checkout
      //    react-native-razorpay is imported dynamically to avoid build issues when
      //    the module is not yet linked. Fallback to direct session start for dev builds.
      let razorpay: any;
      try {
        razorpay = require('react-native-razorpay').default ?? require('react-native-razorpay');
      } catch {
        razorpay = null;
      }

      if (razorpay && user) {
        const options = {
          description: `Platform fee – ${station.name}`,
          image: 'https://i.imgur.com/lfKBGYO.png',
          currency: order.currency,
          key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? 'rzp_test_xxxxx',
          amount: String(PLATFORM_FEE_RS * 100),
          name: 'SafarPlug',
          order_id: order.id,
          prefill: { email: user.email, contact: user.phone ?? '', name: user.name },
          theme: { color: colors.primary },
        };

        const paymentData = await razorpay.open(options);

        // 3. Verify payment on backend
        const verified = await paymentService.verifyPayment(
          tempSessionId,
          order.id,
          paymentData.razorpay_payment_id,
          paymentData.razorpay_signature
        );

        if (!verified) {
          throw new Error('Payment verification failed. Please contact support.');
        }
      }
      // (If Razorpay is unavailable in dev, we skip payment and go straight to session)

      // 4. Start actual charging session
      const session = await sessionService.startSession(
        station.id,
        selectedCharger.id,
        undefined,
        selectedCharger.vehicleCompatibility.includes('bike') ? 'bike' : 'car'
      );

      bottomSheetRef.current?.close();
      onBookingSuccess(session.id);
    } catch (err: any) {
      if (err?.code === 'PAYMENT_CANCELLED') {
        // User dismissed the sheet — no error toast needed
      } else {
        Alert.alert('Booking Failed', err.message ?? 'Could not start charging session.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ──────────────────────────────────────────────────────── */}
        <Text style={styles.title}>Select a charger slot</Text>
        <Text style={styles.subtitle}>{station.name}</Text>

        {/* ── Charger list ────────────────────────────────────────────────── */}
        {availableChargers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔴</Text>
            <Text style={styles.emptyText}>All charger slots are currently busy.</Text>
            <Text style={styles.emptyHint}>Try again in a few minutes.</Text>
          </View>
        ) : (
          availableChargers.map((charger) => {
            const cfg = CHARGER_LABELS[charger.chargerType] ?? { label: charger.chargerType, icon: '🔌', color: colors.primary };
            const selected = selectedCharger?.id === charger.id;

            return (
              <TouchableOpacity
                key={charger.id}
                style={[styles.slotRow, selected && styles.slotRowSelected]}
                onPress={() => setSelectedCharger(charger)}
                activeOpacity={0.8}
              >
                {/* Type icon */}
                <View style={[styles.slotIcon, { backgroundColor: cfg.color + '18' }]}>
                  <Text style={styles.slotIconText}>{cfg.icon}</Text>
                </View>

                {/* Info */}
                <View style={styles.slotInfo}>
                  <Text style={styles.slotLabel}>{cfg.label}</Text>
                  <Text style={styles.slotMeta}>
                    {charger.powerKw} kW · {CONNECTOR_LABELS[charger.connectorType] ?? charger.connectorType}
                  </Text>
                  <View style={styles.vehicleRow}>
                    {charger.vehicleCompatibility.map((v) => (
                      <Text key={v} style={styles.vehicleText}>{v === 'bike' ? '🛵 Bike' : '🚗 Car'}</Text>
                    ))}
                  </View>
                </View>

                {/* Selection radio */}
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Platform fee note ──────────────────────────────────────────── */}
        <View style={styles.feeNote}>
          <Text style={styles.feeNoteText}>
            ₹{PLATFORM_FEE_RS} platform fee charged at booking · Charging billed at ₹{station.pricePerKwh}/kWh
          </Text>
        </View>

        {/* ── Confirm button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!selectedCharger || isProcessing) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={!selectedCharger || isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {selectedCharger ? 'Confirm Booking →' : 'Select a slot to continue'}
            </Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: { backgroundColor: colors.border, width: 40 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },

  // ── Slot row ──
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotRowSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  slotIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotIconText: { fontSize: 22 },
  slotInfo: { flex: 1 },
  slotLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  slotMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  vehicleRow: { flexDirection: 'row', gap: 8 },
  vehicleText: { fontSize: 12, color: colors.textLight, fontWeight: '600' },

  // ── Radio button ──
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },

  // ── Empty state ──
  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: colors.textLight, marginTop: 6 },

  // ── Fee note ──
  feeNote: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginVertical: 16,
  },
  feeNoteText: { fontSize: 12, color: colors.primaryDark, textAlign: 'center', lineHeight: 18 },

  // ── Confirm button ──
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
