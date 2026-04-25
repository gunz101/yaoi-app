import { useState, useCallback, useEffect, useRef } from 'react';
import { exercicioService } from '@/services/ExercicioService';
import { recomendacaoService } from '@/services/RecomendacaoService';
import type {
  Exercicio,
  ExercicioPersonalizadoInput,
  FiltroExercicio,
  GrupoMuscular,
  RecomendacaoExercicio,
} from '@/types';

interface UseCatalogoReturn {
  exercicios: Exercicio[];
  recomendacoes: RecomendacaoExercicio[];
  termoBusca: string;
  filtros: FiltroExercicio;
  carregando: boolean;
  erro: string | null;

  setTermoBusca: (termo: string) => void;
  setFiltros: (filtros: FiltroExercicio) => void;
  pesquisar: () => Promise<void>;
  carregarCatalogo: () => Promise<void>;
  gerarRecomendacoes: (
    gruposMusculares: GrupoMuscular[],
    jaAdicionados: Exercicio[]
  ) => Promise<void>;
  criarPersonalizado: (input: ExercicioPersonalizadoInput) => Promise<void>;
  editarPersonalizado: (input: ExercicioPersonalizadoInput) => Promise<void>;
  excluirPersonalizado: (id: string) => Promise<void>;
  obterPorId: (id: string) => Promise<Exercicio | undefined>;
}

export function useCatalogo(): UseCatalogoReturn {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [recomendacoes, setRecomendacoes] = useState<RecomendacaoExercicio[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtros, setFiltros] = useState<FiltroExercicio>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarCatalogo = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      await exercicioService.carregarCatalogoLocal();
      const todos = await exercicioService.listarTodos();
      setExercicios(todos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar catálogo');
    } finally {
      setCarregando(false);
    }
  }, []);

  const pesquisar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const resultados = await exercicioService.pesquisar(termoBusca, filtros);
      setExercicios(resultados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro na pesquisa');
    } finally {
      setCarregando(false);
    }
  }, [termoBusca, filtros]);

  // Debounce de 300ms na pesquisa
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pesquisar();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [termoBusca, filtros]);

  const gerarRecomendacoes = useCallback(
    async (gruposMusculares: GrupoMuscular[], jaAdicionados: Exercicio[]) => {
      try {
        const recs = await recomendacaoService.gerarRecomendacoes(
          gruposMusculares,
          jaAdicionados
        );
        setRecomendacoes(recs);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao gerar recomendações');
      }
    },
    []
  );

  const criarPersonalizado = useCallback(
    async (input: ExercicioPersonalizadoInput) => {
      await exercicioService.criarExercicioPersonalizado(input);
      await pesquisar();
    },
    [pesquisar]
  );

  const editarPersonalizado = useCallback(
    async (input: ExercicioPersonalizadoInput) => {
      await exercicioService.editarExercicioPersonalizado(input);
      await pesquisar();
    },
    [pesquisar]
  );

  const excluirPersonalizado = useCallback(
    async (id: string) => {
      await exercicioService.excluirExercicioPersonalizado(id);
      await pesquisar();
    },
    [pesquisar]
  );

  const obterPorId = useCallback(async (id: string) => {
    return exercicioService.obterPorId(id);
  }, []);

  return {
    exercicios,
    recomendacoes,
    termoBusca,
    filtros,
    carregando,
    erro,
    setTermoBusca,
    setFiltros,
    pesquisar,
    carregarCatalogo,
    gerarRecomendacoes,
    criarPersonalizado,
    editarPersonalizado,
    excluirPersonalizado,
    obterPorId,
  };
}
