const config = require('../config');

const FLAG_TOKENS = new Set([
  'dano',
  'conflito',
  'ameaca',
  'ameaça',
  'assimilador',
  'todos',
  'all',
  'instinto',
  'assimilada',
  'tabela',
  'simples',
]);

function normalizeText(str) {
  return (str || '').trim();
}

function stripOptionalComment(input) {
  const commentMatch = input.match(/(?:\s+(?:#|\/\/|—|--)\s*)(.+)$/);
  if (!commentMatch) {
    return { body: input.trim(), label: '' };
  }
  const idx = commentMatch.index;
  return {
    body: input.slice(0, idx).trim(),
    label: commentMatch[1].trim().slice(0, 120),
  };
}

/**
 * Analisa termos de dados como "3d6", "d12", "2d10", "+ 1d12", separados por espaço ou "+".
 */
function parseDiceTerms(rawDice) {
  const cleaned = rawDice
    .replace(/\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  const tokens = cleaned.split(' ');
  const pool = { d6: 0, d10: 0, d12: 0 };
  const invalidDice = [];

  for (const token of tokens) {
    const match = token.match(/^(\d*)d(\d+)$/i);
    if (!match) {
      return null;
    }
    const count = match[1] === '' ? 1 : parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);

    if (count <= 0) {
      return { error: 'A quantidade de dados deve ser pelo menos 1.' };
    }
    if (![6, 10, 12].includes(sides)) {
      invalidDice.push(`d${sides}`);
    } else {
      pool[`d${sides}`] += count;
    }
  }

  if (invalidDice.length > 0) {
    return {
      error: `Assimilação RPG utiliza apenas **d6**, **d10** e **d12** (recebido: ${invalidDice.join(', ')}).`,
    };
  }

  const total = pool.d6 + pool.d10 + pool.d12;
  if (total === 0) return null;
  if (total > config.maxDicePerPool) {
    return {
      error: `Limite máximo de **${config.maxDicePerPool} dados** por rolagem (recebido: ${total}).`,
    };
  }

  return { pool };
}

/**
 * Analisa flags opcionais após o sufixo "a" (ou no comando prefixado).
 */
function parseFlags(tokens) {
  const flags = {
    mode: 'standard',
    keepCount: 1,
    keepExplicit: false,
    keepAll: false,
    simpleAction: true,
    sidesHint: null,
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i].toLowerCase();
    if (t === 'dano') {
      flags.mode = 'damage';
      flags.keepAll = true;
    } else if (t === 'conflito' || t === 'ameaca' || t === 'ameaça' || t === 'assimilador') {
      flags.mode = 'conflict';
      flags.keepAll = true;
      flags.simpleAction = false;
    } else if (t === 'todos' || t === 'all') {
      flags.keepAll = true;
    } else if (t === 'instinto' || t === 'assimilada') {
      flags.mode = 'assimilated';
    } else if (t === 'tabela') {
      flags.mode = 'table';
    } else if (/^[mk](\d+)$/.test(t)) {
      const val = parseInt(t.slice(1), 10);
      if (val >= 1) {
        flags.keepCount = Math.min(val, config.maxDicePerPool);
        flags.keepExplicit = true;
      }
    } else if ((t === 'manter' || t === 'keep') && tokens[i + 1] && /^\d+$/.test(tokens[i + 1])) {
      const val = parseInt(tokens[i + 1], 10);
      if (val >= 1) {
        flags.keepCount = Math.min(val, config.maxDicePerPool);
        flags.keepExplicit = true;
      }
      i += 1;
    } else if (/^d?(10|12)$/.test(t)) {
      flags.sidesHint = parseInt(t.replace(/^d/i, ''), 10);
    } else {
      return { error: `Modificador desconhecido: \`${tokens[i]}\`` };
    }
  }

  return flags;
}

function isValidFlagSequence(tokens) {
  if (tokens.length === 0) return true;
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i].toLowerCase();
    if (FLAG_TOKENS.has(t)) continue;
    if (/^[mk]\d+$/.test(t)) continue;
    if ((t === 'manter' || t === 'keep') && tokens[i + 1] && /^\d+$/.test(tokens[i + 1])) {
      i += 1;
      continue;
    }
    return false;
  }
  return true;
}

/**
 * Faz o parse de uma mensagem do Discord para comando do bot.
 * Suporta:
 *  - Chamada com sufixo "a" (com ou sem prefixo): "3d6 a", "d12 a", "2d6 + 1d10 a", "!3d6 a", "3d6a"
 *  - Chamadas especiais com sufixo "a": "assimilacao 3 a", "tabela a", "ajuda a"
 *  - Chamadas com prefixo configurado (ex: "!ajuda", "!simbolos", "!regras", "!tabela", "!3d6")
 */
function parseMessageCommand(content, options = {}) {
  const prefix = options.prefix !== undefined ? options.prefix : config.prefix;
  const allowBareSuffixA = options.allowBareSuffixA !== undefined ? options.allowBareSuffixA : config.allowBareSuffixA;

  const raw = normalizeText(content);
  if (!raw) return null;

  const hasPrefix = Boolean(prefix) && raw.startsWith(prefix);
  if (!hasPrefix && !allowBareSuffixA) {
    return null;
  }

  const withoutPrefix = hasPrefix ? raw.slice(prefix.length).trim() : raw;
  if (!withoutPrefix) return null;

  const { body, label } = stripOptionalComment(withoutPrefix);
  const tokens = body.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  // Verifica comandos de texto com prefixo sem exigir sufixo "a"
  const firstLower = tokens[0].toLowerCase();
  if (hasPrefix) {
    if (['ajuda', 'help', 'comandos', 'h'].includes(firstLower) && tokens.length === 1) {
      return { type: 'help', topic: 'overview' };
    }
    if (['simbolos', 'símbolos', 'icones', 'ícones', 'dados'].includes(firstLower) && tokens.length === 1) {
      return { type: 'help', topic: 'symbols' };
    }
    if (['regras', 'mecanicas', 'mecânicas', 'cabo', 'saude', 'saúde', 'pressao', 'pressão'].includes(firstLower) && tokens.length === 1) {
      return { type: 'help', topic: 'rules' };
    }
    if (firstLower === 'tabela') {
      const rest = tokens.filter((t, idx) => idx > 0 && t.toLowerCase() !== 'a');
      const sides = rest.some((t) => t.includes('12')) ? 12 : 10;
      return { type: 'table', sides, label };
    }
    if (firstLower === 'assimilacao' || firstLower === 'assimilação') {
      const rest = tokens.filter((t, idx) => idx > 0 && t.toLowerCase() !== 'a');
      const level = rest[0] && /^\d+$/.test(rest[0]) ? parseInt(rest[0], 10) : 1;
      if (level < 0 || level > 10) {
        return { type: 'error', message: 'O Nível de Assimilação deve estar entre **0 e 10**.' };
      }
      const totalD12 = 1 + 2 * level;
      return {
        type: 'roll',
        pool: { d6: 0, d10: 0, d12: totalD12 },
        mode: 'assimilation_test',
        keepAll: true,
        keepCount: totalD12,
        assimilationLevel: level,
        label: label || `Teste de Assimilação (Nível ${level})`,
      };
    }
  }

  // Verifica chamadas especiais terminadas com sufixo "a" (ex: "ajuda a", "tabela a", "assimilacao 3 a")
  const lastLower = tokens[tokens.length - 1].toLowerCase();
  if (lastLower === 'a' && tokens.length >= 2) {
    const head = tokens[0].toLowerCase();
    const middle = tokens.slice(1, -1);
    if (['ajuda', 'help', 'comandos'].includes(head) && middle.length === 0) {
      return { type: 'help', topic: 'overview' };
    }
    if (['simbolos', 'símbolos', 'icones', 'ícones'].includes(head) && middle.length === 0) {
      return { type: 'help', topic: 'symbols' };
    }
    if (['regras', 'mecanicas', 'mecânicas'].includes(head) && middle.length === 0) {
      return { type: 'help', topic: 'rules' };
    }
    if (head === 'tabela' && middle.length <= 1) {
      const sides = middle[0] && middle[0].includes('12') ? 12 : 10;
      return { type: 'table', sides, label };
    }
    if ((head === 'assimilacao' || head === 'assimilação') && middle.length <= 1) {
      const level = middle[0] && /^\d+$/.test(middle[0]) ? parseInt(middle[0], 10) : 1;
      if (level < 0 || level > 10) {
        return { type: 'error', message: 'O Nível de Assimilação deve estar entre **0 e 10**.' };
      }
      const totalD12 = 1 + 2 * level;
      return {
        type: 'roll',
        pool: { d6: 0, d10: 0, d12: totalD12 },
        mode: 'assimilation_test',
        keepAll: true,
        keepCount: totalD12,
        assimilationLevel: level,
        label: label || `Teste de Assimilação (Nível ${level})`,
      };
    }
  }

  // Suporte a comando prefixado opcional "!r ..." ou "!roll ..."
  let workingBody = body;
  if (hasPrefix && /^(?:r|roll|rolar)\s+/i.test(workingBody)) {
    workingBody = workingBody.replace(/^(?:r|roll|rolar)\s+/i, '').trim();
  }

  // Procura o sufixo "a" (separado: "3d6 a", "3d6 + 2d10 a m2" ou colado: "3d6a", "d12a")
  // Padrão 1: <dados> + espaço + "a" + (opcionalmente apenas flags válidas)
  // Padrão 2: <dados>"a" colado no último termo de dado + (opcionalmente flags)
  let dicePart = '';
  let flagTokens = [];
  let foundSuffixA = false;

  const workingTokens = workingBody.split(/\s+/).filter(Boolean);
  const suffixIdx = workingTokens.findIndex((tok) => tok.toLowerCase() === 'a');

  if (suffixIdx > 0) {
    dicePart = workingTokens.slice(0, suffixIdx).join(' ');
    flagTokens = workingTokens.slice(suffixIdx + 1);
    foundSuffixA = true;
  } else {
    // Tenta sufixo "a" colado no último token de dado (ex: "3d6a", "d12a", "2d6+1d10a")
    for (let i = 0; i < workingTokens.length; i += 1) {
      const tok = workingTokens[i];
      if (/^(?:\d*d\d+(?:\+\d*d\d+)*)a$/i.test(tok)) {
        const before = workingTokens.slice(0, i);
        const trimmedTok = tok.slice(0, -1);
        dicePart = [...before, trimmedTok].join(' ');
        flagTokens = workingTokens.slice(i + 1);
        foundSuffixA = true;
        break;
      }
    }
  }

  // Se não achou sufixo "a": só aceita se veio com prefixo explícito (ex: "!3d6", "!d12")
  if (!foundSuffixA) {
    if (!hasPrefix) return null;
    // Separa tokens de dado no início e flags no final
    let splitAt = 0;
    while (
      splitAt < workingTokens.length &&
      /^(?:\+|\d*d\d+(?:\+\d*d\d+)*)$/i.test(workingTokens[splitAt])
    ) {
      splitAt += 1;
    }
    if (splitAt === 0) return null;
    dicePart = workingTokens.slice(0, splitAt).join(' ');
    flagTokens = workingTokens.slice(splitAt);
  }

  // Se foi chamado sem prefixo, garante que após o "a" existam apenas flags válidas
  if (!hasPrefix && !isValidFlagSequence(flagTokens)) {
    return null;
  }

  const parsedDice = parseDiceTerms(dicePart);
  if (!parsedDice) return null;
  if (parsedDice.error) {
    return { type: 'error', message: parsedDice.error };
  }

  const parsedFlags = parseFlags(flagTokens);
  if (parsedFlags.error) {
    return { type: 'error', message: parsedFlags.error };
  }

  if (parsedFlags.mode === 'table') {
    const sides = parsedDice.pool.d12 > 0 ? 12 : 10;
    return { type: 'table', sides, label };
  }

  let finalPool = parsedDice.pool;
  let finalKeepCount = parsedFlags.keepCount;
  let isAssimilatedRoll = false;

  if (parsedFlags.mode === 'assimilated') {
    const total = finalPool.d6 + finalPool.d10 + finalPool.d12;
    finalPool = { d6: 0, d10: 0, d12: total };
    isAssimilatedRoll = true;
    if (!parsedFlags.keepExplicit) {
      finalKeepCount = Math.min(total, 2);
    }
  }

  return {
    type: 'roll',
    pool: finalPool,
    mode: parsedFlags.mode,
    keepAll: parsedFlags.keepAll,
    keepCount: finalKeepCount,
    simpleAction: parsedFlags.simpleAction,
    isAssimilatedRoll,
    label,
  };
}

module.exports = {
  parseMessageCommand,
  parseDiceTerms,
};
