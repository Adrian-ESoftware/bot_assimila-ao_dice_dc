const { Client, Events, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { ensureIconAssets } = require('./visual/iconAssets');
const { EmojiManager } = require('./visual/emojiManager');
const { RollStore } = require('./state/rollStore');
const { handleMessageCreate } = require('./handlers/messageHandler');
const { handleInteractionCreate } = require('./handlers/interactionHandler');

async function main() {
  if (!config.token) {
    console.error('Erro: DISCORD_TOKEN não configurado. Copie .env.example para .env e informe o token do bot.');
    process.exit(1);
  }

  ensureIconAssets();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  const emojiMgr = new EmojiManager();
  const rollStore = new RollStore();

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`[Bot] Conectado como ${readyClient.user.tag}`);
    console.log(`[Bot] Prefixo: "${config.prefix}" | Chamada sem prefixo com sufixo "a": ${config.allowBareSuffixA}`);
    await emojiMgr.sync(readyClient, config.syncAppEmojis);
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleMessageCreate(message, { rollStore, emojiMgr });
    } catch (err) {
      console.error('[MessageCreate] Erro ao processar mensagem:', err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      await handleInteractionCreate(interaction, { rollStore, emojiMgr });
    } catch (err) {
      console.error('[InteractionCreate] Erro ao processar interação:', err);
    }
  });

  await client.login(config.token);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Fatal]', err);
    process.exit(1);
  });
}

module.exports = { main };
