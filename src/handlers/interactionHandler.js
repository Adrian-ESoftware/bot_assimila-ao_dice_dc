const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { buildHelpPayload } = require('../ui/componentsV2');

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

async function handleInteractionCreate(interaction, { emojiMgr }) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  if (!interaction.customId || !interaction.customId.startsWith('as:')) return;

  const [, action, target] = interaction.customId.split(':');

  if (action === 'help') {
    const payload = buildHelpPayload(target || 'overview', emojiMgr, config.prefix);
    await interaction.update({ ...payload, attachments: [] });
    return;
  }

  await interaction.reply(
    buildEphemeralNotice('ℹ️ Os controles por botão foram removidos para deixar a rolagem mais simples.')
  );
}

module.exports = {
  handleInteractionCreate,
};
