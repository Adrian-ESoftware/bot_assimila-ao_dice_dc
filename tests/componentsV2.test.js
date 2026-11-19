const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const { executeRoll } = require('../src/core/diceEngine');
const { EmojiManager } = require('../src/visual/emojiManager');
const { buildRollPayload, buildHelpPayload } = require('../src/ui/componentsV2');

test('buildRollPayload gera payload Components v2 simples, sem botões nem menu de seleção', () => {
  const emojiMgr = new EmojiManager();
  const roll = executeRoll({ d6: 3, d10: 2 }, { keepCount: 2, label: 'Percepção + Erudição' });
  const payload = buildRollPayload({ id: 'deadbeef', authorName: 'Luana', roll }, emojiMgr);

  assert.equal(Boolean(payload.flags & MessageFlags.IsComponentsV2), true);
  assert.equal(payload.content, undefined);
  assert.equal(payload.embeds, undefined);
  assert.equal(payload.files.length, 2);
  assert.equal(payload.components.length, 1);

  const json = payload.components[0].toJSON();
  assert.equal(json.type, 17); // Container
  // Garante que não há ActionRow (type 1) com botões ou select menu
  const hasActionRow = json.components.some((c) => c.type === 1);
  assert.equal(hasActionRow, false);
});

test('buildHelpPayload gera payload Components v2 válido e sem botões', () => {
  const emojiMgr = new EmojiManager();
  const payload = buildHelpPayload('symbols', emojiMgr, '!');

  assert.equal(Boolean(payload.flags & MessageFlags.IsComponentsV2), true);
  assert.equal(payload.files.length, 1);
  assert.equal(payload.components.length, 1);
  const json = payload.components[0].toJSON();
  assert.equal(json.type, 17);
  assert.equal(json.components.some((c) => c.type === 1), false);
});
