/**
 * Utilitários de normalização de texto para pesquisa e correspondência.
 */

/**
 * Remove acentos e diacríticos de uma string.
 */
export function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza texto para comparação: lowercase, sem acentos, trim.
 */
export function normalizar(texto: string): string {
  return removerAcentos(texto.toLowerCase().trim());
}

/**
 * Mapeia nomes de músculos em inglês (Free Exercise DB) para GrupoMuscular em português.
 */
const MAPA_MUSCULOS: Record<string, string> = {
  'chest': 'peito',
  'middle back': 'costas',
  'lower back': 'costas',
  'lats': 'costas',
  'traps': 'trapezio',
  'neck': 'trapezio',
  'shoulders': 'ombros',
  'biceps': 'biceps',
  'forearms': 'antebraco',
  'triceps': 'triceps',
  'abdominals': 'abdomen',
  'quadriceps': 'quadriceps',
  'hamstrings': 'posteriores',
  'glutes': 'gluteos',
  'calves': 'panturrilha',
  'adductors': 'quadriceps',
  'abductors': 'gluteos',
};

/**
 * Converte nome de músculo em inglês para GrupoMuscular em português.
 * Retorna o valor original normalizado se não encontrar mapeamento.
 */
export function mapearMusculo(muscleEn: string): string {
  const key = muscleEn.toLowerCase().trim();
  return MAPA_MUSCULOS[key] ?? normalizar(muscleEn);
}

/**
 * Verifica se um texto contém o termo de busca (normalizado).
 */
export function contemTermo(texto: string, termo: string): boolean {
  if (!termo) return true;
  return normalizar(texto).includes(normalizar(termo));
}
