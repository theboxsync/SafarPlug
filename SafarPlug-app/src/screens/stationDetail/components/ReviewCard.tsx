import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Review } from '../../../models/reviewModel';
import { colors } from '../../../core/constants/colors';

interface ReviewCardProps {
  review: Review;
}

/** Derive initials from user name, e.g. "Aarav Mehta" → "AM" */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
};

/** Simple color from name hash */
const avatarColor = (name: string): string => {
  const palette = ['#1D9E75', '#7C3AED', '#0369A1', '#D97706', '#DC2626', '#059669'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const dateStr = (() => {
    try {
      return format(new Date(review.createdAt), 'dd MMM yyyy');
    } catch {
      return 'Recent';
    }
  })();

  const initials = getInitials(review.userName);
  const bgColor = avatarColor(review.userName);

  return (
    <View style={styles.card}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Avatar circle */}
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.userName}>{review.userName}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        {/* Star rating */}
        <View style={styles.starRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Text key={i} style={[styles.star, { color: i < review.rating ? '#F59E0B' : colors.border }]}>
              ★
            </Text>
          ))}
        </View>
      </View>

      {/* ── Comment ────────────────────────────────────────────────────── */}
      {review.comment ? (
        <Text style={styles.comment}>"{review.comment}"</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  meta: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  date: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 1,
  },
  starRow: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
    marginLeft: 1,
  },
  comment: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic',
  },
});
