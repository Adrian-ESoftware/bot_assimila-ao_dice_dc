require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN || '',
  prefix: process.env.COMMAND_PREFIX !== undefined ? process.env.COMMAND_PREFIX : '!',
  allowBareSuffixA: (process.env.ALLOW_BARE_SUFFIX_A ?? 'true').toLowerCase() !== 'false',
  syncAppEmojis: (process.env.SYNC_APP_EMOJIS ?? 'true').toLowerCase() !== 'false',
  maxDicePerPool: 30,
  maxKeepDefault: 4,
  rollTtlMs: 30 * 60 * 1000, // 30 minutes interactive session TTL
};
