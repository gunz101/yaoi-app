import { eq, like, or, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { exercicios } from '@/db/schema';
import { generateUUID } from '@/utils/uuid';
import { normalizar, mapearMusculo, contemTermo } from '@/utils/normalizers';
import type {
  Exercicio,
  ExercicioPersonalizadoInput,
  FiltroExercicio,
} from '@/types';

/** Formato dos exercícios no JSON da Free Exercise DB */
interface ExercicioJSON {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  level: string;
  force: string | null;
  mechanic: string | null;
  category: string;
  images: string[];
}

/**
 * Serviço responsável pelo catálogo de exercícios.
 * Carrega dados da Free Exercise DB, pesquisa, e gerencia exercícios personalizados.
 */
export class ExercicioService {
  /**
   * Carrega o catálogo local da Free Exercise DB (JSON) e persiste no SQLite.
   * Idempotente — verifica se já existem exercícios antes de inserir.
   */
  async carregarCatalogoLocal(): Promise<Exercicio[]> {
    // Verificar se já carregou
    const existentes = await db
      .select()
      .from(exercicios)
      .where(eq(exercicios.fonteOrigem, 'free_exercise_db'))
      .limit(1);

    if (existentes.length > 0) {
      return db.select().from(exercicios);
    }

    // Carregar JSON do asset
    const dadosJSON: ExercicioJSON[] = require('../../assets/data/exercises-sample.json');

    const agora = new Date();

    for (const item of dadosJSON) {
      await db.insert(exercicios).values({
        id: generateUUID(),
        nome: item.name,
        grupoMuscularPrincipal: mapearMusculo(item.primaryMuscles[0] ?? 'other'),
        grupoMuscularSecundario: item.secondaryMuscles.length > 0
          ? mapearMusculo(item.secondaryMuscles[0])
          : null,
        equipamento: item.equipment ?? null,
        instrucoes: item.instructions ?? [],
        nivel: item.level ?? null,
        forca: item.force ?? null,
        mecanica: item.mechanic ?? null,
        categoria: item.category ?? null,
        imagensLocais: item.images ?? [],
        gifURL: null,
        gifCacheLocal: null,
        ehPersonalizado: false,
        descricao: null,
        fonteOrigem: 'free_exercise_db',
        dataModificacao: agora,
        sincronizado: false,
      });
    }

    return db.select().from(exercicios);
  }

  /**
   * Pesquisa exercícios por termo e filtros.
   * Busca por nome, grupo muscular e equipamento com normalização de texto.
   */
  async pesquisar(termo: string, filtros?: FiltroExercicio): Promise<Exercicio[]> {
    // Buscar todos e filtrar em memória para suportar normalização de acentos
    const todos = await db.select().from(exercicios);

    return todos.filter((ex) => {
      // Filtro por termo de busca (nome, grupo muscular ou equipamento)
      if (termo) {
        const termoNorm = normalizar(termo);
        const matchNome = normalizar(ex.nome).includes(termoNorm);
        const matchGrupo = normalizar(ex.grupoMuscularPrincipal).includes(termoNorm);
        const matchEquip = ex.equipamento
          ? normalizar(ex.equipamento).includes(termoNorm)
          : false;
        if (!matchNome && !matchGrupo && !matchEquip) return false;
      }

      // Filtro por grupo muscular específico
      if (filtros?.grupoMuscular) {
        if (normalizar(ex.grupoMuscularPrincipal) !== normalizar(filtros.grupoMuscular)) {
          return false;
        }
      }

      // Filtro por equipamento específico
      if (filtros?.equipamento) {
        if (!ex.equipamento || normalizar(ex.equipamento) !== normalizar(filtros.equipamento)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Obtém um exercício por ID.
   */
  async obterPorId(id: string): Promise<Exercicio | undefined> {
    const resultado = await db
      .select()
      .from(exercicios)
      .where(eq(exercicios.id, id))
      .limit(1);
    return resultado[0];
  }

  /**
   * Lista todos os exercícios do catálogo.
   */
  async listarTodos(): Promise<Exercicio[]> {
    return db.select().from(exercicios);
  }

  /**
   * Cria um exercício personalizado.
   */
  async criarExercicioPersonalizado(
    input: ExercicioPersonalizadoInput
  ): Promise<Exercicio> {
    const id = input.id ?? generateUUID();
    const agora = new Date();

    await db.insert(exercicios).values({
      id,
      nome: input.nome,
      grupoMuscularPrincipal: input.grupoMuscularPrincipal,
      grupoMuscularSecundario: input.grupoMuscularSecundario ?? null,
      equipamento: null,
      instrucoes: [],
      nivel: null,
      forca: null,
      mecanica: null,
      categoria: null,
      imagensLocais: [],
      gifURL: null,
      gifCacheLocal: null,
      ehPersonalizado: true,
      descricao: input.descricao ?? null,
      fonteOrigem: 'personalizado',
      dataModificacao: agora,
      sincronizado: false,
    });

    const resultado = await db
      .select()
      .from(exercicios)
      .where(eq(exercicios.id, id))
      .limit(1);

    return resultado[0];
  }

  /**
   * Edita um exercício personalizado.
   * Preserva snapshots históricos — o campo exercicioNome em registrosExercicio
   * não é alterado (é um snapshot do momento do registro).
   */
  async editarExercicioPersonalizado(
    input: ExercicioPersonalizadoInput
  ): Promise<void> {
    if (!input.id) throw new Error('ID é obrigatório para edição');

    const existente = await db
      .select()
      .from(exercicios)
      .where(and(eq(exercicios.id, input.id), eq(exercicios.ehPersonalizado, true)))
      .limit(1);

    if (existente.length === 0) {
      throw new Error('Exercício personalizado não encontrado');
    }

    await db
      .update(exercicios)
      .set({
        nome: input.nome,
        grupoMuscularPrincipal: input.grupoMuscularPrincipal,
        grupoMuscularSecundario: input.grupoMuscularSecundario ?? null,
        descricao: input.descricao ?? null,
        dataModificacao: new Date(),
        sincronizado: false,
      })
      .where(eq(exercicios.id, input.id));
  }

  /**
   * Exclui um exercício personalizado.
   * Registros históricos (registrosExercicio) são preservados pois usam exercicioNome como snapshot.
   */
  async excluirExercicioPersonalizado(id: string): Promise<void> {
    const existente = await db
      .select()
      .from(exercicios)
      .where(and(eq(exercicios.id, id), eq(exercicios.ehPersonalizado, true)))
      .limit(1);

    if (existente.length === 0) {
      throw new Error('Exercício personalizado não encontrado');
    }

    await db.delete(exercicios).where(eq(exercicios.id, id));
  }
}

/** Instância singleton do serviço */
export const exercicioService = new ExercicioService();
