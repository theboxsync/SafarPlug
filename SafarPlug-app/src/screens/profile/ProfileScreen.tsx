import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { theme } from '../../core/constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import { CustomButton } from '../../core/components/CustomButton';
import { LoadingWidget } from '../../core/components/LoadingWidget';
import { format } from 'date-fns';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const { history, fetchHistory, isLoading } = useSessionStore();

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
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
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyStation} numberOfLines={1}>
            Station ID: {item.stationId.substring(0, 8)}
          </Text>
          <Text style={styles.historyPrice}>₹{item.totalCostRs.toFixed(2)}</Text>
        </View>

        <View style={styles.historyDetails}>
          <Text style={styles.historySub}>
            ⚡ {item.energyUsedKwh.toFixed(1)} kWh | Type: {item.vehicleType}
          </Text>
          <Text style={styles.historyDate}>{formattedDate()}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'EV Driver'}</Text>
        <Text style={styles.email}>{user?.email || 'driver@safarplug.com'}</Text>
        <Text style={styles.phone}>{user?.phone || '+91 99999 99999'}</Text>

        {user?.vehicleType && (
          <View style={styles.vehicleTag}>
            <Text style={styles.vehicleTagText}>
              🚗 Primary EV: {user.vehicleType.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Charging History</Text>

      {isLoading ? (
        <LoadingWidget message="Fetching your past sessions..." />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No charging sessions recorded yet</Text>
            </View>
          }
        />
      )}

      <CustomButton
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.background,
  },
  name: {
    ...theme.typography.h2,
  },
  email: {
    ...theme.typography.bodySecondary,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  phone: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  vehicleTag: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    marginTop: theme.spacing.sm,
  },
  vehicleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 80,
  },
  historyCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyStation: {
    ...theme.typography.body,
    fontWeight: '700',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  historyPrice: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historySub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  historyDate: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.bodySecondary,
    color: theme.colors.textLight,
  },
  logoutBtn: {
    margin: theme.spacing.lg,
  },
});
