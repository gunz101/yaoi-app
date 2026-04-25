import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { useCatalogo } from '@/hooks/useCatalogo';
import { ExercicioCard } from '@/components/ExercicioCard';
import { GrupoMuscular as GM } from '@/types';
import type { GrupoMuscular, Exercicio } from '@/types';

const FILTROS_GRUPO: { valor: GrupoMuscular | ''; nome: string }[] = [
  { valor: '', nome: 'Todos' },
  { valor: GM.PEITO, nome: 'Peito' },
  { valor: GM.COSTAS, nome: 'Costas' },
  { valor: GM.OMBROS, nome: 'Ombros' },
  { valor: GM.BICEPS, nome: 'Bíceps' },
  { valor: GM.TRICEPS, nome: 'Tríceps' },
  { valor: GM.QUADRICEPS, nome: 'Pernas' },
  { valor: GM.ABDOMEN, nome: 'Abdômen' },
  { valor: GM.POSTERIORES, nome: 'Post.' },
  { valor: GM.GLUTEOS, nome: 'Glúteos' },
];

export default function CatalogoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { diaId } = useLocalSearchParams<{ diaId?: string }>();
  const {
    exercicios,
    termoBusca,
    carregando,
    setTermoBusca,
    setFiltros,
    carregarCatalogo,
  } = useCatalogo();

  const [filtroAtivo, setFiltroAtivo] = useState<GrupoMuscular | ''>('');

  useEffect(() => {
    carregarCatalogo();
  }, []);

  const handleFiltro = (grupo: GrupoMuscular | '') => {
    setFiltroAtivo(grupo);
    setFiltros(grupo ? { grupoMuscular: grupo } : {});
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Catálogo de Exercícios',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Search bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Pesquisar exercício..."
            placeholderTextColor={colors.textSecondary}
            value={termoBusca}
            onChangeText={setTermoBusca}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {termoBusca.length > 0 && (
            <Pressable onPress={() => setTermoBusca('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter chips — compact, single row */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {FILTROS_GRUPO.map((f) => {
              const ativo = filtroAtivo === f.valor;
              return (
                <Pressable
                  key={f.valor}
                  onPress={() => handleFiltro(f.valor)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: ativo ? colors.primary : colors.card,
                      borderColor: ativo ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: ativo ? '#fff' : colors.text },
                    ]}
                  >
                    {f.nome}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Results count */}
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {exercicios.length} exercício{exercicios.length !== 1 ? 's' : ''}
        </Text>

        {/* Exercise list — takes remaining space */}
        <View style={styles.listContainer}>
          {carregando && exercicios.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlashList
              data={exercicios}
              renderItem={({ item }: { item: Exercicio }) => (
                <ExercicioCard
                  exercicio={item}
                  onPress={() => router.push(`/exercicio/${item.id}${diaId ? `?diaId=${diaId}` : ''}`)}
                />
              )}
              estimatedItemSize={80}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  filtersWrapper: {
    height: 48,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    height: 48,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  resultCount: { fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
  listContainer: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
