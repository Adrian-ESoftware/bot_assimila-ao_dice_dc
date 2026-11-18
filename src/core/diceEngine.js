const crypto = require('crypto');

/**
 * Tabela oficial de faces dos dados de Assimilação RPG (pág. 35 e pág. 43).
 */
const DIE_FACES = {
  6: {
    1: [],
    2: [],
    3: ['C'],
    4: ['C'],
    5: ['B', 'C'],
    6: ['A'],
  },
  10: {
    1: [],
    2: [],
    3: ['C'],
    4: ['C'],
    5: ['B', 'C'],
    6: ['A'],
    7: ['A', 'A'],
    8: ['A', 'B'],
    9: ['A', 'B', 'C'],
    10: ['A', 'A', 'C'],
  },
  12: {
    1: [],
    2: [],
    3: ['C'],
    4: ['C'],
    5: ['B', 'C'],
    6: ['A'],
    7: ['A', 'A'],
    8: ['A', 'B'],
    9: ['A', 'B', 'C'],
    10: ['A', 'A', 'C'],
    11: ['A', 'B', 'B', 'C'],
    12: ['C', 'C'],
  },
};

function defaultRandomInt(max) {
  return crypto.randomInt(1, max + 1);
}

function countSymbols(symbols) {
  const counts = { A: 0, B: 0, C: 0 };
  for (const s of symbols) {
    if (counts[s] !== undefined) counts[s] += 1;
  }
  return counts;
}

function formatFaceCode(symbols) {
  if (!symbols || symbols.length === 0) return '-';
  return symbols.join('');
}

function rollSingleDie(sides, index, rng = defaultRandomInt) {
  const table = DIE_FACES[sides];
  if (!table) {
    throw new Error(`Tipo de dado não suportado: d${sides}. Use d6, d10 ou d12.`);
  }
  const faceNumber = rng(sides);
  const symbols = [...table[faceNumber]];
  const counts = countSymbols(symbols);
  return {
    index,
    sides,
    faceNumber,
    symbols,
    counts,
    faceCode: formatFaceCode(symbols),
    totalSymbols: symbols.length,
  };
}

/**
 * Heurística de escolha padrão de dados mantidos:
 * Prioriza Sucesso (A), valoriza Adaptação (B) e penaliza Pressão (C).
 * Assim faces vazias (0) têm prioridade sobre faces só com Pressão (-25).
 */
function scoreDie(die) {
  return die.counts.A * 100 + die.counts.B * 10 - die.counts.C * 25 + die.sides * 0.01;
}

function pickBestKeptIndices(dice, keepCount) {
  const limit = Math.min(Math.max(1, keepCount), dice.length);
  const ranked = [...dice].sort((x, y) => scoreDie(y) - scoreDie(x));
  return ranked.slice(0, limit).map((d) => d.index).sort((a, b) => a - b);
}

function summarizeKeptDice(dice, keptIndices) {
  const keptSet = new Set(keptIndices);
  const totals = { A: 0, B: 0, C: 0, totalSymbols: 0 };
  for (const die of dice) {
    if (!keptSet.has(die.index)) continue;
    totals.A += die.counts.A;
    totals.B += die.counts.B;
    totals.C += die.counts.C;
    totals.totalSymbols += die.totalSymbols;
  }
  return totals;
}

function formatPoolExpression(pool) {
  const parts = [];
  if (pool.d6 > 0) parts.push(`${pool.d6}d6`);
  if (pool.d10 > 0) parts.push(`${pool.d10}d10`);
  if (pool.d12 > 0) parts.push(`${pool.d12}d12`);
  return parts.join(' + ');
}

function getTotalDiceCount(pool) {
  return (pool.d6 || 0) + (pool.d10 || 0) + (pool.d12 || 0);
}

/**
 * Executa uma rolagem completa de Assimilação RPG.
 */
function executeRoll(pool, options = {}, rng = defaultRandomInt) {
  const normalizedPool = {
    d6: pool.d6 || 0,
    d10: pool.d10 || 0,
    d12: pool.d12 || 0,
  };
  const totalDice = getTotalDiceCount(normalizedPool);
  if (totalDice <= 0) {
    throw new Error('Nenhum dado especificado para rolar.');
  }

  const mode = options.mode || 'standard'; // standard | assimilated | damage | conflict | assimilation_test
  const keepAll = Boolean(options.keepAll) || mode === 'damage' || mode === 'conflict' || mode === 'assimilation_test';
  const requestedKeep = keepAll ? totalDice : Math.min(totalDice, Math.max(1, options.keepCount || 1));

  const dice = [];
  let idx = 0;
  for (const sides of [6, 10, 12]) {
    const qty = normalizedPool[`d${sides}`];
    for (let i = 0; i < qty; i += 1) {
      dice.push(rollSingleDie(sides, idx, rng));
      idx += 1;
    }
  }

  const keptIndices = keepAll
    ? dice.map((d) => d.index)
    : pickBestKeptIndices(dice, requestedKeep);

  const totals = summarizeKeptDice(dice, keptIndices);

  return {
    pool: normalizedPool,
    expression: formatPoolExpression(normalizedPool),
    mode,
    keepAll,
    keepLimit: requestedKeep,
    simpleAction: options.simpleAction !== false,
    isAssimilatedRoll: mode === 'assimilated' || Boolean(options.isAssimilatedRoll),
    assimilationLevel: options.assimilationLevel ?? null,
    label: options.label || '',
    dice,
    keptIndices,
    totals,
  };
}

/**
 * Converte a rolagem atual em Rolagem Assimilada ("Agir por Instinto", pág. 41 e 60):
 * Substitui todos os d6 e d10 por d12 e mantém +1 dado adicional.
 */
function convertToAssimilatedRoll(currentRoll, rng = defaultRandomInt) {
  const totalDice = getTotalDiceCount(currentRoll.pool);
  const newPool = { d6: 0, d10: 0, d12: totalDice };
  const newKeep = currentRoll.keepAll
    ? totalDice
    : Math.min(totalDice, Math.min(4, currentRoll.keepLimit + 1));

  return executeRoll(
    newPool,
    {
      mode: 'assimilated',
      isAssimilatedRoll: true,
      keepCount: newKeep,
      keepAll: currentRoll.keepAll,
      simpleAction: currentRoll.simpleAction,
      label: currentRoll.label,
    },
    rng
  );
}

/**
 * Mapeia quantidade de símbolos em 2 dados para coordenada 1..6 (Tabela 6x6, pág. 277).
 */
function mapSymbolSumToCoord(sum) {
  if (sum <= 1) return 1;
  if (sum === 2) return 2;
  if (sum === 3) return 3;
  if (sum === 4) return 4;
  if (sum === 5) return 5;
  return 6;
}

/**
 * Rolagem de Tabela 6x6 (pág. 277): 2d10 (Padrão) ou 2d12 (Resultados Altos) para Linha e Coluna.
 */
function executeTableRoll(sides = 10, label = '', rng = defaultRandomInt) {
  const dieSides = sides === 12 ? 12 : 10;
  const rowDice = [rollSingleDie(dieSides, 0, rng), rollSingleDie(dieSides, 1, rng)];
  const colDice = [rollSingleDie(dieSides, 2, rng), rollSingleDie(dieSides, 3, rng)];

  const rowSymbols = rowDice[0].totalSymbols + rowDice[1].totalSymbols;
  const colSymbols = colDice[0].totalSymbols + colDice[1].totalSymbols;

  const row = mapSymbolSumToCoord(rowSymbols);
  const col = mapSymbolSumToCoord(colSymbols);

  return {
    mode: 'table',
    sides: dieSides,
    label,
    rowDice,
    colDice,
    rowSymbols,
    colSymbols,
    row,
    col,
    dice: [...rowDice, ...colDice],
    keptIndices: [0, 1, 2, 3],
    totals: summarizeKeptDice([...rowDice, ...colDice], [0, 1, 2, 3]),
  };
}

module.exports = {
  DIE_FACES,
  rollSingleDie,
  scoreDie,
  pickBestKeptIndices,
  summarizeKeptDice,
  formatPoolExpression,
  getTotalDiceCount,
  executeRoll,
  convertToAssimilatedRoll,
  mapSymbolSumToCoord,
  executeTableRoll,
};
