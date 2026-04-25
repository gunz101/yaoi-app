import { create } from 'zustand';

interface SessaoStore {
  sessaoAtivaId: string | null;
  cronometroAtivo: boolean;
  tempoDecorrido: number; // segundos
  pausado: boolean;
  descansoAtivo: boolean;
  descansoRestante: number | null;
  descansoExercicioNome: string | null;

  setSessaoAtiva: (id: string | null) => void;
  setCronometroAtivo: (ativo: boolean) => void;
  setTempoDecorrido: (tempo: number) => void;
  setPausado: (pausado: boolean) => void;
  setDescansoAtivo: (ativo: boolean) => void;
  setDescansoRestante: (tempo: number | null) => void;
  setDescansoExercicioNome: (nome: string | null) => void;
  reset: () => void;
}

const initialState = {
  sessaoAtivaId: null as string | null,
  cronometroAtivo: false,
  tempoDecorrido: 0,
  pausado: false,
  descansoAtivo: false,
  descansoRestante: null as number | null,
  descansoExercicioNome: null as string | null,
};

export const useSessaoStore = create<SessaoStore>()((set) => ({
  ...initialState,

  setSessaoAtiva: (id) => set({ sessaoAtivaId: id }),
  setCronometroAtivo: (ativo) => set({ cronometroAtivo: ativo }),
  setTempoDecorrido: (tempo) => set({ tempoDecorrido: tempo }),
  setPausado: (pausado) => set({ pausado }),
  setDescansoAtivo: (ativo) => set({ descansoAtivo: ativo }),
  setDescansoRestante: (tempo) => set({ descansoRestante: tempo }),
  setDescansoExercicioNome: (nome) => set({ descansoExercicioNome: nome }),
  reset: () => set(initialState),
}));
