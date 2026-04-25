import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { useFicha } from '@/hooks/useFicha';
import type { DiaDeTreinoInput, GrupoMuscular } from '@/types';
import { GrupoMuscular as GM } from '@/types';

const DIAS_SEMANA = [
  { valor: 2, nome: 'Segunda' },
  { valor: 3, nome: 'Terça' },
  { valor: 4, nome: 'Quarta' },
  { valor: 5, nome: 'Quinta' },
  { valor: 6, nome: 'Sexta' },
  { valor: 7, nome: 'Sábado' },
  { valor: 1, nome: 'Domingo' },
];

const GRUPOS_MUSCULARES: { valor: GrupoMuscular; nome: string }[] = [
  { valor: GM.PEITO, nome: 'Peito' },
  { valor: GM.COSTAS, nome: 'Costas' },
  { valor: GM.OMBROS, nome: 'Ombros' },
  { valor: GM.BICEPS, nome: 'Bíceps' },
  { valor: GM.TRICEPS, nome: 'Tríceps' },
  { valor: GM.QUADRICEPS, nome: 'Quadríceps' },
  { valor: GM.POSTERIORES, nome: 'Posteriores' },
  { valor: GM.GLUTEOS, nome: 'Glúteos' },
  { valor: GM.PANTURRILHA, nome: 'Panturrilha' },
  { valor: GM.ABDOMEN, nome: 'Abdômen' },
  { valor: GM.TRAPEZIO, nome: 'Trapézio' },
];

interface DiaForm {
  diaDaSemana: number;
  nome: string;
  grupos: GrupoMuscular[];
}

export default function NovaFichaScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { criarFicha } = useFicha();

  const [nomeFicha, setNomeFicha] = useState('');
  const [dias, setDias] = useState<DiaForm[]>([]);
  const [salvando, setSalvando] = useState(false);

  const toggleDia = (diaSemana: number, nomeDia: string) => {
    setDias((prev) => {
      const existe = prev.find((d) => d.diaDaSemana === diaSemana);
      if (existe) {
        return prev.filter((d) => d.diaDaSemana !== diaSemana);
      }
      return [...prev, { diaDaSemana: diaSemana, nome: nomeDia, grupos: [] }];
    });
  };

  const toggleGrupo = (diaSemana: number, grupo: GrupoMuscular) => {
    setDias((prev) =>
      prev.map((d) => {
        if (d.diaDaSemana !== diaSemana) return d;
        const temGrupo = d.grupos.includes(grupo);
        return {
          ...d,
          grupos: temGrupo
            ? d.grupos.filter((g) => g !== grupo)
            : [...d.grupos, grupo],
        };
      })
    );
  };

  const atualizarNomeDia = (diaSemana: number, nome: string) => {
    setDias((prev) =>
      prev.map((d) => (d.diaDaSemana === diaSemana ? { ...d, nome } : d))
    );
  };

  const salvar = async () => {
    if (!nomeFicha.trim()) {
      Alert.alert('Atenção', 'Dê um nome para sua ficha');
      return;
    }
    if (dias.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um dia de treino');
      return;
    }

    setSalvando(true);
    try {
      const diasInput: DiaDeTreinoInput[] = dias.map((d) => ({
        nome: d.nome || `Treino ${DIAS_SEMANA.find((ds) => ds.valor === d.diaDaSemana)?.nome}`,
        diaDaSemana: d.diaDaSemana,
        gruposMuscularesFoco: d.grupos,
      }));
      await criarFicha(nomeFicha.trim(), diasInput);
      router.back();
    } catch (e) {
      console.error('Erro ao criar ficha:', e);
      Alert.alert('Erro', String(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nova Ficha',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Nome da ficha */}
        <Text style={[styles.label, { color: colors.text }]}>Nome da ficha</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Ex: Hipertrofia - Março"
          placeholderTextColor={colors.textSecondary}
          value={nomeFicha}
          onChangeText={setNomeFicha}
        />

        {/* Dias da semana */}
        <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>
          Dias de treino
        </Text>
        <View style={styles.diasGrid}>
          {DIAS_SEMANA.map((dia) => {
            const selecionado = dias.some((d) => d.diaDaSemana === dia.valor);
            return (
              <Pressable
                key={dia.valor}
                onPress={() => toggleDia(dia.valor, `Treino ${dia.nome}`)}
                style={[
                  styles.diaChip,
                  {
                    backgroundColor: selecionado ? colors.primary : colors.card,
                    borderColor: selecionado ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.diaChipText,
                    { color: selecionado ? '#fff' : colors.text },
                  ]}
                >
                  {dia.nome.substring(0, 3)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Configuração de cada dia */}
        {dias
          .sort((a, b) => a.diaDaSemana - b.diaDaSemana)
          .map((dia) => {
            const nomeDiaSemana = DIAS_SEMANA.find((d) => d.valor === dia.diaDaSemana)?.nome ?? '';
            return (
              <View
                key={dia.diaDaSemana}
                style={[styles.diaConfig, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.diaConfigTitle, { color: colors.primary }]}>
                  {nomeDiaSemana}
                </Text>
                <TextInput
                  style={[styles.diaNameInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Nome do treino (ex: Peito e Tríceps)"
                  placeholderTextColor={colors.textSecondary}
                  value={dia.nome}
                  onChangeText={(t) => atualizarNomeDia(dia.diaDaSemana, t)}
                />
                <Text style={[styles.grupoLabel, { color: colors.textSecondary }]}>
                  Grupos musculares foco:
                </Text>
                <View style={styles.gruposGrid}>
                  {GRUPOS_MUSCULARES.map((g) => {
                    const sel = dia.grupos.includes(g.valor);
                    return (
                      <Pressable
                        key={g.valor}
                        onPress={() => toggleGrupo(dia.diaDaSemana, g.valor)}
                        style={[
                          styles.grupoChip,
                          {
                            backgroundColor: sel ? colors.primaryLight : 'transparent',
                            borderColor: sel ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.grupoChipText,
                            { color: sel ? colors.primary : colors.textSecondary },
                          ]}
                        >
                          {g.nome}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

        {/* Botão salvar */}
        <Pressable
          onPress={salvar}
          disabled={salvando}
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: salvando ? 0.6 : 1 }]}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Criar Ficha'}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: {
    fontSize: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  diasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  diaChipText: { fontSize: 14, fontWeight: '600' },
  diaConfig: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  diaConfigTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  diaNameInput: {
    fontSize: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  grupoLabel: { fontSize: 13, marginBottom: 8 },
  gruposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grupoChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  grupoChipText: { fontSize: 13, fontWeight: '500' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
