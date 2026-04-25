import { useEffect, useState } from 'react';
import { runMigrations } from '@/db/client';
import { exercicioService } from '@/services/ExercicioService';

interface UseDatabaseReturn {
  /** Indica se o banco está pronto para uso */
  isReady: boolean;
  /** Erro ocorrido durante inicialização, se houver */
  error: Error | null;
}

/**
 * Hook que garante que o banco de dados está inicializado.
 * Executa migrations na montagem, carrega o catálogo de exercícios,
 * e retorna o estado de prontidão.
 * Usado no root layout para bloquear renderização até o DB estar pronto.
 */
export function useDatabase(): UseDatabaseReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initDatabase() {
      try {
        await runMigrations();
        // Carregar catálogo de exercícios na inicialização
        await exercicioService.carregarCatalogoLocal();
        if (mounted) {
          setIsReady(true);
        }
      } catch (err) {
        console.error('Erro ao inicializar banco de dados:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    initDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  return { isReady, error };
}
