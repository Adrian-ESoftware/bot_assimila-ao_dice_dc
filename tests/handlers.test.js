const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const { EmojiManager } = require('../src/visual/emojiManager');
const { RollStore } = require('../src/state/rollStore');
const { handleMessageCreate } = require('../src/handlers/messageHandler');
const { handleInteractionCreate } = require('../src/handlers/interactionHandler');

test('Fluxo simplificado: messageHandler gera rolagem limpa sem botões e interactionHandler responde aviso legado', async () => {
  const emojiMgr = new EmojiManager();
  emojiMgr.map.set('as_sucesso', '<:as_sucesso:1572646008813527170>');
  emojiMgr.map.set('as_adaptacao', '<:as_adaptacao:1572646010038001786>');
  emojiMgr.map.set('as_pressao', '<:as_pressao:1572646011430633624>');

  const rollStore = new RollStore();
  let lastReply = null;

  const fakeMessage = {
    content: '3d6+1d10a #Teste Simples',
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

  const json = lastReply.components[0].toJSON();
  assert.equal(json.components.some((c) => c.type === 1), false);

  // Simula clique em um botão legado de uma mensagem antiga
  let legacyReply = null;
  await handleInteractionCreate(
    {
      isButton: () => true,
      isStringSelectMenu: () => false,
      customId: 'as:empenho:old-id',
      user: { id: 'user-1' },
      reply: async (p) => {
        legacyReply = p;
      },
    },
    { rollStore, emojiMgr }
  );
  assert.ok(legacyReply);
  assert.equal(Boolean(legacyReply.flags & MessageFlags.Ephemeral), true);
});
