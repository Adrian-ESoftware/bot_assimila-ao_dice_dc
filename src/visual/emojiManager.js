const fs = require('fs');
const { ICON_SPECS, ensureIconAssets } = require('./iconAssets');

const FALLBACKS = {
  as_sucesso: '🪲',
  as_adaptacao: '🦌',
  as_pressao: '🦉',
  as_d6: '■',
  as_d10: '◆',
  as_d12: '⬟',
  as_determinacao: '🟡',
  as_assimilacao: '🟣',
  as_saude: '🩸',
};

class EmojiManager {
  constructor() {
    this.map = new Map();
  }

  async sync(client, shouldSync = true) {
    const paths = ensureIconAssets();
    if (!shouldSync || !client?.application?.emojis) {
      return;
    }

    try {
      const existing = await client.application.emojis.fetch();
      for (const emoji of existing.values()) {
        if (emoji.name) {
          this.map.set(emoji.name, `<:${emoji.name}:${emoji.id}>`);
        }
      }

      for (const spec of ICON_SPECS) {
        if (this.map.has(spec.name)) continue;
        const filePath = paths[spec.name];
        if (!filePath || !fs.existsSync(filePath)) continue;

        const created = await client.application.emojis.create({
          attachment: filePath,
          name: spec.name,
        });
        this.map.set(spec.name, `<:${created.name}:${created.id}>`);
        console.log(`[EmojiManager] Emoji de aplicação criado: ${created.name}`);
      }
      console.log(`[EmojiManager] ${this.map.size}/${ICON_SPECS.length} ícones oficiais sincronizados no Discord.`);
    } catch (err) {
      console.warn('[EmojiManager] Não foi possível sincronizar Application Emojis (usando fallback Unicode):', err.message);
    }
  }

  get(name) {
    return this.map.get(name) || FALLBACKS[name] || '•';
  }

  formatSymbolList(symbols) {
    if (!symbols || symbols.length === 0) return '— (Vazio)';
    const keyMap = { A: 'as_sucesso', B: 'as_adaptacao', C: 'as_pressao' };
    return symbols.map((s) => this.get(keyMap[s])).join(' ');
  }
}

module.exports = {
  EmojiManager,
  FALLBACKS,
};
