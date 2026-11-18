const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const FONT_PATH = path.resolve(__dirname, '../../assets/fonts/simbolos_assimilas.ttf');
const ICONS_DIR = path.resolve(__dirname, '../../assets/icons');
const FONT_FAMILY = 'SimbolosAssimilacao';

let fontLoaded = false;

function ensureFontRegistered() {
  if (fontLoaded) return;
  if (!fs.existsSync(FONT_PATH)) {
    throw new Error(`Fonte oficial não encontrada em: ${FONT_PATH}`);
  }
  GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
  fontLoaded = true;
}

const ICON_SPECS = [
  { name: 'as_sucesso', char: 'a', fill: '#34D399', stroke: '#052E16', badgeBg: null },
  { name: 'as_adaptacao', char: 'B', fill: '#38BDF8', stroke: '#082F49', badgeBg: null },
  { name: 'as_pressao', char: 'C', fill: '#F87171', stroke: '#450A0A', badgeBg: null },
  { name: 'as_d6', char: '6', fill: '#FCD34D', stroke: '#451A03', innerText: '6', innerColor: '#1E1B18' },
  { name: 'as_d10', char: '1', fill: '#38BDF8', stroke: '#082F49', innerText: '10', innerColor: '#082F49' },
  { name: 'as_d12', char: '2', fill: '#C084FC', stroke: '#2E1065', innerText: '12', innerColor: '#2E1065' },
  { name: 'as_determinacao', char: 'd', fill: '#FBBF24', stroke: '#451A03', badgeBg: null },
  { name: 'as_assimilacao', char: 'e', fill: '#E879F9', stroke: '#4A044E', badgeBg: null },
  { name: 'as_saude', char: 's', fill: '#EF4444', stroke: '#450A0A', badgeBg: null },
];

/**
 * Desenha um glifo da fonte oficial centralizado no canvas usando métricas reais (actualBoundingBox).
 */
function drawCenteredGlyph(ctx, char, cx, cy, fontSize, fill, stroke, strokeWidth = 4) {
  ensureFontRegistered();
  ctx.save();
  ctx.font = `${fontSize}px "${FONT_FAMILY}"`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const m = ctx.measureText(char);
  const left = m.actualBoundingBoxLeft ?? 0;
  const right = m.actualBoundingBoxRight ?? m.width;
  const ascent = m.actualBoundingBoxAscent ?? fontSize * 0.7;
  const descent = m.actualBoundingBoxDescent ?? fontSize * 0.1;

  const glyphWidth = left + right;
  const glyphHeight = ascent + descent;

  const x = cx - glyphWidth / 2 + left;
  const y = cy - glyphHeight / 2 + ascent;

  if (stroke && strokeWidth > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(char, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(char, x, y);
  ctx.restore();
}

function renderIconBuffer(spec, size = 128) {
  ensureFontRegistered();
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  const fontSize = Math.round(size * 0.72);
  drawCenteredGlyph(ctx, spec.char, size / 2, size / 2, fontSize, spec.fill, spec.stroke, Math.max(3, size * 0.05));

  if (spec.innerText) {
    ctx.save();
    ctx.font = `800 ${Math.round(size * 0.28)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = spec.innerColor;
    ctx.fillText(spec.innerText, size / 2, size / 2 + (spec.name === 'as_d12' ? size * 0.03 : 0));
    ctx.restore();
  }

  return canvas.toBuffer('image/png');
}

function renderEmblemBuffer(size = 256) {
  ensureFontRegistered();
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fundo escuro circular/arredondado estilo dossiê infectado
  const grad = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.1, size * 0.5, size * 0.5, size * 0.52);
  grad.addColorStop(0, '#272228');
  grad.addColorStop(1, '#111317');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(4, 4, size - 8, size - 8, 36);
  ctx.fill();

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#B91C1C';
  ctx.stroke();

  // Três ícones em tríade: Sucesso (topo), Adaptação (esq), Pressão (dir)
  drawCenteredGlyph(ctx, 'a', size * 0.5, size * 0.29, size * 0.34, '#34D399', '#052E16', 5);
  drawCenteredGlyph(ctx, 'B', size * 0.29, size * 0.67, size * 0.33, '#38BDF8', '#082F49', 5);
  drawCenteredGlyph(ctx, 'C', size * 0.71, size * 0.67, size * 0.31, '#F87171', '#450A0A', 5);

  return canvas.toBuffer('image/png');
}

function ensureIconAssets() {
  ensureFontRegistered();
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  const paths = {};
  for (const spec of ICON_SPECS) {
    const outPath = path.join(ICONS_DIR, `${spec.name}.png`);
    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, renderIconBuffer(spec, 128));
    }
    paths[spec.name] = outPath;
  }

  const emblemPath = path.join(ICONS_DIR, 'as_emblem.png');
  if (!fs.existsSync(emblemPath)) {
    fs.writeFileSync(emblemPath, renderEmblemBuffer(256));
  }
  paths.as_emblem = emblemPath;

  return paths;
}

module.exports = {
  FONT_FAMILY,
  ICONS_DIR,
  ICON_SPECS,
  ensureFontRegistered,
  drawCenteredGlyph,
  ensureIconAssets,
};
