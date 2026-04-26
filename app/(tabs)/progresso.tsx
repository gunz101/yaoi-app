import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/utils/theme';
import { useProgresso } from '@/hooks/useProgresso';

const screenWidth = Dimensions.get('window').width;

function formatarData(data: Date | number): string {
  const d = data instanceof Date ? data : new Date(data);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatarDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function ProgressoScreen() {
  const { colors } = useTheme();
  const {
    exerciciosDisponiveis,
    exercicioSelecionado,
    dadosCarga,
    dadosVolume,
    recordePessoal,
    estatisticas,
    carregando,
    carregarExercicios,
    selecionarExercicio,
    carregarEstatisticas,
  } = useProgresso();

  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    carregarExercicios();
    carregarEstatisticas();
  }, [carregarExercicios, carregarEstatisticas]);

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => colors.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
    labelColor: () => colors.textSecondary,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
    propsForBackgroundLines: { stroke: colors.border },
  };

  const nomeExercicioSelecionado =
    exerciciosDisponiveis.find((e) => e.id === exercicioSelecionado)?.nome ?? '';

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="trending-up-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem dados de progresso</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Complete treinos para acompanhar sua evolução
      </Text>
    </View>
  );

  if (exerciciosDisponiveis.length === 0 && !carregando) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderEmpty()}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Estatísticas resumidas */}
      {estatisticas && (
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
      )}

      {/* Seletor de exercício */}
      <TouchableOpacity
        style={[styles.selectorBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowSelector(!showSelector)}
      >
        <Ionicons name="barbell-outline" size={18} color={colors.primary} />
        <Text style={[styles.selectorText, { color: colors.text }]} numberOfLines={1}>
          {nomeExercicioSelecionado || 'Selecionar exercício'}
        </Text>
        <Ionicons
          name={showSelector ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {showSelector && (
        <View style={[styles.selectorList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView style={styles.selectorScroll} nestedScrollEnabled>
            {exerciciosDisponiveis.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                style={[
                  styles.selectorItem,
                  exercicioSelecionado === ex.id && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => {
                  selecionarExercicio(ex.id);
                  setShowSelector(false);
                }}
              >
                <Text
                  style={[
                    styles.selectorItemText,
                    { color: exercicioSelecionado === ex.id ? colors.primary : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {ex.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {exercicioSelecionado && (
        <>
          {/* Recorde pessoal */}
          {recordePessoal !== null && (
            <View style={[styles.recordeCard, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
              <Ionicons name="trophy" size={24} color={colors.warning} />
              <View style={styles.recordeInfo}>
                <Text style={[styles.recordeLabel, { color: colors.textSecondary }]}>
                  Recorde Pessoal
                </Text>
                <Text style={[styles.recordeValue, { color: colors.text }]}>
                  {recordePessoal} kg
                </Text>
              </View>
            </View>
          )}

          {/* Gráfico de evolução de carga */}
          {dadosCarga.length >= 2 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Evolução de Carga (kg)</Text>
              <LineChart
                data={{
                  labels: dadosCarga.slice(-7).map((p) => formatarData(p.data)),
                  datasets: [{ data: dadosCarga.slice(-7).map((p) => p.cargaMaxima) }],
                }}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>
          )}
          {dadosCarga.length === 1 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Evolução de Carga (kg)</Text>
              <Text style={[styles.chartHint, { color: colors.textSecondary }]}>
                Precisa de pelo menos 2 sessões para gerar o gráfico
              </Text>
            </View>
          )}

          {/* Gráfico de volume */}
          {dadosVolume.length >= 2 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Volume por Sessão</Text>
              <LineChart
                data={{
                  labels: dadosVolume.slice(-7).map((p) => formatarData(p.data)),
                  datasets: [{ data: dadosVolume.slice(-7).map((p) => p.volume) }],
                }}
                width={screenWidth - 64}
                height={200}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) =>
                    colors.success + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.success },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}
        </>
      )}

      {!exercicioSelecionado && !showSelector && (
        <View style={styles.hintContainer}>
          <Ionicons name="arrow-up-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Selecione um exercício acima para ver seu progresso
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
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
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  selectorText: { flex: 1, fontSize: 15, fontWeight: '600' },
  selectorList: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectorScroll: { maxHeight: 200 },
  selectorItem: { paddingHorizontal: 16, paddingVertical: 12 },
  selectorItemText: { fontSize: 14 },
  recordeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  recordeInfo: {},
  recordeLabel: { fontSize: 12 },
  recordeValue: { fontSize: 22, fontWeight: '700' },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  chartTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  chartHint: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  chart: { borderRadius: 12 },
  hintContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  hintText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  emptyContainer: { alignItems: 'center', paddingTop: 120 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});
