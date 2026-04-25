import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'yaoi.db';

/**
 * Abre o banco SQLite e cria a instância Drizzle.
 * O expo-sqlite gerencia o ciclo de vida do banco automaticamente.
 */
const expoDb = openDatabaseSync(DATABASE_NAME);

/** Instância Drizzle ORM com schema tipado */
export const db = drizzle(expoDb, { schema });

/**
 * Executa as migrations criando todas as tabelas.
 * Usa CREATE TABLE IF NOT EXISTS para ser idempotente.
 */
export async function runMigrations(): Promise<void> {
  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS exercicios (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      grupo_muscular_principal TEXT NOT NULL,
      grupo_muscular_secundario TEXT,
      equipamento TEXT,
      instrucoes TEXT DEFAULT '[]',
      nivel TEXT,
      forca TEXT,
      mecanica TEXT,
      categoria TEXT,
      imagens_locais TEXT DEFAULT '[]',
      gif_url TEXT,
      gif_cache_local TEXT,
      eh_personalizado INTEGER NOT NULL DEFAULT 0,
      descricao TEXT,
      fonte_origem TEXT NOT NULL DEFAULT 'free_exercise_db',
      data_modificacao INTEGER NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS fichas_de_treino (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      ativa INTEGER NOT NULL DEFAULT 1,
      data_criacao INTEGER NOT NULL,
      data_modificacao INTEGER NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS dias_de_treino (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      dia_da_semana INTEGER NOT NULL,
      grupos_musculares_foco TEXT DEFAULT '[]',
      ficha_id TEXT NOT NULL REFERENCES fichas_de_treino(id) ON DELETE CASCADE,
      data_modificacao INTEGER NOT NULL
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS exercicios_no_plano (
      id TEXT PRIMARY KEY NOT NULL,
      ordem INTEGER NOT NULL,
      series_planejadas INTEGER NOT NULL,
      repeticoes_alvo INTEGER NOT NULL,
      carga_sugerida REAL NOT NULL,
      tempo_descanso INTEGER NOT NULL,
      exercicio_id TEXT NOT NULL REFERENCES exercicios(id),
      dia_id TEXT NOT NULL REFERENCES dias_de_treino(id) ON DELETE CASCADE
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS sessoes_de_treino (
      id TEXT PRIMARY KEY NOT NULL,
      dia_id TEXT REFERENCES dias_de_treino(id),
      ficha_nome TEXT NOT NULL DEFAULT '',
      data_inicio INTEGER NOT NULL,
      data_fim INTEGER,
      duracao_total REAL NOT NULL DEFAULT 0,
      tempo_pausado REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'em_andamento',
      data_modificacao INTEGER NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS registros_exercicio (
      id TEXT PRIMARY KEY NOT NULL,
      exercicio_id TEXT REFERENCES exercicios(id),
      exercicio_nome TEXT NOT NULL,
      ordem INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      sessao_id TEXT NOT NULL REFERENCES sessoes_de_treino(id) ON DELETE CASCADE,
      eh_avulso INTEGER NOT NULL DEFAULT 0
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS series_registradas (
      id TEXT PRIMARY KEY NOT NULL,
      numero INTEGER NOT NULL,
      repeticoes_realizadas INTEGER NOT NULL,
      carga_utilizada REAL NOT NULL,
      data_registro INTEGER NOT NULL,
      registro_id TEXT NOT NULL REFERENCES registros_exercicio(id) ON DELETE CASCADE
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS pesos_corporais (
      id TEXT PRIMARY KEY NOT NULL,
      peso REAL NOT NULL,
      data INTEGER NOT NULL,
      nota TEXT,
      data_modificacao INTEGER NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS medidas_corporais (
      id TEXT PRIMARY KEY NOT NULL,
      parte_do_corpo TEXT NOT NULL,
      valor REAL NOT NULL,
      data INTEGER NOT NULL,
      eh_customizada INTEGER NOT NULL DEFAULT 0,
      data_modificacao INTEGER NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS versoes_ficha (
      id TEXT PRIMARY KEY NOT NULL,
      ficha_id TEXT NOT NULL REFERENCES fichas_de_treino(id) ON DELETE CASCADE,
      snapshot_json TEXT NOT NULL,
      data_versao INTEGER NOT NULL
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      tabela TEXT NOT NULL,
      operacao TEXT NOT NULL,
      registro_id TEXT NOT NULL,
      payload TEXT,
      data_criacao INTEGER NOT NULL,
      tentativas INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Habilitar foreign keys (desabilitado por padrão no SQLite)
  expoDb.execSync('PRAGMA foreign_keys = ON;');
}
