import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/utils/theme';
import { usePerfil } from '@/hooks/usePerfil';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

const PARTES_PADRAO = [
  'Braço',
  'Antebraço',
  'Peito',
  'Cintura',
  'Quadril',
  'Coxa',
  'Panturrilha',
];

function formatarData(data: Date | number): string {
  const d = data instanceof Date ? data : new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarDataCompleta(data: Date | number): string {
  const d = data instanceof Date ? data : new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatarDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function PerfilScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    pesoAtual,
    historicoPesos,
    medidas,
    partesDoCorpo,
    estatisticas,
    carregando,
    carregarPesoAtual,
    carregarHistoricoPesos,
    registrarPeso,
    deletarPeso,
    carregarMedidas,
    registrarMedida,
    deletarMedida,
    carregarPartesDoCorpo,
    carregarEstatisticas,
  } = usePerfil();

  const [showPesoModal, setShowPesoModal] = useState(false);
  const [showMedidaModal, setShowMedidaModal] = useState(false);
  const [pesoInput, setPesoInput] = useState('');
  const [notaInput, setNotaInput] = useState('');
  const [medidaInput, setMedidaInput] = useState('');
  const [parteSelecionada, setParteSelecionada] = useState<string | null>(null);
  const [parteCustomInput, setParteCustomInput] = useState('');
  const [activeTab, setActiveTab] = useState<'resumo' | 'historico'>('resumo');

  useEffect(() => {
    carregarPesoAtual();
    carregarHistoricoPesos();
    carregarPartesDoCorpo();
    carregarEstatisticas();
  }, [carregarPesoAtual, carregarHistoricoPesos, carregarPartesDoCorpo, carregarEstatisticas]);

  const handleRegistrarPeso = useCallback(async () => {
    const valor = parseFloat(pesoInput.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) return;
    await registrarPeso(valor, notaInput || undefined);
    setPesoInput('');
    setNotaInput('');
    setShowPesoModal(false);
  }, [pesoInput, notaInput, registrarPeso]);

  const handleDeletarPeso = useCallback((id: string) => {
    Alert.alert(
      'Excluir registro?',
      'Tem certeza? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deletarPeso(id) },
      ]
    );
  }, [deletarPeso]);

  const handleDeletarMedida = useCallback((id: string) => {
    Alert.alert(
      'Excluir registro?',
      'Tem certeza? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deletarMedida(id, parteSelecionada ?? undefined) },
      ]
    );
  }, [deletarMedida, parteSelecionada]);

  const handleRegistrarMedida = useCallback(async () => {
    const valor = parseFloat(medidaInput.replace(',', '.'));
    const parte = parteSelecionada === '__custom__' ? parteCustomInput.trim() : parteSelecionada;
    if (isNaN(valor) || valor <= 0 || !parte) return;
    const ehCustomizada = !PARTES_PADRAO.includes(parte);
    await registrarMedida(parte, valor, ehCustomizada);
    setMedidaInput('');
    setParteSelecionada(null);
    setParteCustomInput('');
    setShowMedidaModal(false);
  }, [medidaInput, parteSelecionada, parteCustomInput, registrarMedida]);

  const handleSelecionarParte = useCallback(
    (parte: string) => {
      setParteSelecionada(parte);
      carregarMedidas(parte);
    },
    [carregarMedidas]
  );

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

  // Peso data for chart (reversed to chronological order, last 10)
  const pesosParaGrafico = [...historicoPesos].reverse().slice(-10);

  // All parts: standard + registered custom
  const todasPartes = [...new Set([...PARTES_PADRAO, ...partesDoCorpo])];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Sub-tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'resumo' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('resumo')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'resumo' ? colors.primary : colors.textSecondary }]}>Resumo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'historico' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('historico')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'historico' ? colors.primary : colors.textSecondary }]}>Histórico</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push('/configuracoes')} style={{ padding: 4 }}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {activeTab === 'historico' ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {/* Histórico de pesos */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Registros de Peso</Text>
          {historicoPesos.length === 0 ? (
            <View style={[styles.emptyMedidas, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="scale-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyMedidasText, { color: colors.textSecondary }]}>Nenhum peso registrado</Text>
            </View>
          ) : (
            historicoPesos.map((p) => (
              <View key={p.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyValue, { color: colors.text }]}>{p.peso} kg</Text>
                  {p.nota && <Text style={[styles.historyNote, { color: colors.textSecondary }]}>{p.nota}</Text>}
                </View>
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{formatarDataCompleta(p.data)}</Text>
                <TouchableOpacity onPress={() => handleDeletarPeso(p.id)} style={styles.trashBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Histórico de medidas por parte */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Medidas Corporais</Text>
          {todasPartes.length === 0 ? (
            <View style={[styles.emptyMedidas, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="body-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyMedidasText, { color: colors.textSecondary }]}>Nenhuma medida registrada</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {todasPartes.map((parte) => (
                <TouchableOpacity
                  key={parte}
                  style={[styles.parteChip, { backgroundColor: parteSelecionada === parte ? colors.primary : colors.card, borderColor: colors.border }]}
                  onPress={() => { setParteSelecionada(parte); carregarMedidas(parte); }}
                >
                  <Text style={[styles.parteChipText, { color: parteSelecionada === parte ? '#fff' : colors.text }]}>{parte}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {parteSelecionada && parteSelecionada !== '__custom__' && medidas.length > 0 && (
            medidas.map((m) => (
              <View key={m.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.historyValue, { color: colors.text }]}>{m.valor} cm</Text>
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{formatarDataCompleta(m.data)}</Text>
                <TouchableOpacity onPress={() => handleDeletarMedida(m.id)} style={styles.trashBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))
          )}
          {parteSelecionada && parteSelecionada !== '__custom__' && medidas.length === 0 && (
            <View style={[styles.emptyMedidas, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyMedidasText, { color: colors.textSecondary }]}>Nenhuma medida para {parteSelecionada}</Text>
            </View>
          )}
        </View>
      ) : (
      <>

      {/* Peso corporal atual */}
      <View style={[styles.pesoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.pesoHeader}>
          <View>
            <Text style={[styles.pesoLabel, { color: colors.textSecondary }]}>Peso Atual</Text>
            <Text style={[styles.pesoValue, { color: colors.text }]}>
              {pesoAtual ? `${pesoAtual.peso} kg` : '— kg'}
            </Text>
            {pesoAtual && (
              <Text style={[styles.pesoDate, { color: colors.textSecondary }]}>
                {formatarDataCompleta(pesoAtual.data)}
                {pesoAtual.nota ? ` • ${pesoAtual.nota}` : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.registrarBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowPesoModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.registrarBtnText}>Registrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gráfico de peso */}
      {pesosParaGrafico.length >= 2 && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Evolução do Peso</Text>
          <LineChart
            data={{
              labels: pesosParaGrafico.map((p) => formatarData(p.data)),
              datasets: [{ data: pesosParaGrafico.map((p) => p.peso) }],
            }}
            width={screenWidth - 64}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Estatísticas rápidas */}
      {estatisticas && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {estatisticas.totalSessoesMes}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessões/mês</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="repeat-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {estatisticas.frequenciaSemanal}x
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Freq. semanal</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatarDuracao(estatisticas.tempoTotalTreino)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tempo total</Text>
          </View>
        </View>
      )}

      {/* Medidas corporais */}
      <View style={styles.medidasSection}>
        <View style={styles.medidasHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medidas Corporais</Text>
          <TouchableOpacity
            style={[styles.addMedidaBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => setShowMedidaModal(true)}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.addMedidaBtnText, { color: colors.primary }]}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {/* Partes do corpo como chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partesScroll}>
          {todasPartes.map((parte) => (
            <TouchableOpacity
              key={parte}
              style={[
                styles.parteChip,
                {
                  backgroundColor: parteSelecionada === parte ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleSelecionarParte(parte)}
            >
              <Text
                style={[
                  styles.parteChipText,
                  { color: parteSelecionada === parte ? '#fff' : colors.text },
                ]}
              >
                {parte}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Medidas da parte selecionada */}
        {parteSelecionada && parteSelecionada !== '__custom__' && medidas.length > 0 && (
          <View style={[styles.medidasList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.medidasListTitle, { color: colors.text }]}>
              {parteSelecionada}
            </Text>
            {medidas.slice(0, 10).map((m) => (
              <View key={m.id} style={[styles.medidaRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.medidaData, { color: colors.textSecondary }]}>
                  {formatarDataCompleta(m.data)}
                </Text>
                <Text style={[styles.medidaValor, { color: colors.text }]}>{m.valor} cm</Text>
              </View>
            ))}
          </View>
        )}

        {parteSelecionada && parteSelecionada !== '__custom__' && medidas.length === 0 && (
          <View style={[styles.emptyMedidas, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="body-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyMedidasText, { color: colors.textSecondary }]}>
              Nenhuma medida registrada para {parteSelecionada}
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
      </>
      )}

      {/* Modal registrar peso */}
      <Modal visible={showPesoModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Registrar Peso</Text>
              <TouchableOpacity onPress={() => setShowPesoModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Peso (kg)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={pesoInput}
                onChangeText={setPesoInput}
                keyboardType="decimal-pad"
                placeholder="Ex: 75.5"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                Nota (opcional)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={notaInput}
                onChangeText={setNotaInput}
                placeholder="Ex: após jejum, pós-treino"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.salvarBtn, { backgroundColor: colors.primary }]}
                onPress={handleRegistrarPeso}
              >
                <Text style={styles.salvarBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal registrar medida */}
      <Modal visible={showMedidaModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Registrar Medida</Text>
              <TouchableOpacity onPress={() => setShowMedidaModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Parte do corpo</Text>
              <View style={styles.partesGrid}>
                {PARTES_PADRAO.map((parte) => (
                  <TouchableOpacity
                    key={parte}
                    style={[
                      styles.parteOption,
                      {
                        backgroundColor: parteSelecionada === parte ? colors.primary : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setParteSelecionada(parte)}
                  >
                    <Text
                      style={{
                        color: parteSelecionada === parte ? '#fff' : colors.text,
                        fontSize: 13,
                        fontWeight: '500',
                      }}
                    >
                      {parte}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.parteOption,
                    {
                      backgroundColor: parteSelecionada === '__custom__' ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setParteSelecionada('__custom__')}
                >
                  <Text
                    style={{
                      color: parteSelecionada === '__custom__' ? '#fff' : colors.text,
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    + Outra
                  </Text>
                </TouchableOpacity>
              </View>

              {parteSelecionada === '__custom__' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                    Nome da parte
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={parteCustomInput}
                    onChangeText={setParteCustomInput}
                    placeholder="Ex: Pescoço"
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                Valor (cm)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={medidaInput}
                onChangeText={setMedidaInput}
                keyboardType="decimal-pad"
                placeholder="Ex: 35.0"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.salvarBtn, { backgroundColor: colors.primary }]}
                onPress={handleRegistrarMedida}
              >
                <Text style={styles.salvarBtnText}>Salvar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 16 },
  tabBtn: { paddingBottom: 10, paddingHorizontal: 4 },
  tabText: { fontSize: 16, fontWeight: '700' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  historyValue: { fontSize: 16, fontWeight: '700' },
  historyNote: { fontSize: 12, marginTop: 2 },
  historyDate: { fontSize: 13 },
  trashBtn: { marginLeft: 12, padding: 4 },
  pesoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  pesoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pesoLabel: { fontSize: 13 },
  pesoValue: { fontSize: 32, fontWeight: '700', marginTop: 2 },
  pesoDate: { fontSize: 12, marginTop: 4 },
  registrarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  registrarBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  chart: { borderRadius: 12 },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 40 },
  medidasSection: { marginTop: 20, paddingHorizontal: 16 },
  medidasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMedidaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  addMedidaBtnText: { fontSize: 13, fontWeight: '600' },
  partesScroll: { marginBottom: 12 },
  parteChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  parteChipText: { fontSize: 13, fontWeight: '500' },
  medidasList: { borderRadius: 16, padding: 14, borderWidth: 1 },
  medidasListTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  medidaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  medidaData: { fontSize: 13 },
  medidaValor: { fontSize: 14, fontWeight: '600' },
  emptyMedidas: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyMedidasText: { fontSize: 13, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, marginBottom: 6 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  partesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  parteOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  salvarBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  salvarBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
