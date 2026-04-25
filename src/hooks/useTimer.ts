import { useCallback, useRef, useEffect } from 'react';
import { timerService } from '@/services/TimerService';
import { useSessaoStore } from '@/stores/sessaoStore';

/**
 * Formata segundos em HH:MM:SS.
 */
export function formatarTempo(totalSegundos: number): string {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Hook wrapper para TimerService com estado reativo via Zustand.
 */
export function useTimer() {
  const store = useSessaoStore();
  const timerRef = useRef(timerService);

  const iniciarCronometro = useCallback((initialOffset: number = 0) => {
    store.setCronometroAtivo(true);
    store.setPausado(false);
    timerRef.current.iniciarCronometro((elapsed) => {
      useSessaoStore.getState().setTempoDecorrido(elapsed);
    }, initialOffset);
  }, []);

  const pausarCronometro = useCallback(() => {
    timerRef.current.pausarCronometro();
    store.setPausado(true);
  }, []);

  const retomarCronometro = useCallback(() => {
    timerRef.current.retomarCronometro();
    store.setPausado(false);
  }, []);

  const pararCronometro = useCallback(() => {
    const tempo = timerRef.current.pararCronometro();
    store.setCronometroAtivo(false);
    store.setPausado(false);
    return tempo;
  }, []);

  const iniciarDescanso = useCallback((segundos: number, exercicioNome: string, onComplete: () => void) => {
    store.setDescansoAtivo(true);
    store.setDescansoRestante(segundos);
    store.setDescansoExercicioNome(exercicioNome);

    timerRef.current.iniciarDescanso(
      segundos,
      (restante) => {
        useSessaoStore.getState().setDescansoRestante(restante);
      },
      () => {
        useSessaoStore.getState().setDescansoAtivo(false);
        useSessaoStore.getState().setDescansoRestante(null);
        useSessaoStore.getState().setDescansoExercicioNome(null);
        onComplete();
      }
    );
  }, []);

  const cancelarDescanso = useCallback(() => {
    timerRef.current.cancelarDescanso();
    store.setDescansoAtivo(false);
    store.setDescansoRestante(null);
    store.setDescansoExercicioNome(null);
  }, []);

  const getTempoPausado = useCallback(() => {
    return timerRef.current.getTempoPausado();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount — don't destroy singleton, just remove interval
    };
  }, []);

  return {
    tempoDecorrido: store.tempoDecorrido,
    cronometroAtivo: store.cronometroAtivo,
    pausado: store.pausado,
    descansoAtivo: store.descansoAtivo,
    descansoRestante: store.descansoRestante,
    descansoExercicioNome: store.descansoExercicioNome,
    cronometroFormatado: formatarTempo(store.tempoDecorrido),

    iniciarCronometro,
    pausarCronometro,
    retomarCronometro,
    pararCronometro,
    iniciarDescanso,
    cancelarDescanso,
    getTempoPausado,
  };
}
