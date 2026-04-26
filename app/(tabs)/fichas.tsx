import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { useFicha } from '@/hooks/useFicha';
import type { FichaDeTreino } from '@/types';

export default function FichasScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { fichas, carregando, listarFichas, duplicarFicha } = useFicha();

  useFocusEffect(
    useCallback(() => {
      listarFichas();
    }, [])
  );

  const handleDuplicar = (ficha: FichaDeTreino) => {
    Alert.alert(
      'Duplicar Ficha',
      `Criar uma cópia de "${ficha.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Duplicar',
          onPress: async () => {
            try {
              await duplicarFicha(ficha.id);
            } catch (e) {
              Alert.alert('Erro', String(e));
            }
          },
        },
      ]
    );
  };

  const renderFicha = ({ item }: { item: FichaDeTreino }) => (
    <Pressable
      onPress={() => router.push(`/ficha/${item.id}`)}
      style={({ pressed }) => [
        styles.fichaCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.fichaHeader}>
        <View style={[styles.fichaIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="clipboard" size={22} color={colors.primary} />
        </View>
        <View style={styles.fichaInfo}>
          <Text style={[styles.fichaNome, { color: colors.text }]}>{item.nome}</Text>
          <Text style={[styles.fichaData, { color: colors.textSecondary }]}>
            {item.ativa ? '🟢 Ativa' : '⚪ Inativa'}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDuplicar(item)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.duplicateBtn,
            { backgroundColor: colors.primaryLight, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="copy-outline" size={18} color={colors.primary} />
        </Pressable>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {carregando && fichas.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : fichas.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="clipboard-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Nenhuma ficha criada
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Crie sua primeira ficha de treino para organizar sua semana
          </Text>
        </View>
      ) : (
        <FlashList
          data={fichas}
          renderItem={renderFicha}
          estimatedItemSize={80}
          contentContainerStyle={{ paddingVertical: 8 }}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* FAB — Floating Action Button */}
      <Pressable
        onPress={() => router.push('/ficha/nova')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary },
          pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  fichaCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  fichaHeader: { flexDirection: 'row', alignItems: 'center' },
  fichaIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fichaInfo: { flex: 1 },
  fichaNome: { fontSize: 17, fontWeight: '600' },
  fichaData: { fontSize: 13, marginTop: 2 },
  duplicateBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
