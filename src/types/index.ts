import type {
  exercicios,
  fichasDeTreino,
  diasDeTreino,
  exerciciosNoPlano,
  sessoesDeTreino,
  registrosExercicio,
  seriesRegistradas,
  pesosCorporais,
  medidasCorporais,
  versoesFicha,
} from '@/db/schema';

// ============================================================
// Enumerações (const objects + tipos derivados)
// ============================================================

export const GrupoMuscular = {
  PEITO: 'peito',
  COSTAS: 'costas',
  OMBROS: 'ombros',
  BICEPS: 'biceps',
  TRICEPS: 'triceps',
  ANTEBRACO: 'antebraco',
  ABDOMEN: 'abdomen',
  QUADRICEPS: 'quadriceps',
  POSTERIORES: 'posteriores',
  GLUTEOS: 'gluteos',
  PANTURRILHA: 'panturrilha',
  TRAPEZIO: 'trapezio',
  CARDIO: 'cardio',
} as const;

export type GrupoMuscular = (typeof GrupoMuscular)[keyof typeof GrupoMuscular];

export const StatusSessao = {
  EM_ANDAMENTO: 'em_andamento',
  PAUSADA: 'pausada',
  FINALIZADA: 'finalizada',
} as const;

export type StatusSessao = (typeof StatusSessao)[keyof typeof StatusSessao];

export const StatusExercicio = {
  PENDENTE: 'pendente',
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDO: 'concluido',
} as const;

export type StatusExercicio = (typeof StatusExercicio)[keyof typeof StatusExercicio];

export const FonteExercicio = {
  FREE_EXERCISE_DB: 'free_exercise_db',
  EXERCISEDB_V1: 'exercisedb_v1',
  PERSONALIZADO: 'personalizado',
} as const;

export type FonteExercicio = (typeof FonteExercicio)[keyof typeof FonteExercicio];

// ============================================================
// Tipos inferidos do schema Drizzle
// ============================================================

export type Exercicio = typeof exercicios.$inferSelect;
export type ExercicioInsert = typeof exercicios.$inferInsert;

export type FichaDeTreino = typeof fichasDeTreino.$inferSelect;
export type FichaDeTreinoInsert = typeof fichasDeTreino.$inferInsert;

export type DiaDeTreino = typeof diasDeTreino.$inferSelect;
export type DiaDeTreinoInsert = typeof diasDeTreino.$inferInsert;

export type ExercicioNoPlano = typeof exerciciosNoPlano.$inferSelect;
export type ExercicioNoPlanoInsert = typeof exerciciosNoPlano.$inferInsert;

export type SessaoDeTreino = typeof sessoesDeTreino.$inferSelect;
export type SessaoDeTreinoInsert = typeof sessoesDeTreino.$inferInsert;

export type RegistroExercicio = typeof registrosExercicio.$inferSelect;
export type RegistroExercicioInsert = typeof registrosExercicio.$inferInsert;

export type SerieRegistrada = typeof seriesRegistradas.$inferSelect;
export type SerieRegistradaInsert = typeof seriesRegistradas.$inferInsert;

export type PesoCorporal = typeof pesosCorporais.$inferSelect;
export type PesoCorporalInsert = typeof pesosCorporais.$inferInsert;

export type MedidaCorporal = typeof medidasCorporais.$inferSelect;
export type MedidaCorporalInsert = typeof medidasCorporais.$inferInsert;

export type VersaoFicha = typeof versoesFicha.$inferSelect;
export type VersaoFichaInsert = typeof versoesFicha.$inferInsert;

// ============================================================
// Tipos de Input (para criação/edição)
// ============================================================

export interface ExercicioPersonalizadoInput {
  id?: string;
  nome: string;
  grupoMuscularPrincipal: GrupoMuscular;
  grupoMuscularSecundario?: GrupoMuscular;
  descricao?: string;
}

export interface DiaDeTreinoInput {
  nome: string;
  diaDaSemana: number;
  gruposMuscularesFoco: GrupoMuscular[];
}

export interface FichaDeTreinoUpdate {
  id: string;
  nome?: string;
  ativa?: boolean;
}

export interface Periodo {
  inicio: Date;
  fim: Date;
}

export interface ConfigExercicio {
  series: number;
  repeticoesAlvo: number;
  cargaSugerida: number;
  tempoDescanso: number; // segundos
}

export interface ResumoSessao {
  duracaoTotal: number;          // segundos
  exerciciosRealizados: number;
  volumeTotal: number;           // séries × repetições × carga
  registros: RegistroExercicio[];
}

/** Exercício com detalhes de séries para exibição na sessão */
export interface RegistroExercicioComDetalhes extends RegistroExercicio {
  series: SerieRegistrada[];
  exercicio?: Exercicio;
}

/** Ficha com seus dias de treino carregados */
export interface FichaDeTreinoComDias extends FichaDeTreino {
  dias: DiaDeTreino[];
}

/** Filtro para pesquisa de exercícios */
export interface FiltroExercicio {
  nome?: string;
  grupoMuscular?: GrupoMuscular;
  equipamento?: string;
}

/** Recomendação de exercício com motivo e relevância */
export interface RecomendacaoExercicio {
  exercicio: Exercicio;
  motivo: string;
  relevancia: number; // 0.0 a 1.0
}

/** Ponto de dados para gráfico de evolução de carga */
export interface PontoCarga {
  data: Date;
  cargaMaxima: number;
}

/** Ponto de dados para gráfico de volume */
export interface PontoVolume {
  data: Date;
  volume: number;
}

/** Estatísticas resumidas do mês */
export interface EstatisticasResumo {
  totalSessoesMes: number;
  frequenciaSemanal: number;
  tempoTotalTreino: number; // segundos
}
