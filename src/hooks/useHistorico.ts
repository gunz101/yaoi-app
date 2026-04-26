import { useState, useCallback } from 'react';
import { progressoService } from '@/services/ProgressoService';
import type { SessaoDeTreino, Periodo, EstatisticasResumo } from '@/types';

interface SessaoDetalhes {
  sessao: SessaoDeTreino;
  registros: {
    id: string;
    exercicioNome: string;
    ordem: number;
    status: string;
    series: { numero: number; repeticoesRealizadas: number; cargaUtilizada: number }[];
  }[];
}

interface UseHistoricoReturn {
  sessoes: SessaoDeTreino[];
  sessaoSelecionada: SessaoDetalhes | null;
  estatisticas: EstatisticasResumo | null;
  carregando: boolean;
  erro: string | null;

  listarSessoes: (filtro?: { periodo?: Periodo; fichaNome?: string }) => Promise<void>;
  selecionarSessao: (sessaoId: string) => Promise<void>;
  fecharDetalhes: () => void;
  deletarSessao: (sessaoId: string) => Promise<void>;
  carregarEstatisticas: () => Promise<void>;
}

export function useHistorico(): UseHistoricoReturn {
  const [sessoes, setSessoes] = useState<SessaoDeTreino[]>([]);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoDetalhes | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasResumo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const listarSessoes = useCallback(async (filtro?: { periodo?: Periodo; fichaNome?: string }) => {
    try {
      setCarregando(true);
      setErro(null);
      const lista = await progressoService.listarSessoes(filtro);
      setSessoes(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao listar sessões');
    } finally {
      setCarregando(false);
    }
  }, []);

  const selecionarSessao = useCallback(async (sessaoId: string) => {
    try {
      setCarregando(true);
      const detalhes = await progressoService.detalhesSessao(sessaoId);
      if (detalhes) {
        setSessaoSelecionada(detalhes as SessaoDetalhes);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar detalhes');
    } finally {
      setCarregando(false);
    }
  }, []);

  const fecharDetalhes = useCallback(() => {
    setSessaoSelecionada(null);
  }, []);

  const deletarSessao = useCallback(async (sessaoId: string) => {
    try {
      setCarregando(true);
      await progressoService.deletarSessao(sessaoId);
      setSessaoSelecionada(null);
      await listarSessoes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao deletar sessão');
    } finally {
      setCarregando(false);
    }
  }, [listarSessoes]);

  const carregarEstatisticas = useCallback(async () => {
    try {
      const stats = await progressoService.estatisticasResumo();
      setEstatisticas(stats);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar estatísticas');
    }
  }, []);

  return {
    sessoes,
    sessaoSelecionada,
    estatisticas,
    carregando,
    erro,
    listarSessoes,
    selecionarSessao,
    fecharDetalhes,
    deletarSessao,
    carregarEstatisticas,
  };
}
