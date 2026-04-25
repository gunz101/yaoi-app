import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/utils/theme';
import { useFicha } from '@/hooks/useFicha';
import type { FichaDeTreino, DiaDeTreino } from '@/types';
import { fichaService } from '@/services/FichaService';

const DIAS_SEMANA = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTO = ['', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function TreinoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { fichas, listarFichas } = useFicha();
  const [fichaAtiva, setFichaAtiva] = useState<FichaDeTreino | null>(null);
  const [diasHoje, setDiasHoje] = useState<DiaDeTreino[]>([]);

  useFocusEffect(
    useCallback(() => {
      listarFichas();
    }, [])
  );

  useEffect(() => {
    async function carregarDiaHoje() {
      const ativa = fichas.find((f) => f.ativa);
      if (!ativa) {
        setFichaAtiva(null);
        setDiasHoje([]);
        return;
      }
      setFichaAtiva(ativa);
      const fichaComDias = await fichaService.obterFichaComDias(ativa.id);
      if (fichaComDias) {
        // JS: 0=Dom, 1=Seg... Schema: 1=Dom, 2=Seg...
        const hoje = new Date().getDay() + 1;
        const diasDeHoje = fichaComDias.dias.filter((d) => d.diaDaSemana === hoje);
        setDiasHoje(diasDeHoje);
      }
    }
    carregarDiaHoje();
  }, [fichas]);

  if (!fichaAtiva) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Ionicons name="barbell-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sem ficha ativa
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Crie uma ficha de treino para começar
          </Text>
          <Pressable
            onPress={() => router.push('/ficha/nova')}
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.ctaText}>Criar Ficha</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hoje = new Date();
  const diaSemanaHoje = DIAS_SEMANA[hoje.getDay() + 1] ?? '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {diaSemanaHoje}
        </Text>
        <Text style={[styles.fichaName, { color: colors.text }]}>
          {fichaAtiva.nome}
        </Text>
      </View>

      {diasHoje.length > 0 ? (
        diasHoje.map((dia) => (
          <Pressable
            key={dia.id}
            onPress={() => router.push(`/ficha/${fichaAtiva.id}`)}
            style={[styles.diaCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.diaIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="barbell" size={24} color={colors.primary} />
            </View>
            <View style={styles.diaInfo}>
              <Text style={[styles.diaNome, { color: colors.text }]}>{dia.nome}</Text>
              <Text style={[styles.diaGrupos, { color: colors.textSecondary }]}>
                {(dia.gruposMuscularesFoco as string[]).join(', ') || 'Treino geral'}
              </Text>
            </View>
            <View style={[styles.startButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="play" size={16} color="#fff" />
            </View>
          </Pressable>
        ))
      ) : (
        <View style={[styles.restCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="bed-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.restTitle, { color: colors.text }]}>Dia de descanso</Text>
          <Text style={[styles.restSubtitle, { color: colors.textSecondary }]}>
            Nenhum treino programado para hoje
          </Text>
        </View>
      )}

      {/* Quick links */}
      <View style={styles.quickLinks}>
        <Pressable
          onPress={() => router.push('/exercicio/catalogo')}
          style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="search" size={20} color={colors.primary} />
          <Text style={[styles.quickLinkText, { color: colors.text }]}>Catálogo</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/ficha/${fichaAtiva.id}`)}
          style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="clipboard" size={20} color={colors.primary} />
          <Text style={[styles.quickLinkText, { color: colors.text }]}>Ver Ficha</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { marginBottom: 20 },
  greeting: { fontSize: 15, fontWeight: '500' },
  fichaName: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  diaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  diaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  diaInfo: { flex: 1 },
  diaNome: { fontSize: 17, fontWeight: '600' },
  diaGrupos: { fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  startButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  restTitle: { fontSize: 18, fontWeight: '600' },
  restSubtitle: { fontSize: 14 },
  quickLinks: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickLinkText: { fontSize: 15, fontWeight: '500' },
});
