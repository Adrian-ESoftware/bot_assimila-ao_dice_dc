const config = require('../config');
const { parseMessageCommand } = require('../core/parser');
const { executeRoll, executeTableRoll } = require('../core/diceEngine');
const { buildRollPayload, buildHelpPayload, buildErrorPayload } = require('../ui/componentsV2');

function getDisplayName(message) {
  return message.member?.displayName || message.author?.globalName || message.author?.username || 'Infectado(a)';
}

async function handleMessageCreate(message, { rollStore, emojiMgr }) {
  if (!message || message.author?.bot) return;

  const parsed = parseMessageCommand(message.content, {
    prefix: config.prefix,
    allowBareSuffixA: config.allowBareSuffixA,
  });

  if (!parsed) return;

  if (parsed.type === 'error') {
    await message.reply(buildErrorPayload(parsed.message));
    return;
  }

  if (parsed.type === 'help') {
    await message.reply(buildHelpPayload(parsed.topic, emojiMgr, config.prefix));
    return;
  }

  const authorName = getDisplayName(message);

  if (parsed.type === 'table') {
    const roll = executeTableRoll(parsed.sides, parsed.label);
    const session = rollStore.create({
      authorId: message.author.id,
      authorName,
      roll,
    });
    await message.reply(buildRollPayload(session, emojiMgr));
    return;
  }

  if (parsed.type === 'roll') {
    const roll = executeRoll(parsed.pool, {
      mode: parsed.mode,
      keepCount: parsed.keepCount,
      keepAll: parsed.keepAll,
      simpleAction: parsed.simpleAction,
      isAssimilatedRoll: parsed.isAssimilatedRoll,
      assimilationLevel: parsed.assimilationLevel,
      label: parsed.label,
    });

    const session = rollStore.create({
      authorId: message.author.id,
      authorName,
      roll,
    });

    await message.reply(buildRollPayload(session, emojiMgr));
  }
}

module.exports = {
  handleMessageCreate,
};
