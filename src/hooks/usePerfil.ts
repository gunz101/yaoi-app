import { useState, useCallback } from 'react';
import { perfilService } from '@/services/PerfilService';
import { progressoService } from '@/services/ProgressoService';
import type { PesoCorporal, MedidaCorporal, EstatisticasResumo } from '@/types';

interface UsePerfilReturn {
  pesoAtual: PesoCorporal | null;
  historicoPesos: PesoCorporal[];
  medidas: MedidaCorporal[];
  partesDoCorpo: string[];
  estatisticas: EstatisticasResumo | null;
  carregando: boolean;
  erro: string | null;

  carregarPesoAtual: () => Promise<void>;
  carregarHistoricoPesos: () => Promise<void>;
  registrarPeso: (peso: number, nota?: string) => Promise<void>;
  deletarPeso: (id: string) => Promise<void>;
  carregarMedidas: (parteDoCorpo?: string) => Promise<void>;
  registrarMedida: (parteDoCorpo: string, valor: number, ehCustomizada?: boolean) => Promise<void>;
  deletarMedida: (id: string) => Promise<void>;
  carregarPartesDoCorpo: () => Promise<void>;
  carregarEstatisticas: () => Promise<void>;
}

export function usePerfil(): UsePerfilReturn {
  const [pesoAtual, setPesoAtual] = useState<PesoCorporal | null>(null);
  const [historicoPesos, setHistoricoPesos] = useState<PesoCorporal[]>([]);
  const [medidas, setMedidas] = useState<MedidaCorporal[]>([]);
  const [partesDoCorpo, setPartesDoCorpo] = useState<string[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasResumo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarPesoAtual = useCallback(async () => {
    try {
      const peso = await perfilService.pesoAtual();
      setPesoAtual(peso);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar peso');
    }
  }, []);

  const carregarHistoricoPesos = useCallback(async () => {
    try {
      setCarregando(true);
      const pesos = await perfilService.listarPesos();
      setHistoricoPesos(pesos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar histórico');
    } finally {
      setCarregando(false);
    }
  }, []);

  const registrarPeso = useCallback(async (peso: number, nota?: string) => {
    try {
      setCarregando(true);
      await perfilService.registrarPeso(peso, nota);
      await carregarPesoAtual();
      await carregarHistoricoPesos();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar peso');
    } finally {
      setCarregando(false);
    }
  }, [carregarPesoAtual, carregarHistoricoPesos]);

  const deletarPeso = useCallback(async (id: string) => {
    try {
      setCarregando(true);
      await perfilService.deletarPeso(id);
      await carregarPesoAtual();
      await carregarHistoricoPesos();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao deletar peso');
    } finally {
      setCarregando(false);
    }
  }, [carregarPesoAtual, carregarHistoricoPesos]);

  const carregarMedidas = useCallback(async (parteDoCorpo?: string) => {
    try {
      setCarregando(true);
      const lista = await perfilService.listarMedidas(parteDoCorpo);
      setMedidas(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar medidas');
    } finally {
      setCarregando(false);
    }
  }, []);

  const registrarMedida = useCallback(async (parteDoCorpo: string, valor: number, ehCustomizada?: boolean) => {
    try {
      setCarregando(true);
      await perfilService.registrarMedida(parteDoCorpo, valor, ehCustomizada);
      await carregarMedidas(parteDoCorpo);
      await carregarPartesDoCorpo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar medida');
    } finally {
      setCarregando(false);
    }
  }, []);

  const deletarMedida = useCallback(async (id: string, parteDoCorpo?: string) => {
    try {
      setCarregando(true);
      await perfilService.deletarMedida(id);
      if (parteDoCorpo) {
        await carregarMedidas(parteDoCorpo);
      }
      await carregarPartesDoCorpo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao deletar medida');
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarPartesDoCorpo = useCallback(async () => {
    try {
      const partes = await perfilService.partesDoCorpoRegistradas();
      setPartesDoCorpo(partes);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar partes do corpo');
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
    pesoAtual,
    historicoPesos,
    medidas,
    partesDoCorpo,
    estatisticas,
    carregando,
    erro,
    carregarPesoAtual,
    carregarHistoricoPesos,
    registrarPeso,
    deletarPeso,
    carregarMedidas,
    registrarMedida,
    deletarMedida,
    carregarPartesDoCorpo,
    carregarEstatisticas,
  };
}
