import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/utils/theme';
import type { Exercicio } from '@/types';

interface ExercicioCardProps {
  exercicio: Exercicio;
  onPress?: () => void;
  showBadge?: boolean;
}

const GRUPO_EMOJI: Record<string, string> = {
  peito: '💪',
  costas: '🔙',
  ombros: '🏋️',
  biceps: '💪',
  triceps: '💪',
  abdomen: '🎯',
  quadriceps: '🦵',
  posteriores: '🦵',
  gluteos: '🍑',
  panturrilha: '🦶',
  trapezio: '🔺',
  antebraco: '✊',
  cardio: '❤️',
};

export function ExercicioCard({ exercicio, onPress, showBadge = true }: ExercicioCardProps) {
  const { colors } = useTheme();
  const emoji = GRUPO_EMOJI[exercicio.grupoMuscularPrincipal] ?? '🏋️';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.nome, { color: colors.text }]} numberOfLines={1}>
            {exercicio.nome}
          </Text>
          {exercicio.ehPersonalizado && showBadge && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={styles.badgeText}>Custom</Text>
            </View>
          )}
        </View>
        <Text style={[styles.grupo, { color: colors.primary }]}>
          {exercicio.grupoMuscularPrincipal}
        </Text>
        {exercicio.equipamento && (
          <View style={styles.equipRow}>
            <Ionicons name="fitness-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.equipamento, { color: colors.textSecondary }]}>
              {exercicio.equipamento}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 20 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nome: { fontSize: 16, fontWeight: '600', flex: 1 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  grupo: { fontSize: 13, fontWeight: '500', marginTop: 2, textTransform: 'capitalize' },
  equipRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  equipamento: { fontSize: 12, textTransform: 'capitalize' },
});
