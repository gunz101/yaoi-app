import { db } from '@/db/client';
import { exercicios } from '@/db/schema';
import { normalizar } from '@/utils/normalizers';
import type {
  Exercicio,
  GrupoMuscular,
  RecomendacaoExercicio,
} from '@/types';

/**
 * Serviço de recomendação de exercícios complementares.
 * Filtra por grupo muscular, exclui já adicionados, e calcula relevância.
 */
export class RecomendacaoService {
  /**
   * Gera recomendações de exercícios para os grupos musculares selecionados.
   *
   * Algoritmo:
   * 1. Filtra exercícios do catálogo pelos grupos musculares
   * 2. Exclui exercícios já adicionados ao dia
   * 3. Calcula score de relevância (0.0 a 1.0) baseado em:
   *    - Variação de equipamento (+0.2)
   *    - Variação de tipo de movimento (+0.2)
   *    - Disponibilidade de GIF (+0.1)
   *    - Match de grupo muscular principal (+0.5 base)
   * 4. Ordena por relevância decrescente
   */
  async gerarRecomendacoes(
    gruposMusculares: GrupoMuscular[],
    exerciciosJaAdicionados: Exercicio[]
  ): Promise<RecomendacaoExercicio[]> {
    if (gruposMusculares.length === 0) return [];

    // Buscar todos os exercícios do catálogo
    const catalogo = await db.select().from(exercicios);

    // IDs dos exercícios já adicionados
    const idsJaAdicionados = new Set(exerciciosJaAdicionados.map((e) => e.id));

    // Equipamentos e mecânicas já usados
    const equipamentosUsados = new Set(
      exerciciosJaAdicionados
        .map((e) => e.equipamento)
        .filter(Boolean)
        .map((e) => normalizar(e!))
    );

    const mecanicasUsadas = new Set(
      exerciciosJaAdicionados
        .map((e) => e.mecanica)
        .filter(Boolean)
        .map((m) => normalizar(m!))
    );

    // Normalizar grupos musculares alvo
    const gruposNorm = new Set(gruposMusculares.map((g) => normalizar(g)));

    // Filtrar e pontuar
    const recomendacoes: RecomendacaoExercicio[] = [];

    for (const ex of catalogo) {
      // Excluir já adicionados
      if (idsJaAdicionados.has(ex.id)) continue;

      // Verificar se o exercício é relevante para os grupos musculares
      const grupoPrincipalNorm = normalizar(ex.grupoMuscularPrincipal);
      const grupoSecundarioNorm = ex.grupoMuscularSecundario
        ? normalizar(ex.grupoMuscularSecundario)
        : null;

      const matchPrincipal = gruposNorm.has(grupoPrincipalNorm);
      const matchSecundario = grupoSecundarioNorm
        ? gruposNorm.has(grupoSecundarioNorm)
        : false;

      if (!matchPrincipal && !matchSecundario) continue;

      // Calcular score de relevância
      let score = 0;
      const motivos: string[] = [];

      // Base: match de grupo muscular principal
      if (matchPrincipal) {
        score += 0.5;
        motivos.push(`Trabalha ${ex.grupoMuscularPrincipal}`);
      } else if (matchSecundario) {
        score += 0.3;
        motivos.push(`Trabalha ${ex.grupoMuscularSecundario} como secundário`);
      }

      // Bonus: variação de equipamento
      const equipNorm = ex.equipamento ? normalizar(ex.equipamento) : null;
      if (equipNorm && !equipamentosUsados.has(equipNorm)) {
        score += 0.2;
        motivos.push(`Variação de equipamento (${ex.equipamento})`);
      }

      // Bonus: variação de tipo de movimento (mecânica)
      const mecNorm = ex.mecanica ? normalizar(ex.mecanica) : null;
      if (mecNorm && !mecanicasUsadas.has(mecNorm)) {
        score += 0.2;
        motivos.push(
          `Variação de movimento (${ex.mecanica === 'compound' ? 'composto' : 'isolado'})`
        );
      }

      // Bonus: GIF disponível
      if (ex.gifURL) {
        score += 0.1;
        motivos.push('Com demonstração em GIF');
      }

      // Clamp score to 0.0 - 1.0
      score = Math.min(1.0, Math.max(0.0, score));

      recomendacoes.push({
        exercicio: ex,
        motivo: motivos.join('. '),
        relevancia: Math.round(score * 100) / 100,
      });
    }

    // Ordenar por relevância decrescente
    recomendacoes.sort((a, b) => b.relevancia - a.relevancia);

    return recomendacoes;
  }
}

/** Instância singleton do serviço */
export const recomendacaoService = new RecomendacaoService();
