import { eq, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  fichasDeTreino,
  diasDeTreino,
  exerciciosNoPlano,
  versoesFicha,
} from '@/db/schema';
import { generateUUID } from '@/utils/uuid';
import type {
  FichaDeTreino,
  DiaDeTreino,
  DiaDeTreinoInput,
  FichaDeTreinoUpdate,
  FichaDeTreinoComDias,
  ConfigExercicio,
  VersaoFicha,
  ExercicioNoPlano,
} from '@/types';

/**
 * Serviço responsável pelo CRUD de fichas de treino e dias de treino.
 */
export class FichaService {
  /**
   * Cria uma nova ficha de treino com dias.
   */
  async criarFicha(
    nome: string,
    dias: DiaDeTreinoInput[]
  ): Promise<FichaDeTreino> {
    const fichaId = generateUUID();
    const agora = new Date();

    await db.insert(fichasDeTreino).values({
      id: fichaId,
      nome,
      ativa: true,
      dataCriacao: agora,
      dataModificacao: agora,
      sincronizado: false,
    });

    for (const dia of dias) {
      await db.insert(diasDeTreino).values({
        id: generateUUID(),
        nome: dia.nome,
        diaDaSemana: dia.diaDaSemana,
        gruposMuscularesFoco: dia.gruposMuscularesFoco,
        fichaId,
        dataModificacao: agora,
      });
    }

    const resultado = await db
      .select()
      .from(fichasDeTreino)
      .where(eq(fichasDeTreino.id, fichaId))
      .limit(1);

    return resultado[0];
  }

  /**
   * Edita uma ficha existente. Cria snapshot de versão antes de editar.
   */
  async editarFicha(update: FichaDeTreinoUpdate): Promise<void> {
    // Criar snapshot antes da edição
    await this.criarSnapshot(update.id);

    const campos: Record<string, unknown> = {
      dataModificacao: new Date(),
      sincronizado: false,
    };

    if (update.nome !== undefined) campos.nome = update.nome;
    if (update.ativa !== undefined) campos.ativa = update.ativa;

    await db
      .update(fichasDeTreino)
      .set(campos)
      .where(eq(fichasDeTreino.id, update.id));
  }

  /**
   * Exclui uma ficha de treino.
   * Dias e exercícios no plano são removidos via CASCADE.
   * Sessões históricas são preservadas (fichaNome é snapshot).
   */
  async excluirFicha(fichaId: string): Promise<void> {
    await db
      .delete(fichasDeTreino)
      .where(eq(fichasDeTreino.id, fichaId));
  }

  /**
   * Lista todas as fichas de treino.
   */
  async listarFichas(): Promise<FichaDeTreino[]> {
    return db
      .select()
      .from(fichasDeTreino)
      .orderBy(desc(fichasDeTreino.dataModificacao));
  }

  /**
   * Obtém uma ficha com seus dias de treino.
   */
  async obterFichaComDias(fichaId: string): Promise<FichaDeTreinoComDias | null> {
    const fichaResult = await db
      .select()
      .from(fichasDeTreino)
      .where(eq(fichasDeTreino.id, fichaId))
      .limit(1);

    if (fichaResult.length === 0) return null;

    const dias = await db
      .select()
      .from(diasDeTreino)
      .where(eq(diasDeTreino.fichaId, fichaId));

    // Ordenar por dia da semana
    dias.sort((a, b) => a.diaDaSemana - b.diaDaSemana);

    return {
      ...fichaResult[0],
      dias,
    };
  }

  /**
   * Obtém exercícios de um dia de treino com suas configurações.
   */
  async obterExerciciosDoDia(diaId: string): Promise<ExercicioNoPlano[]> {
    return db
      .select()
      .from(exerciciosNoPlano)
      .where(eq(exerciciosNoPlano.diaId, diaId));
  }

  /**
   * Adiciona um exercício a um dia de treino.
   */
  async adicionarExercicio(
    diaId: string,
    exercicioId: string,
    config: ConfigExercicio
  ): Promise<void> {
    // Determinar próxima ordem
    const existentes = await db
      .select()
      .from(exerciciosNoPlano)
      .where(eq(exerciciosNoPlano.diaId, diaId));

    const maxOrdem = existentes.reduce(
      (max, e) => Math.max(max, e.ordem),
      0
    );

    await db.insert(exerciciosNoPlano).values({
      id: generateUUID(),
      ordem: maxOrdem + 1,
      seriesPlanejadas: config.series,
      repeticoesAlvo: config.repeticoesAlvo,
      cargaSugerida: config.cargaSugerida,
      tempoDescanso: config.tempoDescanso,
      exercicioId,
      diaId,
    });

    // Criar snapshot da ficha após modificação
    const dia = await db
      .select()
      .from(diasDeTreino)
      .where(eq(diasDeTreino.id, diaId))
      .limit(1);

    if (dia.length > 0) {
      await this.criarSnapshot(dia[0].fichaId);
    }
  }

  /**
   * Reordena exercícios dentro de um dia de treino.
   * @param diaId ID do dia de treino
   * @param novaOrdem Array de IDs de exerciciosNoPlano na nova ordem
   */
  async reordenarExercicios(
    diaId: string,
    novaOrdem: string[]
  ): Promise<void> {
    for (let i = 0; i < novaOrdem.length; i++) {
      await db
        .update(exerciciosNoPlano)
        .set({ ordem: i + 1 })
        .where(eq(exerciciosNoPlano.id, novaOrdem[i]));
    }

    // Criar snapshot da ficha após reordenação
    const dia = await db
      .select()
      .from(diasDeTreino)
      .where(eq(diasDeTreino.id, diaId))
      .limit(1);

    if (dia.length > 0) {
      await this.criarSnapshot(dia[0].fichaId);
    }
  }

  /**
   * Obtém o histórico de versões de uma ficha.
   */
  async obterHistoricoVersoes(fichaId: string): Promise<VersaoFicha[]> {
    return db
      .select()
      .from(versoesFicha)
      .where(eq(versoesFicha.fichaId, fichaId))
      .orderBy(desc(versoesFicha.dataVersao));
  }

  /**
   * Adiciona um dia de treino a uma ficha existente.
   */
  async adicionarDia(
    fichaId: string,
    dia: DiaDeTreinoInput
  ): Promise<DiaDeTreino> {
    const id = generateUUID();
    const agora = new Date();

    await db.insert(diasDeTreino).values({
      id,
      nome: dia.nome,
      diaDaSemana: dia.diaDaSemana,
      gruposMuscularesFoco: dia.gruposMuscularesFoco,
      fichaId,
      dataModificacao: agora,
    });

    // Atualizar data de modificação da ficha
    await db
      .update(fichasDeTreino)
      .set({ dataModificacao: agora, sincronizado: false })
      .where(eq(fichasDeTreino.id, fichaId));

    await this.criarSnapshot(fichaId);

    const resultado = await db
      .select()
      .from(diasDeTreino)
      .where(eq(diasDeTreino.id, id))
      .limit(1);

    return resultado[0];
  }

  /**
   * Remove um dia de treino de uma ficha.
   */
  async removerDia(diaId: string): Promise<void> {
    const dia = await db
      .select()
      .from(diasDeTreino)
      .where(eq(diasDeTreino.id, diaId))
      .limit(1);

    if (dia.length > 0) {
      await this.criarSnapshot(dia[0].fichaId);
    }

    await db.delete(diasDeTreino).where(eq(diasDeTreino.id, diaId));
  }

  /**
   * Cria um snapshot JSON da ficha atual para histórico de versões.
   */
  private async criarSnapshot(fichaId: string): Promise<void> {
    const ficha = await this.obterFichaComDias(fichaId);
    if (!ficha) return;

    // Carregar exercícios de cada dia
    const diasComExercicios = await Promise.all(
      ficha.dias.map(async (dia) => {
        const exs = await db
          .select()
          .from(exerciciosNoPlano)
          .where(eq(exerciciosNoPlano.diaId, dia.id));
        return { ...dia, exercicios: exs };
      })
    );

    const snapshot = {
      ...ficha,
      dias: diasComExercicios,
    };

    await db.insert(versoesFicha).values({
      id: generateUUID(),
      fichaId,
      snapshotJSON: JSON.stringify(snapshot),
      dataVersao: new Date(),
    });
  }
}

/** Instância singleton do serviço */
export const fichaService = new FichaService();
