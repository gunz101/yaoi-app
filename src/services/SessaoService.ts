import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  sessoesDeTreino,
  registrosExercicio,
  seriesRegistradas,
  exerciciosNoPlano,
  exercicios,
  diasDeTreino,
  fichasDeTreino,
} from '@/db/schema';
import { generateUUID } from '@/utils/uuid';
import type {
  SessaoDeTreino,
  RegistroExercicio,
  SerieRegistrada,
  ResumoSessao,
  RegistroExercicioComDetalhes,
} from '@/types';

/**
 * Serviço responsável pelo ciclo de vida completo de sessões de treino.
 * Cada operação persiste imediatamente no SQLite via Drizzle (auto-save).
 */
export class SessaoService {
  /**
   * Inicia uma nova sessão de treino a partir de um dia de treino.
   * Carrega exercícios do plano com suas configurações.
   */
  async iniciarSessao(diaDeTreinoId: string): Promise<SessaoDeTreino> {
    const agora = new Date();
    const sessaoId = generateUUID();

    // Obter nome da ficha para snapshot
    const diaResult = await db
      .select()
      .from(diasDeTreino)
      .where(eq(diasDeTreino.id, diaDeTreinoId))
      .limit(1);

    let fichaNome = '';
    if (diaResult.length > 0) {
      const fichaResult = await db
        .select()
        .from(fichasDeTreino)
        .where(eq(fichasDeTreino.id, diaResult[0].fichaId))
        .limit(1);
      if (fichaResult.length > 0) {
        fichaNome = fichaResult[0].nome;
      }
    }

    // Criar sessão
    await db.insert(sessoesDeTreino).values({
      id: sessaoId,
      diaId: diaDeTreinoId,
      fichaNome,
      dataInicio: agora,
      dataFim: null,
      duracaoTotal: 0,
      tempoPausado: 0,
      status: 'em_andamento',
      dataModificacao: agora,
      sincronizado: false,
    });

    // Carregar exercícios do plano e criar registros
    const planejados = await db
      .select()
      .from(exerciciosNoPlano)
      .where(eq(exerciciosNoPlano.diaId, diaDeTreinoId));

    planejados.sort((a, b) => a.ordem - b.ordem);

    for (const plano of planejados) {
      const exResult = await db
        .select()
        .from(exercicios)
        .where(eq(exercicios.id, plano.exercicioId))
        .limit(1);

      const nomeExercicio = exResult.length > 0 ? exResult[0].nome : 'Exercício desconhecido';

      await db.insert(registrosExercicio).values({
        id: generateUUID(),
        exercicioId: plano.exercicioId,
        exercicioNome: nomeExercicio,
        ordem: plano.ordem,
        status: 'pendente',
        sessaoId: sessaoId,
        ehAvulso: false,
      });
    }

    const sessao = await db
      .select()
      .from(sessoesDeTreino)
      .where(eq(sessoesDeTreino.id, sessaoId))
      .limit(1);

    return sessao[0];
  }

  /**
   * Registra uma série para um exercício na sessão.
   * Atualiza o status do exercício para 'em_andamento' se estava 'pendente'.
   */
  async registrarSerie(
    sessaoId: string,
    exercicioId: string,
    repeticoes: number,
    carga: number
  ): Promise<SerieRegistrada> {
    // Encontrar o registro do exercício na sessão
    const registro = await db
      .select()
      .from(registrosExercicio)
      .where(
        and(
          eq(registrosExercicio.sessaoId, sessaoId),
          eq(registrosExercicio.exercicioId, exercicioId)
        )
      )
      .limit(1);

    if (registro.length === 0) {
      throw new Error('Exercício não encontrado na sessão');
    }

    const registroId = registro[0].id;

    // Contar séries existentes para determinar o número
    const seriesExistentes = await db
      .select()
      .from(seriesRegistradas)
      .where(eq(seriesRegistradas.registroId, registroId));

    const numero = seriesExistentes.length + 1;
    const serieId = generateUUID();
    const agora = new Date();

    await db.insert(seriesRegistradas).values({
      id: serieId,
      numero,
      repeticoesRealizadas: repeticoes,
      cargaUtilizada: carga,
      dataRegistro: agora,
      registroId,
    });

    // Atualizar status do exercício para 'em_andamento' se estava 'pendente'
    if (registro[0].status === 'pendente') {
      await db
        .update(registrosExercicio)
        .set({ status: 'em_andamento' })
        .where(eq(registrosExercicio.id, registroId));
    }

    // Atualizar dataModificacao da sessão
    await db
      .update(sessoesDeTreino)
      .set({ dataModificacao: agora })
      .where(eq(sessoesDeTreino.id, sessaoId));

    const serie = await db
      .select()
      .from(seriesRegistradas)
      .where(eq(seriesRegistradas.id, serieId))
      .limit(1);

    return serie[0];
  }

  /**
   * Edita a carga de uma série já registrada.
   */
  async editarCargaSerie(serieId: string, novaCarga: number): Promise<void> {
    await db
      .update(seriesRegistradas)
      .set({ cargaUtilizada: novaCarga })
      .where(eq(seriesRegistradas.id, serieId));
  }

  /**
   * Marca um exercício como concluído na sessão.
   */
  async marcarExercicioConcluido(sessaoId: string, exercicioId: string): Promise<void> {
    await db
      .update(registrosExercicio)
      .set({ status: 'concluido' })
      .where(
        and(
          eq(registrosExercicio.sessaoId, sessaoId),
          eq(registrosExercicio.exercicioId, exercicioId)
        )
      );

    await db
      .update(sessoesDeTreino)
      .set({ dataModificacao: new Date() })
      .where(eq(sessoesDeTreino.id, sessaoId));
  }

  /**
   * Adiciona um exercício avulso (não planejado) à sessão.
   */
  async adicionarExercicioAvulso(sessaoId: string, exercicioId: string): Promise<RegistroExercicio> {
    const exResult = await db
      .select()
      .from(exercicios)
      .where(eq(exercicios.id, exercicioId))
      .limit(1);

    if (exResult.length === 0) {
      throw new Error('Exercício não encontrado');
    }

    // Determinar próxima ordem
    const registrosExistentes = await db
      .select()
      .from(registrosExercicio)
      .where(eq(registrosExercicio.sessaoId, sessaoId));

    const maxOrdem = registrosExistentes.reduce((max, r) => Math.max(max, r.ordem), 0);

    const id = generateUUID();
    await db.insert(registrosExercicio).values({
      id,
      exercicioId,
      exercicioNome: exResult[0].nome,
      ordem: maxOrdem + 1,
      status: 'pendente',
      sessaoId,
      ehAvulso: true,
    });

    await db
      .update(sessoesDeTreino)
      .set({ dataModificacao: new Date() })
      .where(eq(sessoesDeTreino.id, sessaoId));

    const registro = await db
      .select()
      .from(registrosExercicio)
      .where(eq(registrosExercicio.id, id))
      .limit(1);

    return registro[0];
  }

  /**
   * Finaliza uma sessão calculando o ResumoSessao.
   */
  async finalizarSessao(sessaoId: string): Promise<ResumoSessao> {
    const agora = new Date();

    const sessaoResult = await db
      .select()
      .from(sessoesDeTreino)
      .where(eq(sessoesDeTreino.id, sessaoId))
      .limit(1);

    if (sessaoResult.length === 0) {
      throw new Error('Sessão não encontrada');
    }

    const sessao = sessaoResult[0];
    const dataInicio = sessao.dataInicio instanceof Date ? sessao.dataInicio : new Date(sessao.dataInicio);
    const duracaoTotal = (agora.getTime() - dataInicio.getTime()) / 1000 - (sessao.tempoPausado ?? 0);

    // Obter registros e séries
    const registros = await db
      .select()
      .from(registrosExercicio)
      .where(eq(registrosExercicio.sessaoId, sessaoId));

    let volumeTotal = 0;
    let exerciciosRealizados = 0;

    for (const reg of registros) {
      const series = await db
        .select()
        .from(seriesRegistradas)
        .where(eq(seriesRegistradas.registroId, reg.id));

      if (series.length > 0 || reg.status === 'concluido') {
        exerciciosRealizados++;
      }

      for (const s of series) {
        volumeTotal += s.repeticoesRealizadas * s.cargaUtilizada;
      }

      // Marcar exercícios com séries como concluídos
      if (series.length > 0 && reg.status !== 'concluido') {
        await db
          .update(registrosExercicio)
          .set({ status: 'concluido' })
          .where(eq(registrosExercicio.id, reg.id));
      }
    }

    // Atualizar sessão
    await db
      .update(sessoesDeTreino)
      .set({
        status: 'finalizada',
        dataFim: agora,
        duracaoTotal: Math.max(0, duracaoTotal),
        dataModificacao: agora,
      })
      .where(eq(sessoesDeTreino.id, sessaoId));

    return {
      duracaoTotal: Math.max(0, duracaoTotal),
      exerciciosRealizados,
      volumeTotal,
      registros,
    };
  }

  /**
   * Recupera uma sessão ativa (em_andamento) para recuperação de crash.
   */
  async recuperarSessaoAtiva(): Promise<SessaoDeTreino | null> {
    const resultado = await db
      .select()
      .from(sessoesDeTreino)
      .where(eq(sessoesDeTreino.status, 'em_andamento'))
      .limit(1);

    return resultado.length > 0 ? resultado[0] : null;
  }

  /**
   * Pausa o cronômetro da sessão.
   * Registra o momento da pausa para cálculo de tempo pausado.
   */
  async pausarCronometro(sessaoId: string): Promise<void> {
    await db
      .update(sessoesDeTreino)
      .set({
        status: 'pausada',
        dataModificacao: new Date(),
      })
      .where(eq(sessoesDeTreino.id, sessaoId));
  }

  /**
   * Retoma o cronômetro da sessão.
   * Calcula o tempo pausado e acumula.
   */
  async retomarCronometro(sessaoId: string): Promise<void> {
    await db
      .update(sessoesDeTreino)
      .set({
        status: 'em_andamento',
        dataModificacao: new Date(),
      })
      .where(eq(sessoesDeTreino.id, sessaoId));
  }

  /**
   * Atualiza o tempo pausado acumulado da sessão.
   */
  async atualizarTempoPausado(sessaoId: string, tempoPausado: number): Promise<void> {
    await db
      .update(sessoesDeTreino)
      .set({
        tempoPausado,
        dataModificacao: new Date(),
      })
      .where(eq(sessoesDeTreino.id, sessaoId));
  }

  /**
   * Obtém os registros de exercício de uma sessão com detalhes (séries e exercício).
   */
  async obterRegistrosComDetalhes(sessaoId: string): Promise<RegistroExercicioComDetalhes[]> {
    const registros = await db
      .select()
      .from(registrosExercicio)
      .where(eq(registrosExercicio.sessaoId, sessaoId));

    registros.sort((a, b) => a.ordem - b.ordem);

    const resultado: RegistroExercicioComDetalhes[] = [];

    for (const reg of registros) {
      const series = await db
        .select()
        .from(seriesRegistradas)
        .where(eq(seriesRegistradas.registroId, reg.id));

      series.sort((a, b) => a.numero - b.numero);

      let exercicio = undefined;
      if (reg.exercicioId) {
        const exResult = await db
          .select()
          .from(exercicios)
          .where(eq(exercicios.id, reg.exercicioId))
          .limit(1);
        exercicio = exResult[0];
      }

      resultado.push({
        ...reg,
        series,
        exercicio,
      });
    }

    return resultado;
  }

  /**
   * Obtém uma sessão por ID.
   */
  async obterSessao(sessaoId: string): Promise<SessaoDeTreino | null> {
    const resultado = await db
      .select()
      .from(sessoesDeTreino)
      .where(eq(sessoesDeTreino.id, sessaoId))
      .limit(1);

    return resultado.length > 0 ? resultado[0] : null;
  }

  /**
   * Obtém configuração do plano para um exercício em um dia de treino.
   */
  async obterConfigPlano(diaId: string, exercicioId: string) {
    const resultado = await db
      .select()
      .from(exerciciosNoPlano)
      .where(
        and(
          eq(exerciciosNoPlano.diaId, diaId),
          eq(exerciciosNoPlano.exercicioId, exercicioId)
        )
      )
      .limit(1);

    return resultado.length > 0 ? resultado[0] : null;
  }
}

/** Instância singleton do serviço */
export const sessaoService = new SessaoService();
