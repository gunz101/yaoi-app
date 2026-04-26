import { useState, useCallback } from 'react';
import { progressoService } from '@/services/ProgressoService';
import type { PontoCarga, PontoVolume, EstatisticasResumo, Periodo } from '@/types';

interface UseProgressoReturn {
  exerciciosDisponiveis: { id: string; nome: string }[];
  exercicioSelecionado: string | null;
  dadosCarga: PontoCarga[];
  dadosVolume: PontoVolume[];
  recordePessoal: number | null;
  estatisticas: EstatisticasResumo | null;
  carregando: boolean;
  erro: string | null;

  carregarExercicios: () => Promise<void>;
  selecionarExercicio: (exercicioId: string) => Promise<void>;
  carregarEstatisticas: () => Promise<void>;
}

export function useProgresso(): UseProgressoReturn {
  const [exerciciosDisponiveis, setExerciciosDisponiveis] = useState<{ id: string; nome: string }[]>([]);
  const [exercicioSelecionado, setExercicioSelecionado] = useState<string | null>(null);
  const [dadosCarga, setDadosCarga] = useState<PontoCarga[]>([]);
  const [dadosVolume, setDadosVolume] = useState<PontoVolume[]>([]);
  const [recordePessoal, setRecordePessoal] = useState<number | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasResumo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarExercicios = useCallback(async () => {
    try {
      setCarregando(true);
      const exs = await progressoService.exerciciosComRegistros();
      setExerciciosDisponiveis(exs);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar exercícios');
    } finally {
      setCarregando(false);
    }
  }, []);

  const selecionarExercicio = useCallback(async (exercicioId: string) => {
    try {
      setCarregando(true);
      setErro(null);
      setExercicioSelecionado(exercicioId);

      const [carga, volume, recorde] = await Promise.all([
        progressoService.evolucaoCarga(exercicioId),
        progressoService.volumePorSessao(exercicioId),
        progressoService.recordePessoal(exercicioId),
      ]);

      setDadosCarga(carga);
      setDadosVolume(volume);
      setRecordePessoal(recorde);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar progresso');
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarEstatisticas = useCallback(async () => {
    try {
      const stats = await progressoService.estatisticasResumo();
      setEstatisticas(stats);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar estatísticas');
    }
  }, []);

  return {
    exerciciosDisponiveis,
    exercicioSelecionado,
    dadosCarga,
    dadosVolume,
    recordePessoal,
    estatisticas,
    carregando,
    erro,
    carregarExercicios,
    selecionarExercicio,
    carregarEstatisticas,
  };
}
