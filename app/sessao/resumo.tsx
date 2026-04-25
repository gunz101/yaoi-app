import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { formatarTempo } from '@/hooks/useTimer';
import { sessaoService } from '@/services/SessaoService';
import type { ResumoSessao, RegistroExercicioComDetalhes } from '@/types';

export default function ResumoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [resumo, setResumo] = useState<ResumoSessao | null>(null);
  const [detalhes, setDetalhes] = useState<RegistroExercicioComDetalhes[]>([]);

  useEffect(() => {
    // The resumo data is passed via the last finalized session
    // We load the most recently finalized session
    async function loadResumo() {
      // Get the latest finalized session from the store or DB
      // For simplicity, we'll use the last session data
      const { db } = await import('@/db/client');
      const { sessoesDeTreino } = await import('@/db/schema');
      const { eq, desc } = await import('drizzle-orm');

      const sessions = await db
        .select()
        .from(sessoesDeTreino)
        .where(eq(sessoesDeTreino.status, 'finalizada'))
        .orderBy(desc(sessoesDeTreino.dataModificacao))
        .limit(1);

      if (sessions.length > 0) {
        const sessao = sessions[0];
        const regs = await sessaoService.obterRegistrosComDetalhes(sessao.id);
        setDetalhes(regs);

        let volumeTotal = 0;
        let exerciciosRealizados = 0;
        for (const reg of regs) {
          if (reg.series.length > 0 || reg.status === 'concluido') {
            exerciciosRealizados++;
          }
          for (const s of reg.series) {
            volumeTotal += s.repeticoesRealizadas * s.cargaUtilizada;
          }
        }

        setResumo({
          duracaoTotal: sessao.duracaoTotal ?? 0,
          exerciciosRealizados,
          volumeTotal,
          registros: regs,
        });
      }
    }
    loadResumo();
  }, []);

  if (!resumo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Carregando resumo...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="trophy" size={48} color={colors.success} />
        <Text style={[styles.title, { color: colors.text }]}>Sessão Finalizada!</Text>
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatarTempo(Math.floor(resumo.duracaoTotal))}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duração</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {resumo.exerciciosRealizados}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercícios</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {resumo.volumeTotal.toFixed(0)}kg
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume Total</Text>
        </View>
      </View>

      {/* Exercise details */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercícios</Text>
      {detalhes.map((reg) => (
        <View
          key={reg.id}
          style={[styles.exercicioCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.exercicioHeader}>
            <Ionicons
              name={reg.status === 'concluido' ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={reg.status === 'concluido' ? colors.success : colors.textSecondary}
            />
            <Text style={[styles.exercicioNome, { color: colors.text }]}>{reg.exercicioNome}</Text>
          </View>
          {reg.series.length > 0 && (
            <View style={styles.seriesList}>
              {reg.series.map((s) => (
                <View key={s.id} style={styles.serieRow}>
                  <Text style={[styles.serieNum, { color: colors.textSecondary }]}>
                    Série {s.numero}
                  </Text>
                  <Text style={[styles.serieDetail, { color: colors.text }]}>
                    {s.repeticoesRealizadas} reps × {s.cargaUtilizada}kg
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Done button */}
      <Pressable
        onPress={() => router.replace('/(tabs)/treino')}
        style={[styles.doneButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.doneText}>Voltar ao Treino</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16 },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  exercicioCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  exercicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exercicioNome: { fontSize: 16, fontWeight: '600', flex: 1 },
  seriesList: { marginTop: 10, marginLeft: 30 },
  serieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  serieNum: { fontSize: 14 },
  serieDetail: { fontSize: 14, fontWeight: '500' },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
