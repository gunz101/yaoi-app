import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================================
// Exercícios
// ============================================================

export const exercicios = sqliteTable('exercicios', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  grupoMuscularPrincipal: text('grupo_muscular_principal').notNull(),
  grupoMuscularSecundario: text('grupo_muscular_secundario'),
  equipamento: text('equipamento'),
  instrucoes: text('instrucoes', { mode: 'json' }).$type<string[]>().default([]),
  nivel: text('nivel'),
  forca: text('forca'),
  mecanica: text('mecanica'),
  categoria: text('categoria'),
  imagensLocais: text('imagens_locais', { mode: 'json' }).$type<string[]>().default([]),
  gifURL: text('gif_url'),
  gifCacheLocal: text('gif_cache_local'),
  ehPersonalizado: integer('eh_personalizado', { mode: 'boolean' }).notNull().default(false),
  descricao: text('descricao'),
  fonteOrigem: text('fonte_origem').notNull().default('free_exercise_db'),
  dataModificacao: integer('data_modificacao', { mode: 'timestamp' }).notNull(),
  sincronizado: integer('sincronizado', { mode: 'boolean' }).notNull().default(false),
});

// ============================================================
// Fichas de Treino
// ============================================================

export const fichasDeTreino = sqliteTable('fichas_de_treino', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
  dataCriacao: integer('data_criacao', { mode: 'timestamp' }).notNull(),
  dataModificacao: integer('data_modificacao', { mode: 'timestamp' }).notNull(),
  sincronizado: integer('sincronizado', { mode: 'boolean' }).notNull().default(false),
});

// ============================================================
// Dias de Treino
// ============================================================

export const diasDeTreino = sqliteTable('dias_de_treino', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  diaDaSemana: integer('dia_da_semana').notNull(),
  gruposMuscularesFoco: text('grupos_musculares_foco', { mode: 'json' }).$type<string[]>().default([]),
  fichaId: text('ficha_id').notNull().references(() => fichasDeTreino.id, { onDelete: 'cascade' }),
  dataModificacao: integer('data_modificacao', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Exercícios no Plano (relação Dia ↔ Exercício com config)
// ============================================================

export const exerciciosNoPlano = sqliteTable('exercicios_no_plano', {
  id: text('id').primaryKey(),
  ordem: integer('ordem').notNull(),
  seriesPlanejadas: integer('series_planejadas').notNull(),
  repeticoesAlvo: integer('repeticoes_alvo').notNull(),
  cargaSugerida: real('carga_sugerida').notNull(),
  tempoDescanso: integer('tempo_descanso').notNull(),
  exercicioId: text('exercicio_id').notNull().references(() => exercicios.id),
  diaId: text('dia_id').notNull().references(() => diasDeTreino.id, { onDelete: 'cascade' }),
});

// ============================================================
// Sessões de Treino
// ============================================================

export const sessoesDeTreino = sqliteTable('sessoes_de_treino', {
  id: text('id').primaryKey(),
  diaId: text('dia_id').references(() => diasDeTreino.id),
  fichaNome: text('ficha_nome').notNull().default(''),
  dataInicio: integer('data_inicio', { mode: 'timestamp' }).notNull(),
  dataFim: integer('data_fim', { mode: 'timestamp' }),
  duracaoTotal: real('duracao_total').notNull().default(0),
  tempoPausado: real('tempo_pausado').notNull().default(0),
  status: text('status').notNull().default('em_andamento'),
  dataModificacao: integer('data_modificacao', { mode: 'timestamp' }).notNull(),
  sincronizado: integer('sincronizado', { mode: 'boolean' }).notNull().default(false),
});

// ============================================================
// Registros de Exercício (dentro de uma sessão)
// ============================================================

export const registrosExercicio = sqliteTable('registros_exercicio', {
  id: text('id').primaryKey(),
  exercicioId: text('exercicio_id').references(() => exercicios.id),
  exercicioNome: text('exercicio_nome').notNull(),
  ordem: integer('ordem').notNull(),
  status: text('status').notNull().default('pendente'),
  sessaoId: text('sessao_id').notNull().references(() => sessoesDeTreino.id, { onDelete: 'cascade' }),
  ehAvulso: integer('eh_avulso', { mode: 'boolean' }).notNull().default(false),
});

// ============================================================
// Séries Registradas
// ============================================================

export const seriesRegistradas = sqliteTable('series_registradas', {
  id: text('id').primaryKey(),
  numero: integer('numero').notNull(),
  repeticoesRealizadas: integer('repeticoes_realizadas').notNull(),
  cargaUtilizada: real('carga_utilizada').notNull(),
  dataRegistro: integer('data_registro', { mode: 'timestamp' }).notNull(),
  registroId: text('registro_id').notNull().references(() => registrosExercicio.id, { onDelete: 'cascade' }),
});

// ============================================================
// Peso Corporal
// ============================================================

export const pesosCorporais = sqliteTable('pesos_corporais', {
  id: text('id').primaryKey(),
  peso: real('peso').notNull(),
  data: integer('data', { mode: 'timestamp' }).notNull(),
  nota: text('nota'),
  dataModificacao: integer('data_modificacao', { mode: 'timestamp' }).notNull(),
  sincronizado: integer('sincronizado', { mode: 'boolean' }).notNull().default(false),
});

// ============================================================
// Medidas Corporais
// ============================================================

export const medidasCorporais = sqliteTable('medidas_corporais', {
  id: text('id').primaryKey(),
  parteDoCorpo: text('parte_do_corpo').notNull(),
  valor: real('valor').notNull(),
  data: integer('data', { mode: 'timestamp' }).notNull(),
  ehCustomizada: integer('eh_customizada', { mode: 'boolean' }).notNull().default(false),
  dataModificacao: integer('data_modificacao', { mode: 'timestamp' }).notNull(),
  sincronizado: integer('sincronizado', { mode: 'boolean' }).notNull().default(false),
});

// ============================================================
// Versões de Ficha (histórico de edições)
// ============================================================

export const versoesFicha = sqliteTable('versoes_ficha', {
  id: text('id').primaryKey(),
  fichaId: text('ficha_id').notNull().references(() => fichasDeTreino.id, { onDelete: 'cascade' }),
  snapshotJSON: text('snapshot_json').notNull(),
  dataVersao: integer('data_versao', { mode: 'timestamp' }).notNull(),
});

// ============================================================
// Fila de Sincronização (operações offline pendentes)
// ============================================================

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  tabela: text('tabela').notNull(),
  operacao: text('operacao').notNull(),
  registroId: text('registro_id').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  dataCriacao: integer('data_criacao', { mode: 'timestamp' }).notNull(),
  tentativas: integer('tentativas').notNull().default(0),
});
