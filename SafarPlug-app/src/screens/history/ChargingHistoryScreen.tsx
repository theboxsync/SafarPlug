import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useSessionStore } from '../../store/sessionStore';
import { colors } from '../../core/constants/colors';

export const ChargingHistoryScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { history, fetchHistory, isLoading, error } = useSessionStore();

  useEffect(() => {
    fetchHistory();
  }, []);

  const getDurationStr = (start: string, end?: string): string => {
    try {
      const startTime = new Date(start).getTime();
      const endTime = end ? new Date(end).getTime() : Date.now();
      const mins = Math.round((endTime - startTime) / 60000);
      if (mins >= 60) {
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }
      return `${mins}m`;
    } catch {
      return '—';
    }
  };

  const renderHistoryItem = ({ item }: { item: typeof history[0] }) => {
    const formattedDate = () => {
      try {
        return format(new Date(item.startTime), 'dd MMM yyyy, hh:mm a');
      } catch {
        return 'Recent';
      }
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Text style={styles.vehicleIcon}>{item.vehicleType === 'bike' ? '🛵' : '🚗'}</Text>
            </View>
            <View>
              <Text style={styles.sessionTitle}>
                {item.vehicleType === 'bike' ? 'Two-Wheeler Charging' : 'Car Charging'}
              </Text>
              <Text style={styles.dateText}>{formattedDate()}</Text>
            </View>
          </View>
          <Text style={styles.costText}>₹{item.totalCostRs.toFixed(2)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>ENERGY USED</Text>
            <Text style={styles.detailValue}>{item.energyUsedKwh.toFixed(1)} kWh</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>DURATION</Text>
            <Text style={styles.detailValue}>{getDurationStr(item.startTime, item.endTime)}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>STATUS</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.paymentStatus === 'paid' ? '#ECFDF5' : '#FFF1F2' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.paymentStatus === 'paid' ? colors.success : colors.error }
              ]}>
                {item.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Charging History</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching your past sessions...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔌</Text>
              <Text style={styles.emptyText}>No charging sessions recorded yet</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.emptyBtnText}>Find Station & Charge</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.primaryDark,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleIcon: {
    fontSize: 22,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  costText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
