import { useState, useCallback } from 'react';
import { fichaService } from '@/services/FichaService';
import type {
  FichaDeTreino,
  FichaDeTreinoComDias,
  FichaDeTreinoUpdate,
  DiaDeTreinoInput,
  ConfigExercicio,
  VersaoFicha,
  ExercicioNoPlano,
} from '@/types';

interface UseFichaReturn {
  fichas: FichaDeTreino[];
  fichaAtual: FichaDeTreinoComDias | null;
  exerciciosDoDia: ExercicioNoPlano[];
  carregando: boolean;
  erro: string | null;

  listarFichas: () => Promise<void>;
  criarFicha: (nome: string, dias: DiaDeTreinoInput[]) => Promise<FichaDeTreino>;
  editarFicha: (update: FichaDeTreinoUpdate) => Promise<void>;
  excluirFicha: (fichaId: string) => Promise<void>;
  selecionarFicha: (fichaId: string) => Promise<void>;
  adicionarExercicio: (
    diaId: string,
    exercicioId: string,
    config: ConfigExercicio
  ) => Promise<void>;
  editarExercicioNoPlano: (
    exercicioNoPlanoId: string,
    config: Partial<ConfigExercicio>
  ) => Promise<void>;
  removerExercicio: (exercicioNoPlanoId: string) => Promise<void>;
  duplicarFicha: (fichaId: string) => Promise<FichaDeTreino>;
  reordenarExercicios: (diaId: string, novaOrdem: string[]) => Promise<void>;
  carregarExerciciosDoDia: (diaId: string) => Promise<void>;
  adicionarDia: (fichaId: string, dia: DiaDeTreinoInput) => Promise<void>;
  removerDia: (diaId: string) => Promise<void>;
  obterHistorico: (fichaId: string) => Promise<VersaoFicha[]>;
}

export function useFicha(): UseFichaReturn {
  const [fichas, setFichas] = useState<FichaDeTreino[]>([]);
  const [fichaAtual, setFichaAtual] = useState<FichaDeTreinoComDias | null>(null);
  const [exerciciosDoDia, setExerciciosDoDia] = useState<ExercicioNoPlano[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const listarFichas = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const lista = await fichaService.listarFichas();
      setFichas(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao listar fichas');
    } finally {
      setCarregando(false);
    }
  }, []);

  const criarFicha = useCallback(
    async (nome: string, dias: DiaDeTreinoInput[]) => {
      setCarregando(true);
      setErro(null);
      try {
        const ficha = await fichaService.criarFicha(nome, dias);
        await listarFichas();
        return ficha;
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao criar ficha');
        throw e;
      } finally {
        setCarregando(false);
      }
    },
    [listarFichas]
  );

  const editarFicha = useCallback(
    async (update: FichaDeTreinoUpdate) => {
      await fichaService.editarFicha(update);
      await listarFichas();
      if (fichaAtual && fichaAtual.id === update.id) {
        const atualizada = await fichaService.obterFichaComDias(update.id);
        setFichaAtual(atualizada);
      }
    },
    [listarFichas, fichaAtual]
  );

  const excluirFicha = useCallback(
    async (fichaId: string) => {
      await fichaService.excluirFicha(fichaId);
      if (fichaAtual?.id === fichaId) setFichaAtual(null);
      await listarFichas();
    },
    [listarFichas, fichaAtual]
  );

  const selecionarFicha = useCallback(async (fichaId: string) => {
    try {
      setCarregando(true);
      const ficha = await fichaService.obterFichaComDias(fichaId);
      setFichaAtual(ficha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar ficha');
    } finally {
      setCarregando(false);
    }
  }, []);

  const adicionarExercicio = useCallback(
    async (diaId: string, exercicioId: string, config: ConfigExercicio) => {
      await fichaService.adicionarExercicio(diaId, exercicioId, config);
      await carregarExerciciosDoDia(diaId);
    },
    []
  );

  const reordenarExercicios = useCallback(
    async (diaId: string, novaOrdem: string[]) => {
      await fichaService.reordenarExercicios(diaId, novaOrdem);
      await carregarExerciciosDoDia(diaId);
    },
    []
  );

  const carregarExerciciosDoDia = useCallback(async (diaId: string) => {
    const exs = await fichaService.obterExerciciosDoDia(diaId);
    exs.sort((a, b) => a.ordem - b.ordem);
    setExerciciosDoDia(exs);
  }, []);

  const adicionarDia = useCallback(
    async (fichaId: string, dia: DiaDeTreinoInput) => {
      await fichaService.adicionarDia(fichaId, dia);
      const atualizada = await fichaService.obterFichaComDias(fichaId);
      setFichaAtual(atualizada);
    },
    []
  );

  const removerDia = useCallback(
    async (diaId: string) => {
      await fichaService.removerDia(diaId);
      if (fichaAtual) {
        const atualizada = await fichaService.obterFichaComDias(fichaAtual.id);
        setFichaAtual(atualizada);
      }
    },
    [fichaAtual]
  );

  const obterHistorico = useCallback(async (fichaId: string) => {
    return fichaService.obterHistoricoVersoes(fichaId);
  }, []);

  const editarExercicioNoPlano = useCallback(
    async (exercicioNoPlanoId: string, config: Partial<ConfigExercicio>) => {
      await fichaService.editarExercicioNoPlano(exercicioNoPlanoId, config);
      if (fichaAtual) {
        const atualizada = await fichaService.obterFichaComDias(fichaAtual.id);
        setFichaAtual(atualizada);
      }
    },
    [fichaAtual]
  );

  const removerExercicio = useCallback(
    async (exercicioNoPlanoId: string) => {
      await fichaService.removerExercicioDoPlano(exercicioNoPlanoId);
      if (fichaAtual) {
        const atualizada = await fichaService.obterFichaComDias(fichaAtual.id);
        setFichaAtual(atualizada);
      }
    },
    [fichaAtual]
  );

  const duplicarFichaHook = useCallback(
    async (fichaId: string) => {
      const novaFicha = await fichaService.duplicarFicha(fichaId);
      await listarFichas();
      return novaFicha;
    },
    [listarFichas]
  );

  return {
    fichas,
    fichaAtual,
    exerciciosDoDia,
    carregando,
    erro,
    listarFichas,
    criarFicha,
    editarFicha,
    excluirFicha,
    selecionarFicha,
    adicionarExercicio,
    editarExercicioNoPlano,
    removerExercicio,
    duplicarFicha: duplicarFichaHook,
    reordenarExercicios,
    carregarExerciciosDoDia,
    adicionarDia,
    removerDia,
    obterHistorico,
  };
}
