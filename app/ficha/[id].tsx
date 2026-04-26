import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { useFicha } from '@/hooks/useFicha';
import { exercicioService } from '@/services/ExercicioService';
import type { Exercicio, ExercicioNoPlano } from '@/types';

const DIAS_SEMANA = ['', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ExercicioComNome extends ExercicioNoPlano {
  nomeExercicio?: string;
}

export default function FichaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const {
    fichaAtual,
    selecionarFicha,
    excluirFicha,
    editarExercicioNoPlano,
    removerExercicio,
    carregando,
  } = useFicha();
  const [exerciciosPorDia, setExerciciosPorDia] = useState<
    Record<string, ExercicioComNome[]>
  >({});
  const [diaExpandido, setDiaExpandido] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    series: '',
    reps: '',
    carga: '',
    descanso: '',
  });
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  useEffect(() => {
    if (id) selecionarFicha(id);
  }, [id]);

  useEffect(() => {
    async function carregarExercicios() {
      if (!fichaAtual) return;
      const mapa: Record<string, ExercicioComNome[]> = {};
      for (const dia of fichaAtual.dias) {
        const { fichaService } = await import('@/services/FichaService');
        const exs = await fichaService.obterExerciciosDoDia(dia.id);
        const exsComNome: ExercicioComNome[] = await Promise.all(
          exs.sort((a, b) => a.ordem - b.ordem).map(async (ex) => {
            const exercicio = await exercicioService.obterPorId(ex.exercicioId);
            return { ...ex, nomeExercicio: exercicio?.nome ?? 'Exercício' };
          })
        );
        mapa[dia.id] = exsComNome;
      }
      setExerciciosPorDia(mapa);
    }
    carregarExercicios();
  }, [fichaAtual]);

  const handleExcluir = () => {
    Alert.alert(
      'Excluir Ficha',
      'Tem certeza? Sessões históricas serão mantidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await excluirFicha(id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const iniciarEdicao = (ex: ExercicioComNome) => {
    setEditandoId(ex.id);
    setEditForm({
      series: String(ex.seriesPlanejadas),
      reps: String(ex.repeticoesAlvo),
      carga: String(ex.cargaSugerida),
      descanso: String(ex.tempoDescanso),
    });
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    const s = parseInt(editForm.series, 10);
    const r = parseInt(editForm.reps, 10);
    const c = parseFloat(editForm.carga);
    const d = parseInt(editForm.descanso, 10);
    if (isNaN(s) || s <= 0) { Alert.alert('Erro', 'Séries inválidas'); return; }
    if (isNaN(r) || r <= 0) { Alert.alert('Erro', 'Repetições inválidas'); return; }
    try {
      setSalvandoEdit(true);
      await editarExercicioNoPlano(editandoId, {
        series: s,
        repeticoesAlvo: r,
        cargaSugerida: isNaN(c) ? 0 : c,
        tempoDescanso: isNaN(d) ? 60 : d,
      });
      setEditandoId(null);
    } catch (e) {
      Alert.alert('Erro', String(e));
    } finally {
      setSalvandoEdit(false);
    }
  };

  const handleRemoverExercicio = (ex: ExercicioComNome) => {
    Alert.alert(
      'Remover Exercício',
      `Remover "${ex.nomeExercicio}" deste dia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await removerExercicio(ex.id);
          },
        },
      ]
    );
  };

  if (carregando || !fichaAtual) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Ficha', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: fichaAtual.nome,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={handleExcluir} style={{ marginRight: 8 }}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Status */}
        <View style={[styles.statusBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {fichaAtual.ativa ? '🟢 Ficha Ativa' : '⚪ Ficha Inativa'}
          </Text>
          <Text style={[styles.diasCount, { color: colors.textSecondary }]}>
            {fichaAtual.dias.length} dia{fichaAtual.dias.length !== 1 ? 's' : ''} de treino
          </Text>
        </View>

        {/* Dias de treino */}
        {fichaAtual.dias.map((dia) => {
          const isExpanded = diaExpandido === dia.id;
          const exsDoDia = exerciciosPorDia[dia.id] ?? [];
          return (
            <View
              key={dia.id}
              style={[styles.diaCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Pressable
                onPress={() => setDiaExpandido(isExpanded ? null : dia.id)}
                style={styles.diaHeader}
              >
                <View style={[styles.diaBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.diaBadgeText, { color: colors.primary }]}>
                    {DIAS_SEMANA[dia.diaDaSemana]}
                  </Text>
                </View>
                <View style={styles.diaInfo}>
                  <Text style={[styles.diaNome, { color: colors.text }]}>{dia.nome}</Text>
                  <Text style={[styles.diaGrupos, { color: colors.textSecondary }]}>
                    {(dia.gruposMuscularesFoco as string[]).join(', ') || 'Geral'}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {isExpanded && (
                <View style={styles.exerciciosList}>
                  {exsDoDia.length === 0 ? (
                    <Text style={[styles.emptyExs, { color: colors.textSecondary }]}>
                      Nenhum exercício adicionado
                    </Text>
                  ) : (
                    exsDoDia.map((ex, idx) => {
                      const isEditing = editandoId === ex.id;
                      return (
                        <View
                          key={ex.id}
                          style={[styles.exRow, { borderTopColor: colors.border }]}
                        >
                          <View style={styles.exMainRow}>
                            <Text style={[styles.exOrdem, { color: colors.textSecondary }]}>
                              {idx + 1}
                            </Text>
                            <View style={styles.exInfo}>
                              <Text style={[styles.exNome, { color: colors.text }]}>
                                {ex.nomeExercicio}
                              </Text>
                              {!isEditing && (
                                <Text style={[styles.exConfig, { color: colors.textSecondary }]}>
                                  {ex.seriesPlanejadas}×{ex.repeticoesAlvo} · {ex.cargaSugerida}kg · {ex.tempoDescanso}s descanso
                                </Text>
                              )}
                            </View>
                            {!isEditing && (
                              <View style={styles.exActions}>
                                <Pressable onPress={() => iniciarEdicao(ex)} hitSlop={8}>
                                  <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                                </Pressable>
                                <Pressable onPress={() => handleRemoverExercicio(ex)} hitSlop={8}>
                                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </Pressable>
                              </View>
                            )}
                          </View>
                          {isEditing && (
                            <View style={styles.editContainer}>
                              <View style={styles.editGrid}>
                                <View style={styles.editItem}>
                                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Séries</Text>
                                  <TextInput
                                    style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={editForm.series}
                                    onChangeText={(t) => setEditForm((p) => ({ ...p, series: t }))}
                                    keyboardType="number-pad"
                                  />
                                </View>
                                <View style={styles.editItem}>
                                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Reps</Text>
                                  <TextInput
                                    style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={editForm.reps}
                                    onChangeText={(t) => setEditForm((p) => ({ ...p, reps: t }))}
                                    keyboardType="number-pad"
                                  />
                                </View>
                                <View style={styles.editItem}>
                                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Carga</Text>
                                  <TextInput
                                    style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={editForm.carga}
                                    onChangeText={(t) => setEditForm((p) => ({ ...p, carga: t }))}
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                                <View style={styles.editItem}>
                                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Desc.(s)</Text>
                                  <TextInput
                                    style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={editForm.descanso}
                                    onChangeText={(t) => setEditForm((p) => ({ ...p, descanso: t }))}
                                    keyboardType="number-pad"
                                  />
                                </View>
                              </View>
                              <View style={styles.editButtons}>
                                <Pressable
                                  onPress={() => setEditandoId(null)}
                                  style={[styles.editBtn, { borderColor: colors.border }]}
                                >
                                  <Text style={[styles.editBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                                </Pressable>
                                <Pressable
                                  onPress={salvarEdicao}
                                  disabled={salvandoEdit}
                                  style={[styles.editBtn, styles.editBtnPrimary, { backgroundColor: colors.primary, opacity: salvandoEdit ? 0.6 : 1 }]}
                                >
                                  <Text style={[styles.editBtnText, { color: '#fff' }]}>
                                    {salvandoEdit ? 'Salvando...' : 'Salvar'}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                  <Pressable
                    onPress={() => router.push(`/exercicio/catalogo?diaId=${dia.id}`)}
                    style={[styles.addExButton, { borderColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={[styles.addExText, { color: colors.primary }]}>
                      Adicionar Exercício
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: { fontSize: 15, fontWeight: '600' },
  diasCount: { fontSize: 13 },
  diaCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  diaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  diaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  diaBadgeText: { fontSize: 13, fontWeight: '700' },
  diaInfo: { flex: 1 },
  diaNome: { fontSize: 16, fontWeight: '600' },
  diaGrupos: { fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  exerciciosList: { paddingHorizontal: 14, paddingBottom: 14 },
  emptyExs: { fontSize: 14, fontStyle: 'italic', paddingVertical: 8 },
  exRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  exMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exOrdem: { fontSize: 14, fontWeight: '700', width: 24 },
  exInfo: { flex: 1 },
  exNome: { fontSize: 15, fontWeight: '500' },
  exConfig: { fontSize: 12, marginTop: 2 },
  exActions: {
    flexDirection: 'row',
    gap: 14,
    paddingLeft: 8,
  },
  editContainer: {
    marginTop: 10,
    paddingLeft: 24,
  },
  editGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editItem: { width: '22%' },
  editLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  editBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editBtnPrimary: {
    borderWidth: 0,
  },
  editBtnText: { fontSize: 14, fontWeight: '600' },
  addExButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addExText: { fontSize: 14, fontWeight: '500' },
});
