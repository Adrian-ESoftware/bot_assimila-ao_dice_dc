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
  MessageFlags,
} = require('discord.js');
const { renderRollImage } = require('../visual/diceRenderer');
const { ICONS_DIR, ensureIconAssets } = require('../visual/iconAssets');

function resolveAccentColor(roll) {
  if (roll.isAssimilatedRoll || roll.mode === 'assimilated') return 0xa855f7;
  if (roll.mode === 'damage') return 0xef4444;
  if (roll.mode === 'assimilation_test') return 0xec4899;
  if (roll.mode === 'conflict') return 0xf97316;
  if (roll.mode === 'table') return 0x14b8a6;
  return 0x34d399;
}

function formatPoolWithEmojis(pool, emojiMgr) {
  const parts = [];
  if (pool.d6 > 0) parts.push(`${emojiMgr.get('as_d6')} **${pool.d6}d6**`);
  if (pool.d10 > 0) parts.push(`${emojiMgr.get('as_d10')} **${pool.d10}d10**`);
  if (pool.d12 > 0) parts.push(`${emojiMgr.get('as_d12')} **${pool.d12}d12**`);
  return parts.join('  +  ');
}

/**
 * Constrói a resposta minimalista de rolagem utilizando Discord Components v2 (apenas nome + imagem).
 */
function buildRollPayload(session, emojiMgr) {
  const { authorName, roll } = session;
  const imgBuffer = renderRollImage(roll, authorName);
  const rollAttachment = new AttachmentBuilder(imgBuffer, { name: 'roll.png' });

  const eSuc = emojiMgr.get('as_sucesso');
  const eAda = emojiMgr.get('as_adaptacao');
  const ePre = emojiMgr.get('as_pressao');
  const eAss = emojiMgr.get('as_assimilacao');
  const eSau = emojiMgr.get('as_saude');

  const headerText = roll.label
    ? `**${authorName}** — *${roll.label}*`
    : `**${authorName}**`;

  const gallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder()
      .setURL('attachment://roll.png')
      .setDescription(`Resultado da rolagem de ${authorName}`)
  );

  const container = new ContainerBuilder()
    .setAccentColor(resolveAccentColor(roll))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
    .addMediaGalleryComponents(gallery);

  // Resumo curto apenas nos modos em que todos os dados são somados automaticamente
  const footerLines = [];
  if (roll.mode === 'table') {
    footerLines.push(`🎲 **Coordenada:** **Linha ${roll.row} × Coluna ${roll.col}**`);
  } else if (roll.mode === 'damage') {
    footerLines.push(`${eSau} **Dano Total:** \`${roll.totals.totalSymbols}\``);
  } else if (roll.mode === 'assimilation_test') {
    footerLines.push(
      `${eAss} **Total (Nível ${roll.assimilationLevel ?? '?'}):** ${eSuc} \`${roll.totals.A}\`  •  ${eAda} \`${roll.totals.B}\`  •  ${ePre} \`${roll.totals.C}\``
    );
    if (roll.totals.C >= 10) {
      footerLines.push(`⚠️ **10+ Pressões:** O(a) Infectado(a) perde o controle para a Assimilação!`);
    }
  }

  if (footerLines.length > 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footerLines.join('\n')));
  }

  return {
    components: [container],
    files: [rollAttachment],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  };
}

/**
 * Constrói mensagem de ajuda simples usando Components v2 (sem botões).
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

  let bodyText = '';
  if (topic === 'symbols') {
    bodyText = [
      `### Símbolos e Faces`,
      `${eSuc} **Sucesso**  •  ${eAda} **Adaptação**  •  ${ePre} **Pressão**`,
      ``,
      `• ${eD6} **d6:** 1–2 \`-\` | 3–4 ${ePre} | 5 ${eAda}${ePre} | 6 ${eSuc}`,
      `• ${eD10} **d10:** 1–6 igual d6 | 7 ${eSuc}${eSuc} | 8 ${eSuc}${eAda} | 9 ${eSuc}${eAda}${ePre} | 10 ${eSuc}${eSuc}${ePre}`,
      `• ${eD12} **d12:** 1–10 igual d10 | 11 ${eSuc}${eAda}${eAda}${ePre} | 12 ${ePre}${ePre}`,
    ].join('\n');
  } else if (topic === 'rules') {
    bodyText = [
      `### Regras Rápidas`,
      `• **Pilha de Teste:** Instinto (${eD6}) + Conhecimento/Prática (${eD10}).`,
      `• **Agir por Instinto:** Converte todos os dados em ${eD12}.`,
      `• **Escala de Pressões:** 1C Menor • 2C Relevante • 3C Séria • 4C Grave • 5C Crítica • 6+C Devastadora.`,
    ].join('\n');
  } else {
    bodyText = [
      `### Como Rolar`,
      `• \`3d6a\` ou \`3d6+2d10a\` — Rola os dados (${eD6}, ${eD10}, ${eD12})`,
      `• \`3d6+2d10a instinto\` — Converte tudo para ${eD12}`,
      `• \`3d10a dano\` — Soma todos os símbolos como dano`,
      `• \`${prefix}assimilacao 3\` — Teste de Assimilação (Nível 3)`,
      `• \`${prefix}tabela\` / \`${prefix}tabela 12\` — Sorteio 6×6`,
      `• Use \`#descrição\` no fim para nomear (ex: \`3d6a #Furtividade\`)`,
      `• Comandos extras: \`${prefix}simbolos\` e \`${prefix}regras\``,
    ].join('\n');
  }

  const header = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Assimilação RPG — Ajuda`
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL('attachment://as_emblem.png')
        .setDescription('Assimilação RPG')
    );

  const container = new ContainerBuilder()
    .setAccentColor(0x34d399)
    .addSectionComponents(header)
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(bodyText));

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
      new TextDisplayBuilder().setContent(`### ⚠️ Comando Inválido\n${message}\n\n*Exemplo válido:* \`3d6a\`, \`d12a\`, \`3d6+2d10a\` ou \`!ajuda\`.`)
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
