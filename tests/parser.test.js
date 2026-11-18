const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMessageCommand } = require('../src/core/parser');

test('Aceita chamadas sem prefixo usando o sufixo "a"', () => {
  const r1 = parseMessageCommand('3d6 a');
  assert.equal(r1.type, 'roll');
  assert.deepEqual(r1.pool, { d6: 3, d10: 0, d12: 0 });

  const r2 = parseMessageCommand('d12 a');
  assert.equal(r2.type, 'roll');
  assert.deepEqual(r2.pool, { d6: 0, d10: 0, d12: 1 });

  const r3 = parseMessageCommand('3d6 + 2d10 a');
  assert.equal(r3.type, 'roll');
  assert.deepEqual(r3.pool, { d6: 3, d10: 2, d12: 0 });

  const r4 = parseMessageCommand('2d6 1d10 1d12 a m2 #Ataque');
  assert.equal(r4.type, 'roll');
  assert.deepEqual(r4.pool, { d6: 2, d10: 1, d12: 1 });
  assert.equal(r4.keepCount, 2);
  assert.equal(r4.label, 'Ataque');

  const r5 = parseMessageCommand('3d6a');
  assert.equal(r5.type, 'roll');
  assert.deepEqual(r5.pool, { d6: 3, d10: 0, d12: 0 });
});

test('Aceita chamadas com prefixo configurado (ex: "!")', () => {
  const r1 = parseMessageCommand('!3d6 a');
  assert.equal(r1.type, 'roll');
  assert.deepEqual(r1.pool, { d6: 3, d10: 0, d12: 0 });

  const r2 = parseMessageCommand('!d12 a');
  assert.equal(r2.type, 'roll');
  assert.deepEqual(r2.pool, { d6: 0, d10: 0, d12: 1 });

  const r3 = parseMessageCommand('!2d10 dano');
  assert.equal(r3.type, 'roll');
  assert.equal(r3.mode, 'damage');
  assert.equal(r3.keepAll, true);

  const h = parseMessageCommand('!ajuda');
  assert.deepEqual(h, { type: 'help', topic: 'overview' });
});

test('Suporta comandos especiais de Assimilação e Tabela 6x6', () => {
  const assim = parseMessageCommand('assimilacao 3 a');
  assert.equal(assim.type, 'roll');
  assert.equal(assim.mode, 'assimilation_test');
  assert.deepEqual(assim.pool, { d6: 0, d10: 0, d12: 7 });

  const tbl = parseMessageCommand('tabela 12 a');
  assert.equal(tbl.type, 'table');
  assert.equal(tbl.sides, 12);
});

test('Não dispara falsos positivos em frases normais de chat', () => {
  assert.equal(parseMessageCommand('comprei 3d6 a 10 reais'), null);
  assert.equal(parseMessageCommand('oi pessoal tudo bem?'), null);
  assert.equal(parseMessageCommand('3d6'), null);
});

test('Rejeita dados inválidos quando invocado com sufixo "a" ou prefixo', () => {
  const err = parseMessageCommand('1d20 a');
  assert.equal(err.type, 'error');
  assert.match(err.message, /d6.*d10.*d12/);
});
