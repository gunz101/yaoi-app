import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/utils/theme';
import { db } from '@/db/client';
import { exercicios } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCacheStats, downloadAllImages, clearImageCache } from '@/utils/imageCache';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ConfiguracoesScreen() {
  const { colors } = useTheme();
  const [cacheSize, setCacheSize] = useState<string>('Calculando...');
  const [cachedCount, setCachedCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });
  const [exerciseCount, setExerciseCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const stats = await getCacheStats();
      setCachedCount(stats.count);
      setCacheSize(formatBytes(stats.sizeBytes));
    } catch {
      setCacheSize('Erro');
    }

    try {
      const allExercicios = await db.select().from(exercicios);
      setExerciseCount(allExercicios.length);
      let imgCount = 0;
      for (const ex of allExercicios) {
        const imgs = (ex.imagensLocais as string[]) ?? [];
        imgCount += imgs.length;
      }
      setTotalImages(imgCount);
    } catch {
      setTotalImages(0);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleDownloadAll = useCallback(async () => {
    if (downloading) return;

    Alert.alert(
      'Baixar todas as imagens',
      `Isso vai baixar ~${totalImages} imagens para o cache do celular. Recomendado usar Wi-Fi. Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Baixar',
          onPress: async () => {
            setDownloading(true);
            setDownloadProgress({ done: 0, total: totalImages });

            try {
              // Collect all image paths
              const allExercicios = await db.select().from(exercicios);
              const allPaths: string[] = [];
              for (const ex of allExercicios) {
                const imgs = (ex.imagensLocais as string[]) ?? [];
                allPaths.push(...imgs);
              }

              const downloaded = await downloadAllImages(allPaths, (done, total) => {
                setDownloadProgress({ done, total });
              });

              Alert.alert('Concluído', `${downloaded} imagens processadas!`);
            } catch (e) {
              Alert.alert('Erro', String(e));
            } finally {
              setDownloading(false);
              loadStats();
            }
          },
        },
      ]
    );
  }, [downloading, totalImages, loadStats]);

  const handleClearCache = useCallback(async () => {
    Alert.alert(
      'Limpar cache de imagens',
      'As imagens serão baixadas novamente quando você abrir os exercícios. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearImageCache();
              Alert.alert('Cache limpo', 'Todas as imagens em cache foram removidas.');
              loadStats();
            } catch (e) {
              Alert.alert('Erro', String(e));
            }
          },
        },
      ]
    );
  }, [loadStats]);

  const handleClearAllData = useCallback(async () => {
    Alert.alert(
      'Limpar TODOS os dados',
      'Isso vai apagar fichas, sessões, peso, medidas — TUDO. Esta ação não pode ser desfeita. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              const { openDatabaseSync } = await import('expo-sqlite');
              const rawDb = openDatabaseSync('yaoi.db');
              rawDb.execSync('PRAGMA foreign_keys = OFF;');
              rawDb.execSync('DELETE FROM series_registradas;');
              rawDb.execSync('DELETE FROM registros_exercicio;');
              rawDb.execSync('DELETE FROM sessoes_de_treino;');
              rawDb.execSync('DELETE FROM exercicios_no_plano;');
              rawDb.execSync('DELETE FROM dias_de_treino;');
              rawDb.execSync('DELETE FROM versoes_ficha;');
              rawDb.execSync('DELETE FROM fichas_de_treino;');
              rawDb.execSync('DELETE FROM pesos_corporais;');
              rawDb.execSync('DELETE FROM medidas_corporais;');
              rawDb.execSync('DELETE FROM sync_queue;');
              rawDb.execSync('PRAGMA foreign_keys = ON;');
              Alert.alert('Dados apagados', 'Todos os dados foram removidos. Os exercícios do catálogo foram mantidos.');
            } catch (e) {
              Alert.alert('Erro', String(e));
            }
          },
        },
      ]
    );
  }, []);

  const handleResetExercises = useCallback(async () => {
    Alert.alert(
      'Recarregar catálogo',
      'Isso vai recarregar todos os exercícios da base de dados. Exercícios personalizados serão mantidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recarregar',
          onPress: async () => {
            try {
              const { openDatabaseSync } = await import('expo-sqlite');
              const rawDb = openDatabaseSync('yaoi.db');
              rawDb.execSync('PRAGMA foreign_keys = OFF;');
              await db.delete(exercicios).where(eq(exercicios.fonteOrigem, 'free_exercise_db'));
              rawDb.execSync('PRAGMA foreign_keys = ON;');
              Alert.alert('Catálogo resetado', 'Reinicie o app para recarregar os exercícios.');
            } catch (e) {
              Alert.alert('Erro', String(e));
            }
          },
        },
      ]
    );
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Configurações',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Stats card */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercícios no catálogo</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{exerciseCount}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Imagens em cache</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{cachedCount} / {totalImages}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tamanho do cache</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{cacheSize}</Text>
          </View>
        </View>

        {/* Download progress */}
        {downloading && (
          <View style={[styles.progressCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.primary }]}>
              Baixando... {downloadProgress.done}/{downloadProgress.total}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${downloadProgress.total > 0 ? (downloadProgress.done / downloadProgress.total) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Imagens */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Imagens</Text>

        <MenuItem
          icon="cloud-download-outline"
          label="Baixar todas as imagens"
          description="Pré-carrega imagens para uso offline"
          color={colors.primary}
          colors={colors}
          onPress={handleDownloadAll}
          disabled={downloading}
        />
        <MenuItem
          icon="trash-outline"
          label="Limpar cache de imagens"
          description={`Liberar ${cacheSize} de espaço`}
          color={colors.warning}
          colors={colors}
          onPress={handleClearCache}
        />

        {/* Dados */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Dados</Text>

        <MenuItem
          icon="refresh-outline"
          label="Recarregar catálogo de exercícios"
          description="Recarrega os 870+ exercícios da base"
          color={colors.primary}
          colors={colors}
          onPress={handleResetExercises}
        />
        <MenuItem
          icon="nuclear-outline"
          label="Limpar todos os dados"
          description="Apaga fichas, sessões, peso, medidas"
          color={colors.danger}
          colors={colors}
          onPress={handleClearAllData}
        />

        {/* Sobre */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Sobre</Text>

        <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutName, { color: colors.text }]}>Yaoi — Gym Tracker</Text>
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>Versão 1.0.0</Text>
          <Text style={[styles.aboutCredits, { color: colors.textSecondary }]}>
            Exercícios: Free Exercise DB (domínio público){'\n'}
            Desenvolvido com React Native + Expo
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

function MenuItem({
  icon,
  label,
  description,
  color,
  colors,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  description: string;
  color: string;
  colors: Record<string, string>;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  statsCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statDivider: { height: 1 },
  progressCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 8 },
  progressText: { fontSize: 14, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8, gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuDesc: { fontSize: 12, marginTop: 2 },
  aboutCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 4 },
  aboutName: { fontSize: 18, fontWeight: '700' },
  aboutVersion: { fontSize: 14 },
  aboutCredits: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
