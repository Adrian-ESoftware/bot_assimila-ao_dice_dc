const { createCanvas } = require('@napi-rs/canvas');
const { ensureFontRegistered, drawCenteredGlyph, UI_FONT_FAMILY } = require('./iconAssets');

const THEME = {
  bgTop: '#14171D',
  bgBottom: '#0C0E12',
  border: '#2B313C',
  keptBorder: '#F59E0B',
  keptBg: '#1C232B',
  keptBadgeBg: '#F59E0B',
  keptBadgeText: '#111827',
  unkeptBg: '#121419',
  unkeptBorder: '#242933',
  textPrimary: '#F3F4F6',
  textMuted: '#9CA3AF',
  symbols: {
    A: { glyph: 'a', fill: '#34D399', stroke: '#052E16', label: 'Sucesso' },
    B: { glyph: 'B', fill: '#38BDF8', stroke: '#082F49', label: 'Adaptação' },
    C: { glyph: 'C', fill: '#F87171', stroke: '#450A0A', label: 'Pressão' },
  },
  diceColors: {
    6: { glyph: '6', color: '#FCD34D', badge: '#78350F', label: 'D6' },
    10: { glyph: '1', color: '#38BDF8', badge: '#0C4A6E', label: 'D10' },
    12: { glyph: '2', color: '#C084FC', badge: '#3B0764', label: 'D12' },
  },
};

function getModeAccent(roll) {
  if (roll.isAssimilatedRoll || roll.mode === 'assimilated') {
    return { accent: '#A855F7', title: 'ROLAGEM ASSIMILADA • AGIR POR INSTINTO' };
  }
  if (roll.mode === 'damage') {
    return { accent: '#EF4444', title: 'ROLAGEM DE DANO' };
  }
  if (roll.mode === 'conflict') {
    return { accent: '#F97316', title: 'CONFLITO • ASSIMILADOR' };
  }
  if (roll.mode === 'assimilation_test') {
    return { accent: '#EC4899', title: 'TESTE DE ASSIMILAÇÃO' };
  }
  if (roll.mode === 'table') {
    return { accent: '#14B8A6', title: 'TABELA 6×6 • SORTEIO DE CENA' };
  }
  return { accent: '#34D399', title: 'TESTE DE ASSIMILAÇÃO RPG' };
}

function drawDieCard(ctx, die, x, y, w, h) {
  ctx.save();

  // Fundo do card do dado
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fillStyle = THEME.keptBg;
  ctx.fill();

  // Borda limpa
  const dieMeta = THEME.diceColors[die.sides] || THEME.diceColors[6];
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = THEME.border;
  ctx.stroke();

  // Cabeçalho do dado: forma geométrica + D6/D10/D12 + face numérica
  drawCenteredGlyph(ctx, dieMeta.glyph, x + 22, y + 20, 18, dieMeta.color, '#090B0E', 2);

  ctx.font = `bold 13px "${UI_FONT_FAMILY}"`;
  ctx.fillStyle = dieMeta.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(dieMeta.label, x + 35, y + 20);

  // Número correspondente da face (Tabela pág. 43) no canto direito
  ctx.font = `bold 12px "${UI_FONT_FAMILY}"`;
  ctx.fillStyle = THEME.textMuted;
  ctx.textAlign = 'right';
  ctx.fillText(`#${die.faceNumber}`, x + w - 12, y + 20);

  // Índice do dado no canto esquerdo inferior
  ctx.font = `normal 11px "${UI_FONT_FAMILY}"`;
  ctx.fillStyle = '#6B7280';
  ctx.textAlign = 'left';
  ctx.fillText(`Dado ${die.index + 1}`, x + 12, y + h - 16);

  // Símbolos centrais da face
  const centerX = x + w / 2;
  const centerY = y + h * 0.5;
  const syms = die.symbols;

  if (syms.length === 0) {
    ctx.font = `bold 22px "${UI_FONT_FAMILY}"`;
    ctx.fillStyle = '#4B5563';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('—', centerX, centerY - 4);

    ctx.font = `bold 11px "${UI_FONT_FAMILY}"`;
    ctx.fillStyle = '#6B7280';
    ctx.fillText('VAZIO', centerX, centerY + 18);
  } else if (syms.length === 1) {
    const s = THEME.symbols[syms[0]];
    drawCenteredGlyph(ctx, s.glyph, centerX, centerY - 2, 54, s.fill, s.stroke, 4);
  } else if (syms.length === 2) {
    const s0 = THEME.symbols[syms[0]];
    const s1 = THEME.symbols[syms[1]];
    drawCenteredGlyph(ctx, s0.glyph, centerX - 24, centerY - 2, 42, s0.fill, s0.stroke, 3.5);
    drawCenteredGlyph(ctx, s1.glyph, centerX + 24, centerY - 2, 42, s1.fill, s1.stroke, 3.5);
  } else if (syms.length === 3) {
    const positions = [
      [centerX - 23, centerY - 16],
      [centerX + 23, centerY - 16],
      [centerX, centerY + 18],
    ];
    syms.forEach((sym, i) => {
      const s = THEME.symbols[sym];
      drawCenteredGlyph(ctx, s.glyph, positions[i][0], positions[i][1], 32, s.fill, s.stroke, 3);
    });
  } else {
    const positions = [
      [centerX - 22, centerY - 16],
      [centerX + 22, centerY - 16],
      [centerX - 22, centerY + 16],
      [centerX + 22, centerY + 16],
    ];
    syms.slice(0, 4).forEach((sym, i) => {
      const s = THEME.symbols[sym];
      drawCenteredGlyph(ctx, s.glyph, positions[i][0], positions[i][1], 29, s.fill, s.stroke, 2.5);
    });
  }

  ctx.restore();
}

/**
 * Renderiza a bandeja visual completa da rolagem em PNG de alta resolução (2x HiDPI).
 */
function renderRollImage(roll, authorName = 'Infectado(a)') {
  ensureFontRegistered();

  const dice = roll.dice || [];

  // Ajusta colunas conforme a quantidade de dados para evitar compressão excessiva no Discord
  let cols = 4;
  if (dice.length <= 4) {
    cols = Math.max(2, dice.length);
  } else if (dice.length <= 12) {
    cols = 4;
  } else if (dice.length <= 20) {
    cols = 5;
  } else {
    cols = 6;
  }
  const rows = Math.ceil(dice.length / cols);

  const cardW = cols >= 6 ? 140 : 150;
  const cardH = cols >= 6 ? 138 : 144;
  const gap = 12;
  const padX = 22;
  const headerH = 78;
  const footerH = 18;

  const width = Math.max(520, padX * 2 + cols * cardW + (cols - 1) * gap);
  const height = headerH + rows * cardH + (rows - 1) * gap + footerH + 8;

  // Renderização em 2x HiDPI para manter nitidez no Desktop, Mobile e telas Retina
  const scale = 2;
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fundo principal com gradiente
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, THEME.bgTop);
  bg.addColorStop(1, THEME.bgBottom);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 18);
  ctx.fill();

  const modeInfo = getModeAccent(roll);

  // Barra superior de destaque
  ctx.fillStyle = modeInfo.accent;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, 5, [18, 18, 0, 0]);
  ctx.fill();

  // Cabeçalho esquerdo: Modo e Pool
  ctx.font = `bold 13px "${UI_FONT_FAMILY}"`;
  ctx.fillStyle = modeInfo.accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(modeInfo.title, padX, 18);

  ctx.font = `bold 20px "${UI_FONT_FAMILY}"`;
  ctx.fillStyle = THEME.textPrimary;
  const subtitle = roll.mode === 'table'
    ? `Tabela 6×6 • Linha ${roll.row}, Coluna ${roll.col}`
    : `${authorName}  •  ${roll.expression}`;
  ctx.fillText(subtitle, padX, 38, width - padX * 2);

  // Linha divisória sutil
  ctx.strokeStyle = '#242933';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, headerH - 8);
  ctx.lineTo(width - padX, headerH - 8);
  ctx.stroke();

  // Renderiza os cards dos dados centralizados por linha
  dice.forEach((die, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const itemsInThisRow = r === rows - 1 ? dice.length - r * cols : cols;
    const rowWidth = itemsInThisRow * cardW + (itemsInThisRow - 1) * gap;
    const rowStartX = (width - rowWidth) / 2;

    const dx = rowStartX + c * (cardW + gap);
    const dy = headerH + r * (cardH + gap);
    drawDieCard(ctx, die, dx, dy, cardW, cardH);
  });

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderRollImage,
};
