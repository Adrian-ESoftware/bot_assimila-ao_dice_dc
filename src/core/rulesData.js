/**
 * Dados oficiais extraídos do Livro Básico de Assimilação RPG.
 */

const SYMBOLS = {
  A: {
    key: 'A',
    name: 'Sucesso',
    plural: 'Sucessos',
    emojiName: 'as_sucesso',
    fallback: '🪲',
    colorHex: '#34D399',
    description: 'Eficácia no intento e ponto de controle narrativo para os Infectados.',
  },
  B: {
    key: 'B',
    name: 'Adaptação',
    plural: 'Adaptações',
    emojiName: 'as_adaptacao',
    fallback: '🦌',
    colorHex: '#38BDF8',
    description: 'Meio criativo para contornar dificuldades, anular Pressões (Ação Simples) ou transferir Sucessos/apoiar aliados (Conflito).',
  },
  C: {
    key: 'C',
    name: 'Pressão',
    plural: 'Pressões',
    emojiName: 'as_pressao',
    fallback: '🦉',
    colorHex: '#F87171',
    description: 'Consequência negativa ou limitação imposta pelo(a) Assimilador(a), podendo abater Determinação ou reduzir qualidade de posses.',
  },
};

const DICE_TYPES = {
  6: {
    sides: 6,
    code: 'd6',
    role: 'Instintos',
    emojiName: 'as_d6',
    fallback: '■',
    summary: '3 Pressões (50%), 1 Adaptação (17%), 1 Sucesso (17%) — dado menos eficiente.',
  },
  10: {
    sides: 10,
    code: 'd10',
    role: 'Conhecimentos, Práticas e Dano',
    emojiName: 'as_d10',
    fallback: '◆',
    summary: '5 Pressões (50%), 3 Adaptações (30%), 7 Sucessos (70%) — dado mais seguro.',
  },
  12: {
    sides: 12,
    code: 'd12',
    role: 'Rolagem Assimilada (Agir por Instinto) e Teste de Assimilação',
    emojiName: 'as_d12',
    fallback: '⬟',
    summary: '8 Pressões (67%), 5 Adaptações (42%), 8 Sucessos (67%) — maior risco e recompensa.',
  },
};

/**
 * Consequências das Pressões Mantidas (pág. 40).
 */
const PRESSURE_CONSEQUENCES = [
  { min: 1, max: 1, title: '1 Pressão — Consequência Menor', desc: 'Contratempo, frustração ou infortúnio leve definida pelo(a) Assimilador(a).' },
  { min: 2, max: 2, title: '2 Pressões — Consequência Relevante', desc: 'Consequência com impacto direto na cena atual.' },
  { min: 3, max: 3, title: '3 Pressões — Consequência Séria', desc: 'Consequência com impacto na narrativa.' },
  { min: 4, max: 4, title: '4 Pressões — Consequência Grave', desc: 'Consequência com impacto na narrativa de caráter permanente.' },
  { min: 5, max: 5, title: '5 Pressões — Consequência Crítica', desc: 'Consequência com potencial para mudar os rumos da aventura e do jogo.' },
  { min: 6, max: Infinity, title: '6+ Pressões — Consequência Devastadora', desc: 'Consequência terrível que muda parâmetros da construção do cenário.' },
];

function getPressureConsequence(count) {
  if (count <= 0) return null;
  return PRESSURE_CONSEQUENCES.find((p) => count >= p.min && count <= p.max) || PRESSURE_CONSEQUENCES[PRESSURE_CONSEQUENCES.length - 1];
}

const APTITUDES = {
  instintos: ['Influência', 'Percepção', 'Potência', 'Reação', 'Resolução', 'Sagacidade'],
  conhecimentos: ['Biologia', 'Erudição', 'Engenharia', 'Geografia', 'Medicina', 'Segurança'],
  praticas: ['Armas', 'Atletismo', 'Expressão', 'Furtividade', 'Manufaturas', 'Sobrevivência'],
};

const HEALTH_LEVELS = [
  { level: 6, name: 'Saudável', penalty: 'Sem penalidades', recovery: 'Repouso Completo (8h)' },
  { level: 5, name: 'Escoriação', penalty: 'Sem penalidades', recovery: 'Repouso Completo (8h)' },
  { level: 4, name: 'Laceração', penalty: '-1 Sucesso em todos os testes', recovery: 'Repouso Semanal' },
  { level: 3, name: 'Ferimentos', penalty: '-1 Sucesso em todos os testes', recovery: 'Repouso Semanal' },
  { level: 2, name: 'Debilitação', penalty: '-2 Sucessos e exige 1 Ponto de Determinação para agir', recovery: 'Não recupera naturalmente (requer Medicina)' },
  { level: 1, name: 'Incapacitação', penalty: 'Inconsciente; exige 1 Determinação p/ manter consciência e 2 Adaptações p/ agir', recovery: 'Não recupera naturalmente (requer Medicina)' },
];

module.exports = {
  SYMBOLS,
  DICE_TYPES,
  PRESSURE_CONSEQUENCES,
  getPressureConsequence,
  APTITUDES,
  HEALTH_LEVELS,
};
