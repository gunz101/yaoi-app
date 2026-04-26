import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { pesosCorporais, medidasCorporais } from '@/db/schema';
import { generateUUID } from '@/utils/uuid';
import type { PesoCorporal, MedidaCorporal, Periodo } from '@/types';

/**
 * Serviço de perfil — peso corporal e medidas corporais.
 */
export class PerfilService {
  /**
   * Registra um novo peso corporal.
   */
  async registrarPeso(peso: number, nota?: string): Promise<PesoCorporal> {
    const id = generateUUID();
    const agora = new Date();

    await db.insert(pesosCorporais).values({
      id,
      peso,
      data: agora,
      nota: nota ?? null,
      dataModificacao: agora,
      sincronizado: false,
    });

    const resultado = await db
      .select()
      .from(pesosCorporais)
      .where(eq(pesosCorporais.id, id))
      .limit(1);

    return resultado[0];
  }

  /**
   * Lista histórico de pesos, opcionalmente filtrado por período.
   */
  async listarPesos(periodo?: Periodo): Promise<PesoCorporal[]> {
    if (periodo) {
      return db
        .select()
        .from(pesosCorporais)
        .where(
          and(
            gte(pesosCorporais.data, periodo.inicio),
            lte(pesosCorporais.data, periodo.fim)
          )
        )
        .orderBy(desc(pesosCorporais.data));
    }
    return db
      .select()
      .from(pesosCorporais)
      .orderBy(desc(pesosCorporais.data));
  }

  /**
   * Retorna o peso mais recente.
   */
  async pesoAtual(): Promise<PesoCorporal | null> {
    const resultado = await db
      .select()
      .from(pesosCorporais)
      .orderBy(desc(pesosCorporais.data))
      .limit(1);

    return resultado.length > 0 ? resultado[0] : null;
  }

  /**
   * Registra uma medida corporal.
   */
  async registrarMedida(
    parteDoCorpo: string,
    valor: number,
    ehCustomizada: boolean = false
  ): Promise<MedidaCorporal> {
    const id = generateUUID();
    const agora = new Date();

    await db.insert(medidasCorporais).values({
      id,
      parteDoCorpo,
      valor,
      data: agora,
      ehCustomizada,
      dataModificacao: agora,
      sincronizado: false,
    });

    const resultado = await db
      .select()
      .from(medidasCorporais)
      .where(eq(medidasCorporais.id, id))
      .limit(1);

    return resultado[0];
  }

  /**
   * Lista medidas, opcionalmente filtradas por parte do corpo.
   */
  async listarMedidas(parteDoCorpo?: string): Promise<MedidaCorporal[]> {
    if (parteDoCorpo) {
      return db
        .select()
        .from(medidasCorporais)
        .where(eq(medidasCorporais.parteDoCorpo, parteDoCorpo))
        .orderBy(desc(medidasCorporais.data));
    }
    return db
      .select()
      .from(medidasCorporais)
      .orderBy(desc(medidasCorporais.data));
  }

  /**
   * Deleta um registro de peso corporal.
   */
  async deletarPeso(id: string): Promise<void> {
    await db.delete(pesosCorporais).where(eq(pesosCorporais.id, id));
  }

  /**
   * Deleta um registro de medida corporal.
   */
  async deletarMedida(id: string): Promise<void> {
    await db.delete(medidasCorporais).where(eq(medidasCorporais.id, id));
  }

  /**
   * Retorna lista de partes do corpo que possuem medidas registradas.
   */
  async partesDoCorpoRegistradas(): Promise<string[]> {
    const todas = await db.select().from(medidasCorporais);
    const partes = new Set<string>();
    for (const m of todas) {
      partes.add(m.parteDoCorpo);
    }
    return Array.from(partes).sort();
  }
}

export const perfilService = new PerfilService();
