const DEFAULT_PITCH_COLOR = '#163b2d';
const DEFAULT_LINE_COLOR = '#f8fafc';
const DEFAULT_LINE_OPACITY = 0.78;

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  return element;
}

export function createPitchSvg(container, options = {}) {
  if (!container) {
    return null;
  }

  const svg = createSvgElement('svg', {
    viewBox: '0 0 120 80',
    width: options.width || '100%',
    height: options.height || '100%',
    role: 'img',
    'aria-label': options.label || 'Pitch visual',
  });
  container.appendChild(svg);
  return svg;
}

export function drawPitch(svgOrContainer, options = {}) {
  const svg = svgOrContainer instanceof SVGElement ? svgOrContainer : createPitchSvg(svgOrContainer, options);
  if (!svg) {
    return null;
  }

  svg.innerHTML = '';
  const pitchColor = options.pitchColor || DEFAULT_PITCH_COLOR;
  const lineColor = options.lineColor || DEFAULT_LINE_COLOR;
  const lineOpacity = options.lineOpacity ?? DEFAULT_LINE_OPACITY;
  const lineWidth = options.lineWidth ?? 0.8;
  const orientation = options.orientation || 'horizontal';
  const halfOnly = Boolean(options.halfOnly);

  const pitchGroup = createSvgElement('g', {
    stroke: lineColor,
    'stroke-opacity': lineOpacity,
    'stroke-width': lineWidth,
    fill: pitchColor,
  });

  const outerRect = createSvgElement('rect', {
    x: 2,
    y: 2,
    width: 116,
    height: 76,
    rx: 2,
    fill: pitchColor,
    stroke: lineColor,
    'stroke-opacity': lineOpacity,
    'stroke-width': lineWidth,
  });
  pitchGroup.appendChild(outerRect);

  const halfLine = createSvgElement('line', { x1: 60, y1: 2, x2: 60, y2: 78 });
  pitchGroup.appendChild(halfLine);

  const centerCircle = createSvgElement('circle', { cx: 60, cy: 40, r: 9.15 });
  pitchGroup.appendChild(centerCircle);

  const centerMark = createSvgElement('circle', { cx: 60, cy: 40, r: 0.75, fill: lineColor });
  pitchGroup.appendChild(centerMark);

  const penaltyBox = (x, y) => ({ x, y, width: 16.5, height: 40.3 });
  const sixYardBox = (x, y) => ({ x, y, width: 5.5, height: 18.32 });
  const boxes = [
    penaltyBox(2.5, 19.85),
    penaltyBox(101, 19.85),
    sixYardBox(2.5, 30.84),
    sixYardBox(112, 30.84),
  ];

  boxes.forEach((box) => {
    const rect = createSvgElement('rect', {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      fill: 'none',
    });
    pitchGroup.appendChild(rect);
  });

  const goalAreas = [
    { x: 0, y: 32.34, width: 2.5, height: 15.32 },
    { x: 117.5, y: 32.34, width: 2.5, height: 15.32 },
  ];
  goalAreas.forEach((goalArea) => {
    const rect = createSvgElement('rect', {
      x: goalArea.x,
      y: goalArea.y,
      width: goalArea.width,
      height: goalArea.height,
      fill: 'none',
    });
    pitchGroup.appendChild(rect);
  });

  const penaltySpots = [
    { cx: 12, cy: 40 },
    { cx: 108, cy: 40 },
  ];
  penaltySpots.forEach((spot) => {
    pitchGroup.appendChild(createSvgElement('circle', { cx: spot.cx, cy: spot.cy, r: 0.75, fill: lineColor }));
  });

  const cornerArcs = [
    { cx: 2, cy: 2, r: 1.5, start: 0, end: 90 },
    { cx: 118, cy: 2, r: 1.5, start: -90, end: 0 },
    { cx: 2, cy: 78, r: 1.5, start: 90, end: 180 },
    { cx: 118, cy: 78, r: 1.5, start: 180, end: 270 },
  ];
  cornerArcs.forEach((arc) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const startAngle = (arc.start * Math.PI) / 180;
    const endAngle = (arc.end * Math.PI) / 180;
    const startX = arc.cx + Math.cos(startAngle) * arc.r;
    const startY = arc.cy + Math.sin(startAngle) * arc.r;
    const endX = arc.cx + Math.cos(endAngle) * arc.r;
    const endY = arc.cy + Math.sin(endAngle) * arc.r;
    path.setAttribute('d', `M ${startX} ${startY} A ${arc.r} ${arc.r} 0 0 1 ${endX} ${endY}`);
    pitchGroup.appendChild(path);
  });

  const goals = [
    { x: 0, y: 35.5, width: 1.2, height: 9 },
    { x: 118.8, y: 35.5, width: 1.2, height: 9 },
  ];
  goals.forEach((goal) => {
    pitchGroup.appendChild(createSvgElement('rect', {
      x: goal.x,
      y: goal.y,
      width: goal.width,
      height: goal.height,
      fill: 'none',
      stroke: lineColor,
      'stroke-opacity': lineOpacity,
      'stroke-width': lineWidth,
    }));
  });

  if (halfOnly) {
    const clipRect = createSvgElement('rect', {
      x: 2,
      y: 2,
      width: 116,
      height: 38,
      fill: pitchColor,
      stroke: 'none',
    });
    pitchGroup.appendChild(clipRect);
  }

  if (orientation !== 'horizontal') {
    const transform = createSvgElement('g', { transform: 'rotate(180 60 40)' });
    Array.from(pitchGroup.childNodes).forEach((child) => transform.appendChild(child.cloneNode(true)));
    svg.appendChild(transform);
  } else {
    svg.appendChild(pitchGroup);
  }

  return svg;
}

export function toSvgXY(x, y, options = {}) {
  const width = options.width ?? 120;
  const height = options.height ?? 80;
  const flipX = Boolean(options.flipX ?? options.flip);
  const flipY = Boolean(options.flipY);
  const mappedX = flipX ? width - x : x;
  const mappedY = flipY ? height - y : y;
  return { x: (mappedX / width) * 120, y: (mappedY / height) * 80 };
}

export function toSvgPoint(x, y, options = {}) {
  const point = toSvgXY(x, y, options);
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}
