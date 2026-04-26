import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/utils/theme';
import { useHistorico } from '@/hooks/useHistorico';
import type { SessaoDeTreino, Periodo } from '@/types';

type FiltroTipo = 'semana' | 'mes' | 'todos';

function formatarData(data: Date | number): string {
  const d = data instanceof Date ? data : new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatarDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function getPeriodo(tipo: FiltroTipo): Periodo | undefined {
  const agora = new Date();
  if (tipo === 'todos') return undefined;
  if (tipo === 'semana') {
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - 7);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: agora };
  }
  // mes
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  return { inicio, fim: agora };
}

export default function HistoricoScreen() {
  const { colors } = useTheme();
  const {
    sessoes,
    sessaoSelecionada,
    estatisticas,
    carregando,
    listarSessoes,
    selecionarSessao,
    fecharDetalhes,
    deletarSessao,
    carregarEstatisticas,
  } = useHistorico();

  const [filtro, setFiltro] = useState<FiltroTipo>('mes');

  const handleDeletarSessao = useCallback((sessaoId: string) => {
    Alert.alert(
      'Excluir registro?',
      'Tem certeza? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deletarSessao(sessaoId) },
      ]
    );
  }, [deletarSessao]);

  const carregar = useCallback(() => {
    const periodo = getPeriodo(filtro);
    listarSessoes(periodo ? { periodo } : undefined);
    carregarEstatisticas();
  }, [filtro, listarSessoes, carregarEstatisticas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const renderSessaoCard = useCallback(
    ({ item }: { item: SessaoDeTreino }) => {
      const data = item.dataInicio instanceof Date ? item.dataInicio : new Date(item.dataInicio);
      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => selecionarSessao(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardDateRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.cardDate, { color: colors.text }]}>{formatarData(data)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
          <Text style={[styles.cardFicha, { color: colors.primary }]}>
            {item.fichaNome || 'Treino livre'}
          </Text>
          <View style={styles.cardStats}>
            <View style={styles.cardStat}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.cardStatText, { color: colors.textSecondary }]}>
                {formatarDuracao(item.duracaoTotal ?? 0)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, selecionarSessao]
  );

  const renderFiltros = () => (
    <View style={styles.filtrosRow}>
      {(['semana', 'mes', 'todos'] as FiltroTipo[]).map((f) => (
        <TouchableOpacity
          key={f}
          style={[
            styles.filtroBtn,
            {
              backgroundColor: filtro === f ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFiltro(f)}
        >
          <Text
            style={[
              styles.filtroBtnText,
              { color: filtro === f ? '#fff' : colors.textSecondary },
            ]}
          >
            {f === 'semana' ? 'Semana' : f === 'mes' ? 'Mês' : 'Todos'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEstatisticas = () => {
    if (!estatisticas) return null;
    return (
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {estatisticas.totalSessoesMes}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessões/mês</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {estatisticas.frequenciaSemanal}x
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Freq. semanal</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatarDuracao(estatisticas.tempoTotalTreino)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tempo total</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="barbell-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma sessão encontrada</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Complete um treino para ver seu histórico aqui
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderEstatisticas()}
      {renderFiltros()}

      <View style={styles.listContainer}>
        <FlashList
          data={sessoes}
          renderItem={renderSessaoCard}
          estimatedItemSize={100}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          onRefresh={carregar}
          refreshing={carregando}
        />
      </View>

      {/* Modal de detalhes */}
      <Modal visible={!!sessaoSelecionada} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Detalhes da Sessão</Text>
              <TouchableOpacity onPress={fecharDetalhes}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {sessaoSelecionada && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.modalInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.modalFicha, { color: colors.primary }]}>
                    {sessaoSelecionada.sessao.fichaNome || 'Treino livre'}
                  </Text>
                  <Text style={[styles.modalDate, { color: colors.textSecondary }]}>
                    {formatarData(sessaoSelecionada.sessao.dataInicio)} •{' '}
                    {formatarDuracao(sessaoSelecionada.sessao.duracaoTotal ?? 0)}
                  </Text>
                </View>

                {sessaoSelecionada.registros.map((reg) => (
                  <View
                    key={reg.id}
                    style={[styles.exercicioCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.exercicioNome, { color: colors.text }]}>
                      {reg.exercicioNome}
                    </Text>
                    {reg.series.map((s, i) => (
                      <View key={i} style={styles.serieRow}>
                        <Text style={[styles.serieNum, { color: colors.textSecondary }]}>
                          Série {s.numero}
                        </Text>
                        <Text style={[styles.serieDetail, { color: colors.text }]}>
                          {s.repeticoesRealizadas} reps × {s.cargaUtilizada} kg
                        </Text>
                      </View>
                    ))}
                    {reg.series.length === 0 && (
                      <Text style={[styles.semSeries, { color: colors.textSecondary }]}>
                        Sem séries registradas
                      </Text>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.deletarSessaoBtn, { borderColor: colors.danger }]}
                  onPress={() => handleDeletarSessao(sessaoSelecionada.sessao.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.deletarSessaoBtnText, { color: colors.danger }]}>Excluir Sessão</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32 },
  filtrosRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  filtroBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filtroBtnText: { fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 14, fontWeight: '600' },
  cardFicha: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  cardStats: { flexDirection: 'row', marginTop: 8, gap: 16 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16 },
  modalInfoCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  modalFicha: { fontSize: 16, fontWeight: '700' },
  modalDate: { fontSize: 13, marginTop: 4 },
  exercicioCard: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  exercicioNome: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  serieRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  serieNum: { fontSize: 13 },
  serieDetail: { fontSize: 13, fontWeight: '500' },
  semSeries: { fontSize: 13, fontStyle: 'italic' },
  deletarSessaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  deletarSessaoBtnText: { fontSize: 15, fontWeight: '600' },
});
