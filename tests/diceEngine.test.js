const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DIE_FACES,
  executeRoll,
  convertToAssimilatedRoll,
  executeTableRoll,
  mapSymbolSumToCoord,
} = require('../src/core/diceEngine');

test('Tabela oficial de faces (pág. 35 e pág. 43) tem contagens exatas', () => {
  const countAll = (faces) => {
    const tot = { A: 0, B: 0, C: 0 };
    for (const syms of Object.values(faces)) {
      for (const s of syms) tot[s] += 1;
    }
    return tot;
  };

  // D6: 3 Pressões, 1 Adaptação, 1 Sucesso
  assert.deepEqual(countAll(DIE_FACES[6]), { A: 1, B: 1, C: 3 });

  // D10: 5 Pressões, 3 Adaptações, 7 Sucessos
  assert.deepEqual(countAll(DIE_FACES[10]), { A: 7, B: 3, C: 5 });

  // D12: 8 Pressões, 5 Adaptações, 8 Sucessos
  assert.deepEqual(countAll(DIE_FACES[12]), { A: 8, B: 5, C: 8 });
});

test('Heurística padrão mantém o melhor dado e prefere face vazia sobre Pressão', () => {
  // Faces: d6 #3 (C), d6 #1 (vazio), d6 #4 (C) -> deve manter índice 1 (vazio)
  const faces1 = [3, 1, 4];
  let idx1 = 0;
  const r1 = executeRoll({ d6: 3 }, { keepCount: 1 }, () => faces1[idx1++]);
  assert.deepEqual(r1.keptIndices, [1]);
  assert.deepEqual(r1.totals, { A: 0, B: 0, C: 0, totalSymbols: 0 });

  // Faces: d10 #6 (A), d10 #7 (AA), d10 #9 (ABC) -> deve manter índice 1 (#7 = AA)
  const faces2 = [6, 7, 9];
  let idx2 = 0;
  const r2 = executeRoll({ d10: 3 }, { keepCount: 1 }, () => faces2[idx2++]);
  assert.deepEqual(r2.keptIndices, [1]);
  assert.deepEqual(r2.totals, { A: 2, B: 0, C: 0, totalSymbols: 2 });
});

test('Agir por Instinto (Rolagem Assimilada) converte todos os dados para d12 e mantém +1 dado', () => {
  const baseRoll = executeRoll({ d6: 2, d10: 1 }, { keepCount: 1 }, () => 6);
  const assimRoll = convertToAssimilatedRoll(baseRoll, () => 11);

  assert.equal(assimRoll.pool.d6, 0);
  assert.equal(assimRoll.pool.d10, 0);
  assert.equal(assimRoll.pool.d12, 3);
  assert.equal(assimRoll.keepLimit, 2);
  assert.equal(assimRoll.keptIndices.length, 2);
  assert.equal(assimRoll.isAssimilatedRoll, true);
  // 2x face 11 (ABBC) => A:2, B:4, C:2
  assert.deepEqual(assimRoll.totals, { A: 2, B: 4, C: 2, totalSymbols: 8 });
});

test('Modo dano mantém todos os dados e soma todos os símbolos', () => {
  // 2d10 com faces 5 (BC -> 2) e 9 (ABC -> 3) => dano = 5
  const faces = [5, 9];
  let i = 0;
  const dmg = executeRoll({ d10: 2 }, { mode: 'damage' }, () => faces[i++]);
  assert.equal(dmg.keepAll, true);
  assert.deepEqual(dmg.keptIndices, [0, 1]);
  assert.equal(dmg.totals.totalSymbols, 5);
});

test('Tabela 6x6 mapeia soma de símbolos corretamente', () => {
  assert.equal(mapSymbolSumToCoord(0), 1);
  assert.equal(mapSymbolSumToCoord(1), 1);
  assert.equal(mapSymbolSumToCoord(2), 2);
  assert.equal(mapSymbolSumToCoord(3), 3);
  assert.equal(mapSymbolSumToCoord(4), 4);
  assert.equal(mapSymbolSumToCoord(5), 5);
  assert.equal(mapSymbolSumToCoord(6), 6);
  assert.equal(mapSymbolSumToCoord(8), 6);

  // 4 dados com face 7 (AA = 2 símbolos cada => 4 por par => coord 4x4)
  const tbl = executeTableRoll(10, '', () => 7);
  assert.equal(tbl.row, 4);
  assert.equal(tbl.col, 4);
});
