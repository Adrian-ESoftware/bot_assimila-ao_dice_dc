const path = require('path');
const {
  AttachmentBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');
const { getPressureConsequence, HEALTH_LEVELS, APTITUDES } = require('../core/rulesData');
const { getTotalDiceCount } = require('../core/diceEngine');
const { renderRollImage } = require('../visual/diceRenderer');
const { ICONS_DIR, ensureIconAssets } = require('../visual/iconAssets');

function resolveAccentColor(roll) {
  if (roll.isAssimilatedRoll || roll.mode === 'assimilated') return 0xa855f7;
  if (roll.mode === 'damage') return 0xef4444;
  if (roll.mode === 'assimilation_test') return 0xec4899;
  if (roll.mode === 'conflict') return 0xf97316;
  if (roll.mode === 'table') return 0x14b8a6;

  if (roll.totals.A > 0 && roll.totals.C === 0) return 0x34d399;
  if (roll.totals.A > 0 && roll.totals.C > 0) return 0xf59e0b;
  if (roll.totals.A === 0 && roll.totals.C > 0) return 0xef4444;
  return 0x64748b;
}

function formatDieOptionLabel(die, isKept) {
  const names = { A: 'Sucesso', B: 'Adaptação', C: 'Pressão' };
  const symText = die.symbols.length === 0
    ? 'Vazio (-)'
    : die.symbols.map((s) => names[s]).join(' + ');
  const prefix = isKept ? '★ ' : '';
  return `${prefix}Dado ${die.index + 1} (d${die.sides} #${die.faceNumber}) → ${symText}`.slice(0, 100);
}

function formatPoolWithEmojis(pool, emojiMgr) {
  const parts = [];
  if (pool.d6 > 0) parts.push(`${emojiMgr.get('as_d6')} **${pool.d6}d6**`);
  if (pool.d10 > 0) parts.push(`${emojiMgr.get('as_d10')} **${pool.d10}d10**`);
  if (pool.d12 > 0) parts.push(`${emojiMgr.get('as_d12')} **${pool.d12}d12**`);
  return parts.join('  +  ');
}

/**
 * Constrói a resposta completa de rolagem utilizando Discord Components v2.
 */
function buildRollPayload(session, emojiMgr) {
  ensureIconAssets();
  const { id, authorName, roll } = session;
  const imgBuffer = renderRollImage(roll, authorName);

  const rollAttachment = new AttachmentBuilder(imgBuffer, { name: 'roll.png' });
  const emblemAttachment = new AttachmentBuilder(path.join(ICONS_DIR, 'as_emblem.png'), { name: 'as_emblem.png' });

  const eSuc = emojiMgr.get('as_sucesso');
  const eAda = emojiMgr.get('as_adaptacao');
  const ePre = emojiMgr.get('as_pressao');
  const eDet = emojiMgr.get('as_determinacao');
  const eAss = emojiMgr.get('as_assimilacao');
  const eSau = emojiMgr.get('as_saude');

  const modeTitleMap = {
    standard: 'Rolagem de Teste',
    assimilated: 'Rolagem Assimilada — Agir por Instinto',
    damage: 'Rolagem de Dano',
    conflict: 'Conflito / Assimilador',
    assimilation_test: 'Teste de Assimilação',
    table: 'Sorteio de Tabela 6×6',
  };

  const titleLine = `## ${modeTitleMap[roll.mode] || 'Rolagem — Assimilação RPG'}`;
  const labelLine = roll.label ? `\n> *${roll.label}*` : '';
  const poolLine = roll.mode === 'table'
    ? `\n**Padrão:** ${roll.sides === 12 ? `${emojiMgr.get('as_d12')} Resultados Altos (2d12)` : `${emojiMgr.get('as_d10')} Padrão (2d10)`}`
    : `\n**Pilha:** ${formatPoolWithEmojis(roll.pool, emojiMgr)}  •  **Mantidos:** ${roll.keptIndices.length}/${roll.dice.length}`;

  const headerSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${titleLine}\n**Jogador(a):** ${authorName}${labelLine}${poolLine}`
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL('attachment://as_emblem.png')
        .setDescription('Ícones oficiais de Assimilação RPG')
    );

  const gallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder()
      .setURL('attachment://roll.png')
      .setDescription(`Resultado da rolagem de ${authorName}`)
  );

  // Texto de resumo mecânico
  const lines = [];
  if (roll.mode === 'table') {
    lines.push(
      `### Coordenada Sorteada: **Linha ${roll.row} × Coluna ${roll.col}**`,
      `• **Linha:** ${roll.rowSymbols} símbolos (${emojiMgr.formatSymbolList([...roll.rowDice[0].symbols, ...roll.rowDice[1].symbols])}) → **${roll.row}**`,
      `• **Coluna:** ${roll.colSymbols} símbolos (${emojiMgr.formatSymbolList([...roll.colDice[0].symbols, ...roll.colDice[1].symbols])}) → **${roll.col}**`
    );
  } else {
    lines.push(
      `### Resultado Mantido`,
      `${eSuc} **Sucessos:** \`${roll.totals.A}\`   •   ${eAda} **Adaptações:** \`${roll.totals.B}\`   •   ${ePre} **Pressões:** \`${roll.totals.C}\``
    );

    if (roll.mode === 'damage') {
      lines.push(
        `\n${eSau} **Dano Total Causado:** \`${roll.totals.totalSymbols}\` Ponto(s) de Saúde *(cada símbolo A/B/C vale 1 de dano — pág. 66)*.`
      );
    } else if (roll.mode === 'assimilation_test') {
      lines.push(
        `\n${eAss} **Teste de Assimilação** *(Nível ${roll.assimilationLevel ?? '?'})*: anote todos os \`${roll.totals.A}\` Sucessos, \`${roll.totals.B}\` Adaptações e \`${roll.totals.C}\` Pressões na Ficha.`
      );
      if (roll.totals.C >= 10) {
        lines.push(`⚠️ **LIMITE ATINGIDO (10+ Pressões):** O(a) Infectado(a) perde o controle definitivamente para a Assimilação!`);
      } else {
        lines.push(`ℹ️ Se o total acumulado de ${ePre} na ficha atingir **10**, o(a) Infectado(a) perde o controle para o parasita (pág. 71).`);
      }
    } else {
      // Ação Simples vs Conflito / Rolagem Assimilada
      let netPressure = roll.totals.C;
      if (roll.isAssimilatedRoll) {
        lines.push(
          `\n${eAss} **Agir por Instinto ativa** *(custo: 1 Ponto de Assimilação ${eAss} ou 2 de Determinação ${eDet})*: todos os dados convertidos em **d12** e **+1 dado mantido**. Não pode receber apoio nem usar ${eAda} para anular ${ePre} em Ação Simples.`
        );
      } else if (roll.simpleAction && !roll.keepAll && roll.mode === 'standard') {
        if (roll.totals.B > 0 && roll.totals.C > 0) {
          const canceled = Math.min(roll.totals.B, roll.totals.C);
          netPressure = Math.max(0, roll.totals.C - roll.totals.B);
          lines.push(
            `\n⚖️ **Ação Simples:** ${canceled} ${eAda} pode(m) anular ${canceled} ${ePre} → **Pressões líquidas:** \`${netPressure}\``
          );
        } else {
          lines.push(`\n⚖️ **Cena:** Ação Simples *(cada ${eAda} pode anular 1 ${ePre} mantida)*.`);
        }
      } else if (roll.mode === 'conflict' || !roll.simpleAction) {
        lines.push(
          `\n⚔️ **Cena de Conflito:** Use ${eAda} para *Mudar Ação*, *Ajudar Aliado* (transferir ${eSuc}), *Apoiar Aliado* (evitar ${ePre}), *Adaptar Ação* ou *Ignorar Penalidade* (pág. 38–39).`
        );
      }

      const pressureInfo = getPressureConsequence(netPressure);
      if (pressureInfo) {
        lines.push(`\n${ePre} **${pressureInfo.title}:** ${pressureInfo.desc}`);
      } else if (roll.totals.A > 0 && netPressure === 0) {
        lines.push(`\n✨ **Êxito limpo!** Nenhuma Pressão restante para o(a) Assimilador(a) ativar.`);
      }
    }
  }

  const container = new ContainerBuilder()
    .setAccentColor(resolveAccentColor(roll))
    .addSectionComponents(headerSection)
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addMediaGalleryComponents(gallery)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

  // Controles interativos (não exibidos para Tabela 6x6 pois já é sorteio fechado, apenas Reroll)
  if (roll.mode === 'table') {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`as:reroll:${id}`)
          .setLabel('Sortear Novamente')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Primary)
      )
    );
  } else {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    const totalDice = getTotalDiceCount(roll.pool);
    const keptSet = new Set(roll.keptIndices);

    // Select Menu para escolher manualmente quais dados manter (suporta até 25 dados pelo limite do Discord)
    if (roll.dice.length <= 25 && !roll.keepAll) {
      const maxSelect = Math.min(roll.dice.length, Math.max(1, roll.keepLimit));
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`as:keep:${id}`)
        .setPlaceholder(`🎯 Escolher dados mantidos (até ${maxSelect})`)
        .setMinValues(1)
        .setMaxValues(maxSelect);

      for (const die of roll.dice) {
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(formatDieOptionLabel(die, keptSet.has(die.index)))
            .setValue(String(die.index))
            .setDefault(keptSet.has(die.index))
        );
      }

      container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
    }

    const canAssimilate = !roll.isAssimilatedRoll && roll.mode === 'standard' && (roll.pool.d6 > 0 || roll.pool.d10 > 0);
    const canEmpenho = !roll.keepAll && roll.keepLimit < Math.min(totalDice, 4) && roll.mode !== 'damage' && roll.mode !== 'assimilation_test';

    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`as:instinct:${id}`)
        .setLabel('Agir por Instinto')
        .setEmoji('🧬')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canAssimilate),
      new ButtonBuilder()
        .setCustomId(`as:empenho:${id}`)
        .setLabel(`Empenho (+1 Mantido)`)
        .setEmoji('🔥')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!canEmpenho),
      new ButtonBuilder()
        .setCustomId(`as:scene:${id}`)
        .setLabel(roll.simpleAction ? 'Modo: Ação Simples' : 'Modo: Conflito')
        .setEmoji(roll.simpleAction ? '⚖️' : '⚔️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(roll.mode === 'damage' || roll.mode === 'assimilation_test'),
      new ButtonBuilder()
        .setCustomId(`as:keepall:${id}`)
        .setLabel(roll.keepAll ? 'Manter Padrão' : 'Manter Todos')
        .setEmoji('📌')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(roll.mode === 'damage' || roll.mode === 'assimilation_test' || totalDice <= 1),
      new ButtonBuilder()
        .setCustomId(`as:reroll:${id}`)
        .setLabel('Rolar de Novo')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success)
    );

    container.addActionRowComponents(btnRow);
  }

  return {
    components: [container],
    files: [rollAttachment, emblemAttachment],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  };
}

/**
 * Constrói mensagem de ajuda / referência do livro usando Components v2.
 */
function buildHelpPayload(topic, emojiMgr, prefix = '!') {
  ensureIconAssets();
  const emblemAttachment = new AttachmentBuilder(path.join(ICONS_DIR, 'as_emblem.png'), { name: 'as_emblem.png' });

  const eSuc = emojiMgr.get('as_sucesso');
  const eAda = emojiMgr.get('as_adaptacao');
  const ePre = emojiMgr.get('as_pressao');
  const eD6 = emojiMgr.get('as_d6');
  const eD10 = emojiMgr.get('as_d10');
  const eD12 = emojiMgr.get('as_d12');
  const eDet = emojiMgr.get('as_determinacao');
  const eAss = emojiMgr.get('as_assimilacao');
  const eSau = emojiMgr.get('as_saude');

  let bodyText = '';
  if (topic === 'symbols') {
    bodyText = [
      `### Símbolos Oficiais & Tabela de Faces (pág. 34–43)`,
      `${eSuc} **Sucesso** — Eficácia no intento e controle narrativo. Múltiplos ${eSuc} ampliam o efeito ou acumulam em Objetivos de Conflito.`,
      `${eAda} **Adaptação** — Meio criativo para contornar obstáculos, anular ${ePre} em Ação Simples, transferir ${eSuc} ou apoiar aliados.`,
      `${ePre} **Pressão** — Consequência negativa definida pelo(a) Assimilador(a), perda de Determinação ${eDet} ou desgaste de posse.`,
      ``,
      `### Dados de Assimilação`,
      `• ${eD6} **d6 (Instintos):** 1–2 \`-\` | 3–4 ${ePre} | 5 ${eAda}${ePre} | 6 ${eSuc}`,
      `• ${eD10} **d10 (Conhec./Práticas):** 1–6 igual d6 | 7 ${eSuc}${eSuc} | 8 ${eSuc}${eAda} | 9 ${eSuc}${eAda}${ePre} | 10 ${eSuc}${eSuc}${ePre}`,
      `• ${eD12} **d12 (Assimilada):** 1–10 igual d10 | 11 ${eSuc}${eAda}${eAda}${ePre} | 12 ${ePre}${ePre}`,
    ].join('\n');
  } else if (topic === 'rules') {
    bodyText = [
      `### Regras Rápidas do Livro Básico`,
      `• **Pilha de Teste:** Instinto (${eD6}) + Conhecimento ou Prática (${eD10}). Mantém **1 dado** por padrão (até **4** com recursos).`,
      `• **Mantendo Dados Adicionais:** *Origem* (1x/sessão por origem, pode descartar), *Empenho* (1 Ponto de Determinação ${eDet}, 1x/rodada) ou *Agir por Instinto*.`,
      `• **Agir por Instinto (Rolagem Assimilada):** Gasta 1 ${eAss} (ou 2 ${eDet}), troca Conhecimento/Prática por outro Instinto, converte todos os dados em ${eD12} e mantém +1 dado.`,
      `• **Cabo de Guerra:** Nível de Determinação + Nível de Assimilação = **10**.`,
      `• **Saúde (${eSau}):** 6 Níveis (cada um com \`1 + Potência + Resolução\` Pontos). Níveis 4–3: \`-1\` ${eSuc}; Nível 2: \`-2\` ${eSuc} + 1 ${eDet} p/ agir; Nível 1: inconsciente.`,
      `• **Escala de Pressões (pág. 40):** 1C Menor • 2C Relevante • 3C Séria • 4C Grave • 5C Crítica • 6+C Devastadora.`,
    ].join('\n');
  } else {
    bodyText = [
      `### Como Rolar (Sufixo \`a\` ou Prefixo \`${prefix}\`)`,
      `• \`3d6 a\` ou \`${prefix}3d6 a\` — Rola 3 dados de Instinto (${eD6}) e mantém o melhor.`,
      `• \`d12 a\` ou \`${prefix}d12 a\` — Rola 1 dado Assimilado (${eD12}).`,
      `• \`3d6 + 2d10 a\` — Junta Instinto + Conhecimento/Prática e mantém o melhor dado.`,
      `• \`3d6 2d10 a m2\` — Mantém **2 dados** (ex: Empenho ou Origem).`,
      `• \`3d6 2d10 a instinto\` — Já rola como **Rolagem Assimilada** (tudo ${eD12}, +1 mantido).`,
      `• \`3d10 a dano\` — **Rolagem de Dano** (mantém todos; cada símbolo vale 1 de dano).`,
      `• \`2d6+1d10+1d12 a conflito\` — **Modo Assimilador/Conflito** (mantém todos os dados).`,
      `• \`assimilacao 3 a\` — **Teste de Assimilação** (\`1 + 2×Nível\` em ${eD12}, alerta de 10 Pressões).`,
      `• \`tabela a\` / \`tabela 12 a\` — Sorteia **Linha × Coluna (6×6)** (pág. 277).`,
      `• Adicione \`#descrição\` no fim para nomear o teste (ex: \`3d6 1d10 a #Percepção + Erudição\`).`,
    ].join('\n');
  }

  const header = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Assimilação RPG — Guia do Rolador\nRolagens com os **ícones oficiais**, tabela de faces e mecânicas de *Roll & Keep* via **Components v2**.`
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL('attachment://as_emblem.png')
        .setDescription('Assimilação RPG')
    );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('as:help:overview')
      .setLabel('Comandos')
      .setEmoji('🎲')
      .setStyle(topic === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('as:help:symbols')
      .setLabel('Ícones e Faces')
      .setEmoji('🪲')
      .setStyle(topic === 'symbols' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('as:help:rules')
      .setLabel('Regras & Pressão')
      .setEmoji('📜')
      .setStyle(topic === 'rules' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const container = new ContainerBuilder()
    .setAccentColor(0x34d399)
    .addSectionComponents(header)
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(bodyText))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addActionRowComponents(navRow);

  return {
    components: [container],
    files: [emblemAttachment],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  };
}

function buildErrorPayload(message) {
  const container = new ContainerBuilder()
    .setAccentColor(0xef4444)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ⚠️ Comando Inválido\n${message}\n\n*Exemplo válido:* \`3d6 a\`, \`d12 a\`, \`3d6 + 2d10 a\` ou \`ajuda a\`.`)
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  };
}

module.exports = {
  buildRollPayload,
  buildHelpPayload,
  buildErrorPayload,
};
