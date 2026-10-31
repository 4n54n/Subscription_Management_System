import {
  type CanvasRenderer,
  ConnectorUtils,
  type ElementRenderer,
  ElementRendererExtension,
  type RoughCanvas,
} from '@blocksuite/affine-block-surface';
import {
  getFontString,
  getLineHeight,
  getTextWidth,
  isRTL,
  type TextDelta,
  wrapTextDeltas,
} from '@blocksuite/affine-gfx-text';
import {
  type ConnectorElementModel,
  ConnectorMode,
  DefaultTheme,
  type LocalConnectorElementModel,
  type PointStyle,
} from '@blocksuite/affine-model';
import {
  getBezierParameters,
  getBezierPoint,
  Vec,
  type PointLocation,
} from '@blocksuite/global/gfx';
import { deltaInsertsToChunks } from '@blocksuite/std/inline';

import {
  DEFAULT_ARROW_SIZE,
  getArrowOptions,
  renderArrow,
  renderCircle,
  renderDiamond,
  renderTriangle,
} from './utils.js';

export const connector: ElementRenderer<
  ConnectorElementModel | LocalConnectorElementModel
> = (model, ctx, matrix, renderer, rc) => {
  const {
    mode,
    path: points,
    strokeStyle,
    frontEndpointStyle,
    rearEndpointStyle,
    strokeWidth,
  } = model;

  // points might not be build yet in some senarios
  // eg. undo/redo, copy/paste
  if (!points.length || points.length < 2) {
    return;
  }

  ctx.setTransform(matrix);

  const hasLabel = ConnectorUtils.isConnectorWithLabel(model);
  let dx = 0;
  let dy = 0;

  if (hasLabel) {
    ctx.save();

    const { deserializedXYWH, labelXYWH } = model as ConnectorElementModel;
    const [x, y, w, h] = deserializedXYWH;
    const [lx, ly, lw, lh] = labelXYWH!;
    const offset = DEFAULT_ARROW_SIZE * strokeWidth;

    dx = lx - x;
    dy = ly - y;

    const path = new Path2D();
    path.rect(-offset / 2, -offset / 2, w + offset, h + offset);
    path.rect(dx - 3 - 0.5, dy - 3 - 0.5, lw + 6 + 1, lh + 6 + 1);
    ctx.clip(path, 'evenodd');
  }

  const strokeColor = renderer.getColorValue(
    model.stroke,
    DefaultTheme.connectorColor,
    true
  );

  renderPoints(
    model,
    ctx,
    rc,
    points,
    strokeStyle === 'dash',
    mode === ConnectorMode.Curve,
    strokeColor,
    renderer
  );
  renderEndpoint(
    model,
    points,
    ctx,
    rc,
    'Front',
    frontEndpointStyle,
    strokeColor
  );
  renderEndpoint(
    model,
    points,
    ctx,
    rc,
    'Rear',
    rearEndpointStyle,
    strokeColor
  );

  if (hasLabel) {
    ctx.restore();

    renderLabel(
      model as ConnectorElementModel,
      ctx,
      matrix.translate(dx, dy),
      renderer
    );
  }
};

export const ConnectorElementRendererExtension = ElementRendererExtension(
  'connector',
  connector
);

function getPointOnPath(
  points: PointLocation[],
  curve: boolean,
  t: number
): [number, number] {
  if (t <= 0) return [points[0][0], points[0][1]];
  if (t >= 1) return [points[points.length - 1][0], points[points.length - 1][1]];

  if (curve && points.length >= 2) {
    const b = getBezierParameters(points);
    const p = getBezierPoint(b, t);
    if (p) return [p[0], p[1]];
  }

  // Linear / Polyline interpolation
  let totalLength = 0;
  const lengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dist = Vec.dist(
      [points[i][0], points[i][1]],
      [points[i + 1][0], points[i + 1][1]]
    );
    lengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) return [points[0][0], points[0][1]];

  const targetLen = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (accumulated + lengths[i] >= targetLen) {
      const segT = (targetLen - accumulated) / lengths[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const x = p1[0] + (p2[0] - p1[0]) * segT;
      const y = p1[1] + (p2[1] - p1[1]) * segT;
      return [x, y];
    }
    accumulated += lengths[i];
  }

  return [points[points.length - 1][0], points[points.length - 1][1]];
}

function tracePath(
  ctx: CanvasRenderingContext2D,
  points: PointLocation[],
  curve: boolean
) {
  ctx.beginPath();
  if (curve) {
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point[0], point[1]);
      } else {
        const last = points[index - 1];
        ctx.bezierCurveTo(
          last.absOut[0],
          last.absOut[1],
          point.absIn[0],
          point.absIn[1],
          point[0],
          point[1]
        );
      }
    });
  } else {
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point[0], point[1]);
      } else {
        ctx.lineTo(point[0], point[1]);
      }
    });
  }
}

function renderPoints(
  model: ConnectorElementModel | LocalConnectorElementModel,
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  points: PointLocation[],
  dash: boolean,
  curve: boolean,
  stroke: string,
  renderer: CanvasRenderer
) {
  const { seed, strokeWidth, roughness, rough, strokeStyle } = model;
  if (strokeStyle === 'electric') {
    // 1. Draw glowing background path using the user's selected stroke color
    ctx.save();
    ctx.lineWidth = strokeWidth + 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = 0.2;
    ctx.shadowColor = stroke;
    ctx.shadowBlur = 8;
    tracePath(ctx, points, curve);
    ctx.stroke();
    ctx.restore();

    // 2. Draw animated glowing main path using the user's selected stroke color
    ctx.save();
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke;
    ctx.shadowColor = stroke;
    ctx.shadowBlur = 12;
    ctx.setLineDash([30, 45]);
    ctx.lineDashOffset = -(Date.now() / 15) % 75;
    tracePath(ctx, points, curve);
    ctx.stroke();
    ctx.restore();

    // 3. Draw animated hot-white core spark
    ctx.save();
    ctx.lineWidth = Math.max(1, strokeWidth - 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = stroke;
    ctx.shadowBlur = 6;
    ctx.setLineDash([15, 60]);
    ctx.lineDashOffset = -(Date.now() / 15) % 75;
    tracePath(ctx, points, curve);
    ctx.stroke();
    ctx.restore();

    // Schedule next frame to animate the dash offset
    requestAnimationFrame(() => {
      if (renderer && typeof renderer.refresh === 'function') {
        renderer.refresh();
      }
    });
    return;
  }

  if (strokeStyle === 'coir') {
    // Guard: need at least 2 points to form a path
    if (!points || points.length < 2) return;

    // --- Rope geometry setup ---
    // Cap samples to prevent canvas hang. 120 points give a smooth rope.
    const NUM_SAMPLES = 120;
    const amplitude = Math.max(7, strokeWidth * 2.2); // bigger — clearly visible at default zoom
    const strandWidth = Math.max(0.8, strokeWidth * 0.28); // thin strands

    // Single unified timeOffset — same divisor as electric for identical speed
    const timeOffset = Date.now() / 450;
    // Tight twist frequency — unified so all 3 strands use the same wave speed
    const FREQ = 60;

    // Build sampled path points + normals once
    const sampledPts: [number, number][] = [];
    const normals: [number, number][] = [];
    for (let s = 0; s <= NUM_SAMPLES; s++) {
      const t = s / NUM_SAMPLES;
      const p = getPointOnPath(points, curve, t);
      sampledPts.push(p);
      const pNext = getPointOnPath(points, curve, Math.min(1, t + 1 / NUM_SAMPLES));
      const diff = Vec.sub(pNext, p);
      const dir = Vec.len(diff) > 0.001 ? Vec.normalize(diff) : ([1, 0] as [number, number]);
      normals.push([-dir[1], dir[0]] as [number, number]);
    }

    // Subtle rope backing — one plain stroke, no per-step shadowBlur
    ctx.save();
    ctx.lineWidth = strokeWidth + 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = 0.12;
    tracePath(ctx, points, curve);
    ctx.stroke();
    ctx.restore();

    // Each strand is ONE polyline — O(N) moveTo/lineTo, O(1) ctx.stroke() per strand.
    // Alpha and lineWidth are set once per strand based on which strand is currently
    // "on top" (highest midpoint sine = front, painter's algorithm).
    const drawStrand = (phaseOffset: number, alpha: number) => {
      ctx.save();
      ctx.lineWidth = strandWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = stroke;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = stroke;
      ctx.shadowBlur = alpha > 0.7 ? 6 : 2; // brighter glow on front strand
      ctx.beginPath();
      for (let s = 0; s <= NUM_SAMPLES; s++) {
        const t = s / NUM_SAMPLES;
        const phase = t * FREQ - timeOffset + phaseOffset;
        const offset = amplitude * Math.sin(phase);
        const n = normals[s];
        const x = sampledPts[s][0] + n[0] * offset;
        const y = sampledPts[s][1] + n[1] * offset;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    // Determine which strand is currently "on top" by comparing their sine at t=0.5.
    // Rank them: bottom (0.35) → middle (0.65) → front (1.0).
    // The ranking rotates continuously as timeOffset advances, cycling the depth order.
    const TWO_THIRDS_PI = (2 * Math.PI) / 3;
    const phaseOffsets = [0, TWO_THIRDS_PI, TWO_THIRDS_PI * 2];
    const midSins = phaseOffsets.map(po => Math.sin(0.5 * FREQ - timeOffset + po));
    const alphaLevels = [0.35, 0.65, 1.0];
    // Sort by ascending sine → draw dimmest first (back), brightest last (front)
    const sorted = phaseOffsets
      .map((po, i) => ({ po, sin: midSins[i] }))
      .sort((a, b) => a.sin - b.sin);
    sorted.forEach(({ po }, i) => drawStrand(po, alphaLevels[i]));

    // Schedule next frame — same pattern as electric
    requestAnimationFrame(() => {
      if (renderer && typeof renderer.refresh === 'function') {
        renderer.refresh();
      }
    });
    return;
  }

  if (rough) {
    const options = {
      seed,
      roughness,
      stroke,
      strokeLineDash: dash ? [12, 12] : undefined,
      strokeWidth,
    };
    if (curve) {
      const b = getBezierParameters(points);
      rc.path(
        `M${b[0][0]},${b[0][1]} C${b[1][0]},${b[1][1]} ${b[2][0]},${b[2][1]} ${b[3][0]},${b[3][1]}`,
        options
      );
    } else {
      rc.linearPath(points as unknown as [number, number][], options);
    }
  } else {
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    dash && ctx.setLineDash([12, 12]);
    tracePath(ctx, points, curve);
    ctx.stroke();
    ctx.restore();
  }
}

function renderEndpoint(
  model: ConnectorElementModel | LocalConnectorElementModel,
  location: PointLocation[],
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  end: 'Front' | 'Rear',
  style: PointStyle,
  stroke: string
) {
  const arrowOptions = getArrowOptions(end, model, stroke);

  switch (style) {
    case 'Arrow':
      renderArrow(location, ctx, rc, arrowOptions);
      break;
    case 'Triangle':
      renderTriangle(location, ctx, rc, arrowOptions);
      break;
    case 'Circle':
      renderCircle(location, ctx, rc, arrowOptions);
      break;
    case 'Diamond':
      renderDiamond(location, ctx, rc, arrowOptions);
      break;
  }
}

function renderLabel(
  model: ConnectorElementModel,
  ctx: CanvasRenderingContext2D,
  matrix: DOMMatrix,
  renderer: CanvasRenderer
) {
  const {
    text,
    labelXYWH,
    labelStyle: {
      color,
      fontSize,
      fontWeight,
      fontStyle,
      fontFamily,
      textAlign,
    },
    labelConstraints: { hasMaxWidth, maxWidth },
  } = model;
  const font = getFontString({
    fontStyle,
    fontWeight,
    fontSize,
    fontFamily,
  });
  const [, , w, h] = labelXYWH!;
  const cx = w / 2;
  const cy = h / 2;
  const deltas = wrapTextDeltas(text!, font, w);
  const lines = deltaInsertsToChunks(deltas);
  const lineHeight = getLineHeight(fontFamily, fontSize, fontWeight);
  const textHeight = (lines.length - 1) * lineHeight * 0.5;

  ctx.setTransform(matrix);

  ctx.font = font;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = renderer.getColorValue(color, DefaultTheme.black, true);

  let textMaxWidth = textAlign === 'center' ? 0 : getMaxTextWidth(lines, font);
  if (hasMaxWidth && maxWidth > 0) {
    textMaxWidth = Math.min(textMaxWidth, textMaxWidth);
  }

  for (const [index, line] of lines.entries()) {
    for (const delta of line) {
      const str = delta.insert;
      const rtl = isRTL(str);
      const shouldTemporarilyAttach = rtl && !ctx.canvas.isConnected;
      if (shouldTemporarilyAttach) {
        // to correctly render RTL text mixed with LTR, we have to append it
        // to the DOM
        document.body.append(ctx.canvas);
      }

      ctx.canvas.setAttribute('dir', rtl ? 'rtl' : 'ltr');

      const x =
        textMaxWidth *
        (textAlign === 'center'
          ? 1
          : textAlign === 'right'
            ? rtl
              ? -0.5
              : 0.5
            : rtl
              ? 0.5
              : -0.5);
      ctx.fillText(str, x + cx, index * lineHeight - textHeight + cy);

      if (shouldTemporarilyAttach) {
        ctx.canvas.remove();
      }
    }
  }
}

function getMaxTextWidth(lines: TextDelta[][], font: string) {
  return Math.max(
    ...lines.flatMap(line =>
      line.map(delta => getTextWidth(delta.insert, font))
    )
  );
}
