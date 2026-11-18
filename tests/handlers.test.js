const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const { EmojiManager } = require('../src/visual/emojiManager');
const { RollStore } = require('../src/state/rollStore');
const { handleMessageCreate } = require('../src/handlers/messageHandler');
const { handleInteractionCreate } = require('../src/handlers/interactionHandler');

test('Fluxo completo: messageHandler -> interactionHandler (Agir por Instinto, Empenho, Manter Todos, Reroll)', async () => {
  const emojiMgr = new EmojiManager();
  emojiMgr.map.set('as_sucesso', '<:as_sucesso:1572646008813527170>');
  emojiMgr.map.set('as_adaptacao', '<:as_adaptacao:1572646010038001786>');
  emojiMgr.map.set('as_pressao', '<:as_pressao:1572646011430633624>');

  const rollStore = new RollStore();
  let lastReply = null;

  const fakeMessage = {
    content: '3d6+1d10a #Teste Completo',
    author: { id: 'user-1', bot: false, username: 'Jogador' },
    member: { displayName: 'Luana' },
    reply: async (payload) => {
      lastReply = payload;
      return payload;
    },
  };

  await handleMessageCreate(fakeMessage, { rollStore, emojiMgr });
  assert.ok(lastReply);
  assert.equal(Boolean(lastReply.flags & MessageFlags.IsComponentsV2), true);
  assert.equal(lastReply.files.length, 2);

  // Recupera o ID da sessão a partir do customId do botão
  const json = lastReply.components[0].toJSON();
  const actionRow = json.components.find((c) => c.type === 1 && c.components.some((b) => b.custom_id?.startsWith('as:instinct:')));
  const sessionId = actionRow.components[0].custom_id.split(':')[2];
  const session = rollStore.get(sessionId);
  assert.ok(session);
  assert.equal(session.roll.dice.length, 4);
  assert.equal(session.roll.keptIndices.length, 1);

  // Simula clique em Empenho (+1 Mantido)
  let updatedPayload = null;
  await handleInteractionCreate(
    {
      isButton: () => true,
      isStringSelectMenu: () => false,
      customId: `as:empenho:${sessionId}`,
      user: { id: 'user-1' },
      update: async (p) => {
        updatedPayload = p;
      },
    },
    { rollStore, emojiMgr }
  );
  assert.ok(updatedPayload);
  assert.equal(rollStore.get(sessionId).roll.keptIndices.length, 2);
  assert.deepEqual(updatedPayload.attachments, []);

  // Simula clique em Agir por Instinto
  await handleInteractionCreate(
    {
      isButton: () => true,
      isStringSelectMenu: () => false,
      customId: `as:instinct:${sessionId}`,
      user: { id: 'user-1' },
      update: async (p) => {
        updatedPayload = p;
      },
    },
    { rollStore, emojiMgr }
  );
  const afterInstinct = rollStore.get(sessionId).roll;
  assert.equal(afterInstinct.isAssimilatedRoll, true);
  assert.equal(afterInstinct.pool.d6, 0);
  assert.equal(afterInstinct.pool.d10, 0);
  assert.equal(afterInstinct.pool.d12, 4);
  assert.equal(afterInstinct.keptIndices.length, 3);

  // Simula bloqueio de outro usuário tentando alterar os dados mantidos
  let deniedReply = null;
  await handleInteractionCreate(
    {
      isButton: () => true,
      isStringSelectMenu: () => false,
      customId: `as:reroll:${sessionId}`,
      user: { id: 'other-user' },
      reply: async (p) => {
        deniedReply = p;
      },
    },
    { rollStore, emojiMgr }
  );
  assert.ok(deniedReply);
  assert.equal(Boolean(deniedReply.flags & MessageFlags.Ephemeral), true);
});
