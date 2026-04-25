import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Vibration,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { useSessao } from '@/hooks/useSessao';
import { useTimer, formatarTempo } from '@/hooks/useTimer';
import type { RegistroExercicioComDetalhes, ExercicioNoPlano } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COOLDOWN_MS = 2000;

function formatDescanso(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function SessaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const sessao = useSessao();
  const timer = useTimer();
  const scrollRef = useRef<ScrollView>(null);

  const [configs, setConfigs] = useState<Record<string, ExercicioNoPlano>>({});
  const [registrando, setRegistrando] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cooldownId, setCooldownId] = useState<string | null>(null);

  // Per-exercise overrides: last used values become the new default
  const [overrides, setOverrides] = useState<Record<string, { reps: number; carga: number; descanso: number }>>({});

  /** Get effective values for an exercise: override > last serie > config > defaults */
  const getEffective = useCallback((exercicioId: string, reg: RegistroExercicioComDetalhes) => {
    const ov = overrides[exercicioId];
    const config = configs[exercicioId];
    const lastSerie = reg.series[reg.series.length - 1];
    return {
      reps: ov?.reps ?? lastSerie?.repeticoesRealizadas ?? config?.repeticoesAlvo ?? 12,
      carga: ov?.carga ?? lastSerie?.cargaUtilizada ?? config?.cargaSugerida ?? 0,
      descanso: ov?.descanso ?? config?.tempoDescanso ?? 60,
      seriesPlan: config?.seriesPlanejadas ?? 3,
    };
  }, [overrides, configs]);

  // Edit modal
  const [editExercicioId, setEditExercicioId] = useState<string | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editCarga, setEditCarga] = useState('');

  useEffect(() => {
    if (id) sessao.carregarSessao(id);
  }, [id]);

  useEffect(() => {
    async function loadConfigs() {
      if (!sessao.sessaoAtiva?.diaId || sessao.exercicios.length === 0) return;
      const diaId = sessao.sessaoAtiva.diaId;
      const c: Record<string, ExercicioNoPlano> = {};
      for (const ex of sessao.exercicios) {
        if (ex.exercicioId && !ex.ehAvulso) {
          const config = await sessao.obterConfigPlano(diaId, ex.exercicioId);
          if (config) c[ex.exercicioId] = config;
        }
      }
      setConfigs(c);
    }
    loadConfigs();
  }, [sessao.sessaoAtiva?.diaId, sessao.exercicios.length]);

  // Auto-expand first non-completed exercise
  useEffect(() => {
    if (!expandedId) {
      const first = sessao.exercicios.find((r) => r.status !== 'concluido');
      if (first) setExpandedId(first.id);
    }
  }, [sessao.exercicios]);

  const handleToggleExpand = (regId: string) => {
    setExpandedId(expandedId === regId ? null : regId);
  };

  // Desmarcar concluído
  const handleDesmarcar = useCallback(async (reg: RegistroExercicioComDetalhes) => {
    if (!reg.exercicioId) return;
    // Revert to em_andamento via the service
    try {
      const { db } = await import('@/db/client');
      const { registrosExercicio } = await import('@/db/schema');
      const { eq, and } = await import('drizzle-orm');
      await db
        .update(registrosExercicio)
        .set({ status: 'em_andamento' })
        .where(
          and(
            eq(registrosExercicio.sessaoId, sessao.sessaoAtiva?.id ?? ''),
            eq(registrosExercicio.exercicioId, reg.exercicioId)
          )
        );
      await sessao.recarregarExercicios();
      setExpandedId(reg.id);
    } catch {
      Alert.alert('Erro', 'Falha ao desmarcar exercício');
    }
  }, [sessao]);

  // One-tap with cooldown
  const handleFeitoTap = useCallback(
    async (reg: RegistroExercicioComDetalhes) => {
      if (!reg.exercicioId || registrando || cooldownId === reg.exercicioId) return;
      const eff = getEffective(reg.exercicioId, reg);

      try {
        setRegistrando(true);
        setCooldownId(reg.exercicioId);
        Vibration.vibrate(50);
        await sessao.registrarSerie(reg.exercicioId, eff.reps, eff.carga, eff.descanso);

        // Save as override so next tap uses same values
        setOverrides((prev) => ({
          ...prev,
          [reg.exercicioId!]: { reps: eff.reps, carga: eff.carga, descanso: eff.descanso },
        }));

        const updatedReg = sessao.exercicios.find((r) => r.exercicioId === reg.exercicioId);
        const seriesFeitas = (updatedReg?.series.length ?? reg.series.length) + 1;
        if (seriesFeitas >= eff.seriesPlan) {
          await sessao.marcarExercicioConcluido(reg.exercicioId);
          setExpandedId(null);
        }

        setTimeout(() => setCooldownId(null), COOLDOWN_MS);
      } catch {
        Alert.alert('Erro', 'Falha ao registrar série');
        setCooldownId(null);
      } finally {
        setRegistrando(false);
      }
    },
    [configs, registrando, cooldownId, sessao, getEffective, overrides]
  );

  const handleLongPress = useCallback(
    (reg: RegistroExercicioComDetalhes) => {
      if (!reg.exercicioId) return;
      const eff = getEffective(reg.exercicioId, reg);
      setEditExercicioId(reg.exercicioId);
      setEditReps(String(eff.reps));
      setEditCarga(String(eff.carga));
      Vibration.vibrate(30);
    },
    [getEffective]
  );

  const handleEditConfirm = useCallback(async () => {
    if (!editExercicioId) return;
    const r = parseInt(editReps, 10);
    const c = parseFloat(editCarga);
    if (isNaN(r) || r <= 0) { Alert.alert('Erro', 'Informe as repetições'); return; }
    if (isNaN(c) || c < 0) { Alert.alert('Erro', 'Informe a carga'); return; }
    const config = configs[editExercicioId];
    const currentOverride = overrides[editExercicioId];
    const descanso = currentOverride?.descanso ?? config?.tempoDescanso ?? 60;
    const seriesPlan = config?.seriesPlanejadas ?? 3;

    // Save override with new values
    setOverrides((prev) => ({
      ...prev,
      [editExercicioId]: { reps: r, carga: c, descanso },
    }));

    try {
      setRegistrando(true);
      Vibration.vibrate(50);
      await sessao.registrarSerie(editExercicioId, r, c, descanso);
      const updatedReg = sessao.exercicios.find((ex) => ex.exercicioId === editExercicioId);
      const seriesFeitas = (updatedReg?.series.length ?? 0) + 1;
      if (seriesFeitas >= seriesPlan) {
        await sessao.marcarExercicioConcluido(editExercicioId);
      }
    } catch { Alert.alert('Erro', 'Falha ao registrar série');
    } finally { setRegistrando(false); setEditExercicioId(null); }
  }, [editExercicioId, editReps, editCarga, configs, overrides, sessao]);

  function handleFinalizar() {
    Alert.alert('Finalizar Sessão', 'Deseja finalizar a sessão de treino?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', style: 'destructive', onPress: async () => {
        try { await sessao.finalizarSessao(); router.replace('/sessao/resumo'); }
        catch { Alert.alert('Erro', 'Falha ao finalizar sessão'); }
      }},
    ]);
  }

  if (sessao.carregando && sessao.exercicios.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.headerTime, { color: colors.text }]}>{timer.cronometroFormatado}</Text>
          <Pressable onPress={timer.pausado ? sessao.retomarCronometro : sessao.pausarCronometro} hitSlop={8} style={styles.pauseBtn}>
            <Ionicons name={timer.pausado ? 'play-circle' : 'pause-circle'} size={26} color={colors.primary} />
          </Pressable>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Rest Timer */}
      {timer.descansoAtivo && timer.descansoRestante !== null && (
        <View style={[styles.restBanner, { backgroundColor: colors.gradientStart, borderColor: colors.gradientEnd }]}>
          <Text style={styles.restLabel}>⏱️ DESCANSO</Text>
          <Text style={styles.restCountdown}>{formatDescanso(timer.descansoRestante)}</Text>
          <Pressable onPress={sessao.pularDescanso} style={styles.restSkipBtn}>
            <Text style={styles.restSkipText}>Pular</Text>
          </Pressable>
        </View>
      )}

      {/* Exercise List */}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sessao.exercicios.map((reg) => {
          const config = reg.exercicioId ? configs[reg.exercicioId] : null;
          const isExpanded = expandedId === reg.id;
          const isCompleted = reg.status === 'concluido';
          const seriesPlan = config?.seriesPlanejadas ?? 3;
          const seriesFeitas = reg.series.length;
          const lastSerie = reg.series[reg.series.length - 1];
          const isCooling = cooldownId === reg.exercicioId;

          // ── Completed card (tappable to undo) ──
          if (isCompleted && !isExpanded) {
            return (
              <Pressable
                key={reg.id}
                onPress={() => handleToggleExpand(reg.id)}
                style={[styles.cardCompleted, { backgroundColor: colors.cardCompleted, borderColor: colors.cardCompletedBorder }]}
              >
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={[styles.completedName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {reg.exercicioNome}
                </Text>
                <Text style={[styles.completedCount, { color: colors.success }]}>
                  {seriesFeitas}/{seriesPlan}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </Pressable>
            );
          }

          // ── Collapsed pending card (tappable to expand) ──
          if (!isExpanded) {
            return (
              <Pressable
                key={reg.id}
                onPress={() => handleToggleExpand(reg.id)}
                style={[styles.cardPending, { backgroundColor: colors.cardPending, borderColor: colors.border }]}
              >
                {seriesFeitas > 0 ? (
                  <Ionicons name="ellipse" size={18} color={colors.warning} />
                ) : (
                  <Ionicons name="ellipse-outline" size={18} color={colors.textSecondary} />
                )}
                <Text style={[styles.pendingName, { color: colors.text }]} numberOfLines={1}>
                  {reg.exercicioNome}
                </Text>
                <Text style={[styles.pendingCount, { color: colors.textSecondary }]}>
                  {seriesFeitas}/{seriesPlan}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </Pressable>
            );
          }

          const grupo = reg.exercicio?.grupoMuscularPrincipal ?? '';
          const equipamento = reg.exercicio?.equipamento ?? '';
          const eff = reg.exercicioId ? getEffective(reg.exercicioId, reg) : { reps: 12, carga: 0, descanso: 60, seriesPlan: 3 };

          return (
            <View key={reg.id} style={[styles.cardActive, { backgroundColor: colors.cardActive, borderColor: colors.cardActiveBorder }]}>
              {/* Header row — tappable to collapse */}
              <Pressable onPress={() => handleToggleExpand(reg.id)} style={styles.activeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeName, { color: colors.text }]}>
                    🏋️ {reg.exercicioNome}
                  </Text>
                  {(grupo || equipamento) && (
                    <Text style={[styles.activeMeta, { color: colors.textSecondary }]}>
                      {[grupo, equipamento].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
              </Pressable>

              {/* Series info — prominent */}
              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{seriesFeitas}/{eff.seriesPlan}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Séries</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{eff.reps}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reps</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{eff.carga}kg</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peso</Text>
                </View>
              </View>

              {/* Dots progress */}
              <View style={styles.dotsRow}>
                {Array.from({ length: seriesPlan }).map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i < seriesFeitas ? colors.dotFilled : colors.dotEmpty }]} />
                ))}
              </View>

              {/* Last serie */}
              {lastSerie && (
                <Text style={[styles.lastSerie, { color: colors.textSecondary }]}>
                  Última série: {lastSerie.repeticoesRealizadas} reps × {lastSerie.cargaUtilizada}kg
                </Text>
              )}

              {/* Feito button — subtle, with cooldown */}
              {!isCompleted && (
                <Pressable
                  onPress={() => handleFeitoTap(reg)}
                  onLongPress={() => handleLongPress(reg)}
                  delayLongPress={400}
                  disabled={registrando || isCooling}
                  style={({ pressed }) => [
                    styles.feitoBtn,
                    {
                      backgroundColor: isCooling
                        ? colors.border
                        : pressed ? colors.successDark : colors.success,
                      opacity: isCooling ? 0.5 : 1,
                    },
                  ]}
                >
                  {registrando ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : isCooling ? (
                    <Text style={styles.feitoText}>Aguarde...</Text>
                  ) : (
                    <Text style={styles.feitoText}>✓ Série feita</Text>
                  )}
                </Pressable>
              )}
              {!isCompleted && (
                <Text style={[styles.longPressHint, { color: colors.textSecondary }]}>
                  segure para editar reps/carga
                </Text>
              )}

              {/* Undo button for completed */}
              {isCompleted && (
                <Pressable
                  onPress={() => handleDesmarcar(reg)}
                  style={[styles.undoBtn, { borderColor: colors.warning }]}
                >
                  <Ionicons name="arrow-undo" size={16} color={colors.warning} />
                  <Text style={[styles.undoText, { color: colors.warning }]}>Desmarcar concluído</Text>
                </Pressable>
              )}

              {/* Series history */}
              {reg.series.length > 0 && (
                <View style={[styles.seriesHistory, { borderTopColor: colors.border }]}>
                  {reg.series.map((s) => (
                    <View key={s.id} style={styles.serieHistoryRow}>
                      <Text style={[styles.serieHistoryNum, { color: colors.textSecondary }]}>#{s.numero}</Text>
                      <Text style={[styles.serieHistoryDetail, { color: colors.text }]}>
                        {s.repeticoesRealizadas} reps × {s.cargaUtilizada}kg
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Finalizar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
        <Pressable onPress={handleFinalizar} style={({ pressed }) => [styles.finalizarBtn, { backgroundColor: pressed ? '#dc2626' : colors.danger }]}>
          <Ionicons name="flag" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.finalizarText}>Finalizar Sessão</Text>
        </Pressable>
      </View>

      {/* Edit Modal */}
      <Modal visible={editExercicioId !== null} transparent animationType="fade" onRequestClose={() => setEditExercicioId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditExercicioId(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Série</Text>
            <View style={styles.modalInputRow}>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Repetições</Text>
                <TextInput style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={editReps} onChangeText={setEditReps} keyboardType="number-pad" selectTextOnFocus />
              </View>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Carga (kg)</Text>
                <TextInput style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} value={editCarga} onChangeText={setEditCarga} keyboardType="decimal-pad" selectTextOnFocus />
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditExercicioId(null)} style={[styles.modalCancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleEditConfirm} disabled={registrando} style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}>
                {registrando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Registrar</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 56, borderBottomWidth: 1 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTime: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pauseBtn: { marginLeft: 8 },
  restBanner: { alignItems: 'center', paddingVertical: 20, borderRadius: 24, marginHorizontal: 16, marginTop: 12, borderWidth: 1 },
  restLabel: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1, opacity: 0.9 },
  restCountdown: { color: '#fff', fontSize: 52, fontWeight: '800', fontVariant: ['tabular-nums'], marginVertical: 2 },
  restSkipBtn: { paddingHorizontal: 28, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 6 },
  restSkipText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Completed
  cardCompleted: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderWidth: 1, marginBottom: 8, gap: 10 },
  completedName: { flex: 1, fontSize: 15, fontWeight: '500' },
  completedCount: { fontSize: 14, fontWeight: '700' },

  // Pending
  cardPending: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderWidth: 1, marginBottom: 8, gap: 10 },
  pendingName: { flex: 1, fontSize: 15, fontWeight: '500' },
  pendingCount: { fontSize: 14, fontWeight: '600' },

  // Active
  cardActive: { borderRadius: 24, borderWidth: 2, padding: 20, marginBottom: 12 },
  activeHeader: { flexDirection: 'row', alignItems: 'center' },
  activeName: { fontSize: 20, fontWeight: '700' },
  activeMeta: { fontSize: 14, marginTop: 2 },

  // Stats row
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 32 },

  // Dots
  dotsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8, justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },

  // Last serie
  lastSerie: { fontSize: 13, marginTop: 10, textAlign: 'center' },

  // Feito — more subtle
  feitoBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  feitoText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  longPressHint: { textAlign: 'center', fontSize: 11, marginTop: 4 },

  // Undo
  undoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  undoText: { fontSize: 14, fontWeight: '600' },

  // Series history
  seriesHistory: { marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  serieHistoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 10 },
  serieHistoryNum: { fontSize: 13, fontWeight: '600', width: 28 },
  serieHistoryDetail: { fontSize: 14, fontWeight: '500' },

  // Bottom
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 34, paddingTop: 12 },
  finalizarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 22 },
  finalizarText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: SCREEN_WIDTH - 48, borderRadius: 24, borderWidth: 1, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalInputRow: { flexDirection: 'row', gap: 14 },
  modalInputGroup: { flex: 1 },
  modalLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
