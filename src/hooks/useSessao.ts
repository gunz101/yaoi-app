import { useState, useCallback } from 'react';
import { sessaoService } from '@/services/SessaoService';
import { notificacaoService } from '@/services/NotificacaoService';
import { useSessaoStore } from '@/stores/sessaoStore';
import { useTimer } from './useTimer';
import type {
  SessaoDeTreino,
  RegistroExercicioComDetalhes,
  ResumoSessao,
  SerieRegistrada,
  ExercicioNoPlano,
} from '@/types';

interface UseSessaoReturn {
  sessaoAtiva: SessaoDeTreino | null;
  exercicios: RegistroExercicioComDetalhes[];
  carregando: boolean;
  erro: string | null;
  resumo: ResumoSessao | null;

  iniciarSessao: (diaDeTreinoId: string) => Promise<SessaoDeTreino>;
  carregarSessao: (sessaoId: string) => Promise<void>;
  registrarSerie: (
    exercicioId: string,
    repeticoes: number,
    carga: number,
    tempoDescanso?: number
  ) => Promise<SerieRegistrada>;
  editarCargaSerie: (serieId: string, novaCarga: number) => Promise<void>;
  marcarExercicioConcluido: (exercicioId: string) => Promise<void>;
  adicionarExercicioAvulso: (exercicioId: string) => Promise<void>;
  finalizarSessao: () => Promise<ResumoSessao>;
  pausarCronometro: () => void;
  retomarCronometro: () => void;
  pularDescanso: () => void;
  recarregarExercicios: () => Promise<void>;
  obterConfigPlano: (diaId: string, exercicioId: string) => Promise<ExercicioNoPlano | null>;
}

export function useSessao(): UseSessaoReturn {
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoDeTreino | null>(null);
  const [exercicios, setExercicios] = useState<RegistroExercicioComDetalhes[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoSessao | null>(null);

  const store = useSessaoStore();
  const timer = useTimer();

  const recarregarExercicios = useCallback(async () => {
    const sessaoId = useSessaoStore.getState().sessaoAtivaId;
    if (!sessaoId) return;
    const regs = await sessaoService.obterRegistrosComDetalhes(sessaoId);
    setExercicios(regs);
  }, []);

  const iniciarSessao = useCallback(async (diaDeTreinoId: string) => {
    try {
      setCarregando(true);
      setErro(null);
      const sessao = await sessaoService.iniciarSessao(diaDeTreinoId);
      setSessaoAtiva(sessao);
      store.setSessaoAtiva(sessao.id);

      // Carregar exercícios
      const regs = await sessaoService.obterRegistrosComDetalhes(sessao.id);
      setExercicios(regs);

      // Iniciar cronômetro
      timer.iniciarCronometro(0);

      // Solicitar permissão de notificação
      await notificacaoService.solicitarPermissao();

      return sessao;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar sessão';
      setErro(msg);
      throw e;
    } finally {
      setCarregando(false);
    }
  }, [timer]);

  const carregarSessao = useCallback(async (sessaoId: string) => {
    try {
      setCarregando(true);
      setErro(null);
      const sessao = await sessaoService.obterSessao(sessaoId);
      if (!sessao) throw new Error('Sessão não encontrada');

      setSessaoAtiva(sessao);
      store.setSessaoAtiva(sessao.id);

      const regs = await sessaoService.obterRegistrosComDetalhes(sessao.id);
      setExercicios(regs);

      // Calcular tempo já decorrido e iniciar cronômetro
      if (sessao.status === 'em_andamento' || sessao.status === 'pausada') {
        const dataInicio = sessao.dataInicio instanceof Date
          ? sessao.dataInicio
          : new Date(sessao.dataInicio);
        const elapsed = (Date.now() - dataInicio.getTime()) / 1000 - (sessao.tempoPausado ?? 0);
        timer.iniciarCronometro(Math.max(0, Math.floor(elapsed)));

        if (sessao.status === 'pausada') {
          timer.pausarCronometro();
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar sessão';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, [timer]);

  const registrarSerie = useCallback(async (
    exercicioId: string,
    repeticoes: number,
    carga: number,
    tempoDescanso?: number
  ) => {
    const sessaoId = useSessaoStore.getState().sessaoAtivaId;
    if (!sessaoId) throw new Error('Nenhuma sessão ativa');

    const serie = await sessaoService.registrarSerie(sessaoId, exercicioId, repeticoes, carga);

    // Recarregar exercícios para atualizar status
    const regs = await sessaoService.obterRegistrosComDetalhes(sessaoId);
    setExercicios(regs);

    // Iniciar descanso se configurado
    if (tempoDescanso && tempoDescanso > 0) {
      const reg = regs.find(r => r.exercicioId === exercicioId);
      const nomeEx = reg?.exercicioNome ?? 'exercício';

      timer.iniciarDescanso(tempoDescanso, nomeEx, () => {
        // Descanso finalizado — notificação já é tratada pelo timer
      });

      // Agendar notificação para background
      try {
        await notificacaoService.agendarNotificacaoDescanso(tempoDescanso, nomeEx);
      } catch {
        // Notificação pode falhar se permissão não concedida
      }
    }

    return serie;
  }, [timer]);

  const editarCargaSerie = useCallback(async (serieId: string, novaCarga: number) => {
    await sessaoService.editarCargaSerie(serieId, novaCarga);
    await recarregarExercicios();
  }, [recarregarExercicios]);

  const marcarExercicioConcluido = useCallback(async (exercicioId: string) => {
    const sessaoId = useSessaoStore.getState().sessaoAtivaId;
    if (!sessaoId) return;
    await sessaoService.marcarExercicioConcluido(sessaoId, exercicioId);
    await recarregarExercicios();
  }, [recarregarExercicios]);

  const adicionarExercicioAvulso = useCallback(async (exercicioId: string) => {
    const sessaoId = useSessaoStore.getState().sessaoAtivaId;
    if (!sessaoId) return;
    await sessaoService.adicionarExercicioAvulso(sessaoId, exercicioId);
    await recarregarExercicios();
  }, [recarregarExercicios]);

  const finalizarSessao = useCallback(async () => {
    const sessaoId = useSessaoStore.getState().sessaoAtivaId;
    if (!sessaoId) throw new Error('Nenhuma sessão ativa');

    // Atualizar tempo pausado
    const tempoPausado = timer.getTempoPausado();
    await sessaoService.atualizarTempoPausado(sessaoId, tempoPausado);

    timer.pararCronometro();
    timer.cancelarDescanso();
    await notificacaoService.cancelarNotificacoesPendentes();

    const res = await sessaoService.finalizarSessao(sessaoId);
    setResumo(res);
    setSessaoAtiva(null);
    store.reset();

    return res;
  }, [timer]);

  const pausarCronometro = useCallback(() => {
    timer.pausarCronometro();
    const sessaoId = useSessaoStore.getState().sessaoAtivaId;
    if (sessaoId) {
      sessaoService.pausarCronometro(sessaoId);
    }
  }, [timer]);

  const retomarCronometro = useCallback(() => {
    timer.retomarCronometro();
    const sessaoId = useSessaoStore.getState().sessaoAtivaId;
    if (sessaoId) {
      sessaoService.retomarCronometro(sessaoId);
    }
  }, [timer]);

  const pularDescanso = useCallback(() => {
    timer.cancelarDescanso();
    notificacaoService.cancelarNotificacoesPendentes();
  }, [timer]);

  const obterConfigPlano = useCallback(async (diaId: string, exercicioId: string) => {
    return sessaoService.obterConfigPlano(diaId, exercicioId);
  }, []);

  return {
    sessaoAtiva,
    exercicios,
    carregando,
    erro,
    resumo,
    iniciarSessao,
    carregarSessao,
    registrarSerie,
    editarCargaSerie,
    marcarExercicioConcluido,
    adicionarExercicioAvulso,
    finalizarSessao,
    pausarCronometro,
    retomarCronometro,
    pularDescanso,
    recarregarExercicios,
    obterConfigPlano,
  };
}
