import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { exercicioService } from '@/services/ExercicioService';
import type { Exercicio } from '@/types';

export default function ExercicioDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      const ex = await exercicioService.obterPorId(id);
      setExercicio(ex ?? null);
      setCarregando(false);
    }
    carregar();
  }, [id]);

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
        {/* Header visual */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="barbell" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.heroName, { color: colors.text }]}>{exercicio.nome}</Text>
          {exercicio.ehPersonalizado && (
            <View style={[styles.customBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.customBadgeText}>Exercício Personalizado</Text>
            </View>
          )}
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <InfoItem
            icon="body-outline"
            label="Grupo Principal"
            value={exercicio.grupoMuscularPrincipal}
            colors={colors}
          />
          {exercicio.grupoMuscularSecundario && (
            <InfoItem
              icon="body"
              label="Grupo Secundário"
              value={exercicio.grupoMuscularSecundario}
              colors={colors}
            />
          )}
          {exercicio.equipamento && (
            <InfoItem
              icon="fitness-outline"
              label="Equipamento"
              value={exercicio.equipamento}
              colors={colors}
            />
          )}
          {exercicio.nivel && (
            <InfoItem
              icon="speedometer-outline"
              label="Nível"
              value={exercicio.nivel}
              colors={colors}
            />
          )}
          {exercicio.mecanica && (
            <InfoItem
              icon="git-merge-outline"
              label="Mecânica"
              value={exercicio.mecanica === 'compound' ? 'Composto' : 'Isolado'}
              colors={colors}
            />
          )}
          {exercicio.forca && (
            <InfoItem
              icon="arrow-forward-outline"
              label="Força"
              value={exercicio.forca === 'push' ? 'Empurrar' : exercicio.forca === 'pull' ? 'Puxar' : 'Estático'}
              colors={colors}
            />
          )}
        </View>

        {/* Instruções */}
        {instrucoes.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instruções</Text>
            {instrucoes.map((inst, idx) => (
              <View key={idx} style={styles.instrucaoRow}>
                <View style={[styles.instrucaoNum, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.instrucaoNumText, { color: colors.primary }]}>
                    {idx + 1}
                  </Text>
                </View>
                <Text style={[styles.instrucaoText, { color: colors.text }]}>{inst}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Descrição */}
        {exercicio.descricao && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Descrição</Text>
            <Text style={[styles.descricao, { color: colors.textSecondary }]}>
              {exercicio.descricao}
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function InfoItem({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: Record<string, string>;
}) {
  return (
    <View style={[infoStyles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <Text style={[infoStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  item: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  label: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  value: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, marginTop: 12 },
  heroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  customBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  instrucaoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  instrucaoNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrucaoNumText: { fontSize: 13, fontWeight: '700' },
  instrucaoText: { flex: 1, fontSize: 15, lineHeight: 22 },
  descricao: { fontSize: 15, lineHeight: 22 },
});
