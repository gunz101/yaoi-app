import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  sessoesDeTreino,
  registrosExercicio,
  seriesRegistradas,
} from '@/db/schema';
import type {
  PontoCarga,
  PontoVolume,
  EstatisticasResumo,
  Periodo,
  SessaoDeTreino,
  RegistroExercicio,
  SerieRegistrada,
} from '@/types';

/**
 * Serviço de progresso — evolução de carga, recordes, volume e estatísticas.
 */
export class ProgressoService {
  /**
   * Retorna pontos de carga máxima por data para um exercício.
   */
  async evolucaoCarga(exercicioId: string, periodo?: Periodo): Promise<PontoCarga[]> {
    // Buscar todas as sessões finalizadas
    let sessoes: SessaoDeTreino[];
    if (periodo) {
      sessoes = await db
        .select()
        .from(sessoesDeTreino)
        .where(
          and(
            eq(sessoesDeTreino.status, 'finalizada'),
            gte(sessoesDeTreino.dataInicio, periodo.inicio),
            lte(sessoesDeTreino.dataInicio, periodo.fim)
          )
        );
    } else {
      sessoes = await db
        .select()
        .from(sessoesDeTreino)
        .where(eq(sessoesDeTreino.status, 'finalizada'));
    }

    const pontos: PontoCarga[] = [];

    for (const sessao of sessoes) {
      const registros = await db
        .select()
        .from(registrosExercicio)
        .where(
          and(
            eq(registrosExercicio.sessaoId, sessao.id),
            eq(registrosExercicio.exercicioId, exercicioId)
          )
        );

      for (const reg of registros) {
        const series = await db
          .select()
          .from(seriesRegistradas)
          .where(eq(seriesRegistradas.registroId, reg.id));

        if (series.length > 0) {
          const maxCarga = Math.max(...series.map((s) => s.cargaUtilizada));
          const data = sessao.dataInicio instanceof Date
            ? sessao.dataInicio
            : new Date(sessao.dataInicio);
          pontos.push({ data, cargaMaxima: maxCarga });
        }
      }
    }

    pontos.sort((a, b) => a.data.getTime() - b.data.getTime());
    return pontos;
  }

  /**
   * Retorna a maior carga já registrada para um exercício.
   */
  async recordePessoal(exercicioId: string): Promise<number | null> {
    const registros = await db
      .select()
      .from(registrosExercicio)
      .where(eq(registrosExercicio.exercicioId, exercicioId));

    let maxCarga: number | null = null;

    for (const reg of registros) {
      const series = await db
        .select()
        .from(seriesRegistradas)
        .where(eq(seriesRegistradas.registroId, reg.id));

      for (const s of series) {
        if (maxCarga === null || s.cargaUtilizada > maxCarga) {
          maxCarga = s.cargaUtilizada;
        }
      }
    }

    return maxCarga;
  }

  /**
   * Calcula volume (séries × repetições × carga) por sessão para um exercício.
   */
  async volumePorSessao(exercicioId: string): Promise<PontoVolume[]> {
    const sessoes = await db
      .select()
      .from(sessoesDeTreino)
      .where(eq(sessoesDeTreino.status, 'finalizada'));

    const pontos: PontoVolume[] = [];

    for (const sessao of sessoes) {
      const registros = await db
        .select()
        .from(registrosExercicio)
        .where(
          and(
            eq(registrosExercicio.sessaoId, sessao.id),
            eq(registrosExercicio.exercicioId, exercicioId)
          )
        );

      let volumeSessao = 0;
      for (const reg of registros) {
        const series = await db
          .select()
          .from(seriesRegistradas)
          .where(eq(seriesRegistradas.registroId, reg.id));

        for (const s of series) {
          volumeSessao += s.repeticoesRealizadas * s.cargaUtilizada;
        }
      }

      if (volumeSessao > 0) {
        const data = sessao.dataInicio instanceof Date
          ? sessao.dataInicio
          : new Date(sessao.dataInicio);
        pontos.push({ data, volume: volumeSessao });
      }
    }

    pontos.sort((a, b) => a.data.getTime() - b.data.getTime());
    return pontos;
  }

  /**
   * Estatísticas resumidas: sessões no mês, frequência semanal, tempo total.
   */
  async estatisticasResumo(): Promise<EstatisticasResumo> {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

    const sessoesMes = await db
      .select()
      .from(sessoesDeTreino)
      .where(
        and(
          eq(sessoesDeTreino.status, 'finalizada'),
          gte(sessoesDeTreino.dataInicio, inicioMes),
          lte(sessoesDeTreino.dataInicio, fimMes)
        )
      );

    const totalSessoesMes = sessoesMes.length;

    // Frequência semanal: sessões no mês / semanas decorridas
    const diasDecorridos = Math.max(1, Math.ceil((agora.getTime() - inicioMes.getTime()) / (1000 * 60 * 60 * 24)));
    const semanasDecorridas = Math.max(1, diasDecorridos / 7);
    const frequenciaSemanal = Math.round((totalSessoesMes / semanasDecorridas) * 10) / 10;

    const tempoTotalTreino = sessoesMes.reduce((acc, s) => acc + (s.duracaoTotal ?? 0), 0);

    return {
      totalSessoesMes,
      frequenciaSemanal,
      tempoTotalTreino,
    };
  }

  /**
   * Lista sessões finalizadas com filtros opcionais.
   */
  async listarSessoes(filtro?: {
    periodo?: Periodo;
    fichaNome?: string;
  }): Promise<SessaoDeTreino[]> {
    let sessoes: SessaoDeTreino[];

    if (filtro?.periodo) {
      sessoes = await db
        .select()
        .from(sessoesDeTreino)
        .where(
          and(
            eq(sessoesDeTreino.status, 'finalizada'),
            gte(sessoesDeTreino.dataInicio, filtro.periodo.inicio),
            lte(sessoesDeTreino.dataInicio, filtro.periodo.fim)
          )
        )
        .orderBy(desc(sessoesDeTreino.dataInicio));
    } else {
      sessoes = await db
        .select()
        .from(sessoesDeTreino)
        .where(eq(sessoesDeTreino.status, 'finalizada'))
        .orderBy(desc(sessoesDeTreino.dataInicio));
    }

    if (filtro?.fichaNome) {
      sessoes = sessoes.filter((s) =>
        s.fichaNome.toLowerCase().includes(filtro.fichaNome!.toLowerCase())
      );
    }

    return sessoes;
  }

  /**
   * Obtém detalhes completos de uma sessão (exercícios + séries).
   */
  async detalhesSessao(sessaoId: string) {
    const sessaoResult = await db
      .select()
      .from(sessoesDeTreino)
      .where(eq(sessoesDeTreino.id, sessaoId))
      .limit(1);

    if (sessaoResult.length === 0) return null;

    const registros = await db
      .select()
      .from(registrosExercicio)
      .where(eq(registrosExercicio.sessaoId, sessaoId));

    registros.sort((a, b) => a.ordem - b.ordem);

    const registrosComSeries = [];
    for (const reg of registros) {
      const series = await db
        .select()
        .from(seriesRegistradas)
        .where(eq(seriesRegistradas.registroId, reg.id));
      series.sort((a, b) => a.numero - b.numero);
      registrosComSeries.push({ ...reg, series });
    }

    return {
      sessao: sessaoResult[0],
      registros: registrosComSeries,
    };
  }

  /**
   * Deleta uma sessão de treino. Cascade rules handle registros and series.
   */
  async deletarSessao(sessaoId: string): Promise<void> {
    await db.delete(sessoesDeTreino).where(eq(sessoesDeTreino.id, sessaoId));
  }

  /**
   * Lista exercícios únicos que possuem registros (para seletor de progresso).
   */
  async exerciciosComRegistros(): Promise<{ id: string; nome: string }[]> {
    const registros = await db.select().from(registrosExercicio);
    const mapa = new Map<string, string>();
    for (const r of registros) {
      if (r.exercicioId && !mapa.has(r.exercicioId)) {
        mapa.set(r.exercicioId, r.exercicioNome);
      }
    }
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }
}

export const progressoService = new ProgressoService();
