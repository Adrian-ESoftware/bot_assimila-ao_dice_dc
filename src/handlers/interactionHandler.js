const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const {
  executeRoll,
  executeTableRoll,
  convertToAssimilatedRoll,
  pickBestKeptIndices,
  summarizeKeptDice,
  getTotalDiceCount,
} = require('../core/diceEngine');
const { buildRollPayload, buildHelpPayload } = require('../ui/componentsV2');

function buildEphemeralNotice(text) {
  return {
    components: [
      new ContainerBuilder()
        .setAccentColor(0xf59e0b)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text)),
    ],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  };
}

async function handleInteractionCreate(interaction, { rollStore, emojiMgr }) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  if (!interaction.customId || !interaction.customId.startsWith('as:')) return;

  const [, action, target] = interaction.customId.split(':');

  if (action === 'help') {
    const payload = buildHelpPayload(target || 'overview', emojiMgr, config.prefix);
    await interaction.update({ ...payload, attachments: [] });
    return;
  }

  const session = rollStore.get(target);
  if (!session) {
    await interaction.reply(
      buildEphemeralNotice('⏳ Esta sessão de rolagem expirou. Faça uma nova rolagem (ex: `3d6 a` ou `d12 a`).')
    );
    return;
  }

  const isOwner = interaction.user.id === session.authorId;
  const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
  if (!isOwner && !isMod) {
    await interaction.reply(
      buildEphemeralNotice(`🔒 Apenas **${session.authorName}** pode alterar os dados mantidos desta rolagem.`)
    );
    return;
  }

  const current = session.roll;

  if (action === 'keep' && interaction.isStringSelectMenu()) {
    const selected = interaction.values
      .map((v) => parseInt(v, 10))
      .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < current.dice.length)
      .slice(0, current.keepLimit)
      .sort((a, b) => a - b);

    if (selected.length > 0) {
      current.keptIndices = selected;
      current.totals = summarizeKeptDice(current.dice, selected);
      rollStore.update(session.id, { roll: current });
    }
    const payload = buildRollPayload(session, emojiMgr);
    await interaction.update({ ...payload, attachments: [] });
    return;
  }

  if (action === 'instinct') {
    const newRoll = convertToAssimilatedRoll(current);
    rollStore.update(session.id, { roll: newRoll });
    const payload = buildRollPayload(session, emojiMgr);
    await interaction.update({ ...payload, attachments: [] });
    return;
  }

  if (action === 'empenho') {
    const totalDice = getTotalDiceCount(current.pool);
    const nextKeep = Math.min(totalDice, Math.min(4, current.keepLimit + 1));
    current.keepLimit = nextKeep;
    current.keptIndices = pickBestKeptIndices(current.dice, nextKeep);
    current.totals = summarizeKeptDice(current.dice, current.keptIndices);
    rollStore.update(session.id, { roll: current });
    const payload = buildRollPayload(session, emojiMgr);
    await interaction.update({ ...payload, attachments: [] });
    return;
  }

  if (action === 'scene') {
    current.simpleAction = !current.simpleAction;
    rollStore.update(session.id, { roll: current });
    const payload = buildRollPayload(session, emojiMgr);
    await interaction.update({ ...payload, attachments: [] });
    return;
  }

  if (action === 'keepall') {
    const totalDice = getTotalDiceCount(current.pool);
    current.keepAll = !current.keepAll;
    if (current.keepAll) {
      current.keptIndices = current.dice.map((d) => d.index);
    } else {
      current.keptIndices = pickBestKeptIndices(current.dice, current.keepLimit);
    }
    current.totals = summarizeKeptDice(current.dice, current.keptIndices);
    if (current.keepLimit > totalDice) current.keepLimit = totalDice;
    rollStore.update(session.id, { roll: current });
    const payload = buildRollPayload(session, emojiMgr);
    await interaction.update({ ...payload, attachments: [] });
    return;
  }

  if (action === 'reroll') {
    let newRoll;
    if (current.mode === 'table') {
      newRoll = executeTableRoll(current.sides, current.label);
    } else {
      newRoll = executeRoll(current.pool, {
        mode: current.mode,
        keepCount: current.keepLimit,
        keepAll: current.keepAll,
        simpleAction: current.simpleAction,
        isAssimilatedRoll: current.isAssimilatedRoll,
        assimilationLevel: current.assimilationLevel,
        label: current.label,
      });
    }
    rollStore.update(session.id, { roll: newRoll });
    const payload = buildRollPayload(session, emojiMgr);
    await interaction.update({ ...payload, attachments: [] });
  }
}

module.exports = {
  handleInteractionCreate,
};
