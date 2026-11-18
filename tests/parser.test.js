const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMessageCommand } = require('../src/core/parser');

test('Aceita chamadas sem prefixo usando o sufixo "a" junto ao dado', () => {
  const r1 = parseMessageCommand('3d6a');
  assert.equal(r1.type, 'roll');
  assert.deepEqual(r1.pool, { d6: 3, d10: 0, d12: 0 });

  const r2 = parseMessageCommand('d12a');
  assert.equal(r2.type, 'roll');
  assert.deepEqual(r2.pool, { d6: 0, d10: 0, d12: 1 });

  const r3 = parseMessageCommand('3d6+2d10a');
  assert.equal(r3.type, 'roll');
  assert.deepEqual(r3.pool, { d6: 3, d10: 2, d12: 0 });

  const r4 = parseMessageCommand('3d6 + 2d10a');
  assert.equal(r4.type, 'roll');
  assert.deepEqual(r4.pool, { d6: 3, d10: 2, d12: 0 });

  const r5 = parseMessageCommand('2d6 1d10 1d12a m2 #Ataque');
  assert.equal(r5.type, 'roll');
  assert.deepEqual(r5.pool, { d6: 2, d10: 1, d12: 1 });
  assert.equal(r5.keepCount, 2);
  assert.equal(r5.label, 'Ataque');

  const r6 = parseMessageCommand('3d6a + 2d10a');
  assert.equal(r6.type, 'roll');
  assert.deepEqual(r6.pool, { d6: 3, d10: 2, d12: 0 });
});

test('NÃO aceita sufixo "a" separado por espaço (ex: "3d6 a", "d12 a", "d20 a")', () => {
  assert.equal(parseMessageCommand('3d6 a'), null);
  assert.equal(parseMessageCommand('d12 a'), null);
  assert.equal(parseMessageCommand('d20 a'), null);
  assert.equal(parseMessageCommand('3d6 + 2d10 a'), null);
});

test('Aceita chamadas com prefixo configurado (ex: "!")', () => {
  const r1 = parseMessageCommand('!3d6a');
  assert.equal(r1.type, 'roll');
  assert.deepEqual(r1.pool, { d6: 3, d10: 0, d12: 0 });

  const r2 = parseMessageCommand('!d12a');
  assert.equal(r2.type, 'roll');
  assert.deepEqual(r2.pool, { d6: 0, d10: 0, d12: 1 });

  const r3 = parseMessageCommand('!2d10 dano');
  assert.equal(r3.type, 'roll');
  assert.equal(r3.mode, 'damage');
  assert.equal(r3.keepAll, true);

  const h = parseMessageCommand('!ajuda');
  assert.deepEqual(h, { type: 'help', topic: 'overview' });

  const assim = parseMessageCommand('!assimilacao 3');
  assert.equal(assim.type, 'roll');
  assert.equal(assim.mode, 'assimilation_test');
  assert.deepEqual(assim.pool, { d6: 0, d10: 0, d12: 7 });

  const tbl = parseMessageCommand('!tabela 12');
  assert.equal(tbl.type, 'table');
  assert.equal(tbl.sides, 12);
});

test('Não dispara falsos positivos em frases normais de chat', () => {
  assert.equal(parseMessageCommand('comprei 3d6 a 10 reais'), null);
  assert.equal(parseMessageCommand('oi pessoal tudo bem?'), null);
  assert.equal(parseMessageCommand('3d6'), null);
});

test('Rejeita dados inválidos quando invocado com sufixo "a" junto ou prefixo', () => {
  const err = parseMessageCommand('1d20a');
  assert.equal(err.type, 'error');
  assert.match(err.message, /d6.*d10.*d12/);
});
