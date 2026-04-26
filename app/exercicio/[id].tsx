import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { exercicioService } from '@/services/ExercicioService';
import { fichaService } from '@/services/FichaService';
import { ExerciseImageSlideshow } from '@/components/ExerciseImageSlideshow';
import type { Exercicio } from '@/types';

export default function ExercicioDetalheScreen() {
  const { id, diaId } = useLocalSearchParams<{ id: string; diaId?: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Config para adicionar ao dia
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [series, setSeries] = useState('3');
  const [reps, setReps] = useState('12');
  const [carga, setCarga] = useState('0');
  const [descanso, setDescanso] = useState('60');
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      const ex = await exercicioService.obterPorId(id);
      setExercicio(ex ?? null);
      setCarregando(false);
    }
    carregar();
  }, [id]);

  async function handleAdicionar() {
    if (!diaId || !id) return;
    const s = parseInt(series, 10);
    const r = parseInt(reps, 10);
    const c = parseFloat(carga);
    const d = parseInt(descanso, 10);

    if (isNaN(s) || s <= 0) { Alert.alert('Erro', 'Séries inválidas'); return; }
    if (isNaN(r) || r <= 0) { Alert.alert('Erro', 'Repetições inválidas'); return; }

    try {
      setAdicionando(true);
      await fichaService.adicionarExercicio(diaId, id, {
        series: s,
        repeticoesAlvo: r,
        cargaSugerida: isNaN(c) ? 0 : c,
        tempoDescanso: isNaN(d) ? 60 : d,
      });
      Alert.alert('Adicionado!', `${exercicio?.nome} foi adicionado ao dia de treino`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Erro', String(e));
    } finally {
      setAdicionando(false);
    }
  }

  if (carregando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Exercício', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!exercicio) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Exercício', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.notFound, { color: colors.text }]}>Exercício não encontrado</Text>
        </View>
      </>
    );
  }

  const instrucoes = (exercicio.instrucoes as string[]) ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: exercicio.nome,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Hero with images */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ExerciseImageSlideshow images={(exercicio.imagensLocais as string[]) ?? []} height={240} />
          <Text style={[styles.heroName, { color: colors.text }]}>{exercicio.nome}</Text>
          {exercicio.ehPersonalizado && (
            <View style={[styles.customBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.customBadgeText}>Personalizado</Text>
            </View>
          )}
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <InfoItem icon="body-outline" label="Grupo Principal" value={exercicio.grupoMuscularPrincipal} colors={colors} />
          {exercicio.grupoMuscularSecundario && (
            <InfoItem icon="body" label="Secundário" value={exercicio.grupoMuscularSecundario} colors={colors} />
          )}
          {exercicio.equipamento && (
            <InfoItem icon="fitness-outline" label="Equipamento" value={exercicio.equipamento} colors={colors} />
          )}
          {exercicio.nivel && (
            <InfoItem icon="speedometer-outline" label="Nível" value={exercicio.nivel} colors={colors} />
          )}
          {exercicio.mecanica && (
            <InfoItem icon="git-merge-outline" label="Mecânica" value={exercicio.mecanica === 'compound' ? 'Composto' : 'Isolado'} colors={colors} />
          )}
          {exercicio.forca && (
            <InfoItem icon="arrow-forward-outline" label="Força" value={exercicio.forca === 'push' ? 'Empurrar' : exercicio.forca === 'pull' ? 'Puxar' : 'Estático'} colors={colors} />
          )}
        </View>

        {/* Instruções */}
        {instrucoes.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instruções</Text>
            {instrucoes.map((inst, idx) => (
              <View key={idx} style={styles.instrucaoRow}>
                <View style={[styles.instrucaoNum, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.instrucaoNumText, { color: colors.primary }]}>{idx + 1}</Text>
                </View>
                <Text style={[styles.instrucaoText, { color: colors.text }]}>{inst}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Adicionar ao dia — só aparece se veio de um dia de treino */}
        {diaId && !mostrarConfig && (
          <Pressable
            onPress={() => setMostrarConfig(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add-circle" size={22} color="#fff" />
            <Text style={styles.addButtonText}>Adicionar ao Dia de Treino</Text>
          </Pressable>
        )}

        {diaId && mostrarConfig && (
          <View style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.configTitle, { color: colors.text }]}>Configuração</Text>
            <View style={styles.configGrid}>
              <View style={styles.configItem}>
                <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Séries</Text>
                <TextInput
                  style={[styles.configInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={series} onChangeText={setSeries} keyboardType="number-pad" />
              </View>
              <View style={styles.configItem}>
                <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Repetições</Text>
                <TextInput
                  style={[styles.configInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={reps} onChangeText={setReps} keyboardType="number-pad" />
              </View>
              <View style={styles.configItem}>
                <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Carga (kg)</Text>
                <TextInput
                  style={[styles.configInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={carga} onChangeText={setCarga} keyboardType="decimal-pad" />
              </View>
              <View style={styles.configItem}>
                <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Descanso (s)</Text>
                <TextInput
                  style={[styles.configInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={descanso} onChangeText={setDescanso} keyboardType="number-pad" />
              </View>
            </View>
            <Pressable
              onPress={handleAdicionar}
              disabled={adicionando}
              style={[styles.confirmButton, { backgroundColor: colors.primary, opacity: adicionando ? 0.6 : 1 }]}
            >
              <Text style={styles.confirmText}>{adicionando ? 'Adicionando...' : 'Confirmar'}</Text>
            </Pressable>
          </View>
        )}

        {/* Se não veio de um dia, mostrar botão genérico */}
        {!diaId && (
          <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Para adicionar este exercício a um dia de treino, acesse o catálogo a partir da ficha.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function InfoItem({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: Record<string, string> }) {
  return (
    <View style={[infoStyles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <Text style={[infoStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  item: { width: '48%', padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  label: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  value: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, marginTop: 12 },
  heroCard: { alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  customBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  customBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'space-between' },
  section: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  instrucaoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  instrucaoNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  instrucaoNumText: { fontSize: 13, fontWeight: '700' },
  instrucaoText: { flex: 1, fontSize: 15, lineHeight: 22 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 12, marginTop: 8,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  configCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  configTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  configGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  configItem: { width: '47%' },
  configLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  configInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  confirmButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 10, marginTop: 14 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
