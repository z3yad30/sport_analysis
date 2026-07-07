import { defensiveStats, passStats, shotStats, touchStats } from '../stats.js';

const METRICS = [
  { key: 'passingAccuracy', label: 'Passing Accuracy%', formatter: (value) => `${Math.round(value)}%` },
  { key: 'shots', label: 'Shots', formatter: (value) => `${Math.round(value)}` },
  { key: 'progressiveActions', label: 'Progressive Actions', formatter: (value) => `${Math.round(value)}` },
  { key: 'defensiveActions', label: 'Defensive Actions', formatter: (value) => `${Math.round(value)}` },
  { key: 'touches', label: 'Touches', formatter: (value) => `${Math.round(value)}` },
  { key: 'xg', label: 'xG', formatter: (value) => value.toFixed(2) },
];

function getPlayerMetricSnapshot(events, playerName) {
  const passes = passStats(events, playerName);
  const shots = shotStats(events, playerName);
  const defensive = defensiveStats(events, playerName);
  const touches = touchStats(events, playerName);

  return {
    passingAccuracy: passes.accuracy * 100,
    shots: shots.total,
    progressiveActions: passes.progressivePasses + touches.progressiveCarries,
    defensiveActions: defensive.pressures + defensive.interceptions + defensive.duelsWon,
    touches: touches.totalTouches,
    xg: shots.totalXg,
  };
}

function getAllPlayerNames(events) {
  const players = new Set();
  (events || []).forEach((event) => {
    const playerName = event?.player?.name || event?.player || '';
    if (playerName) {
      players.add(String(playerName).trim());
    }
  });
  return Array.from(players).filter(Boolean);
}

function getMetricMaxima(events, playerNames) {
  const snapshots = playerNames.map((playerName) => getPlayerMetricSnapshot(events, playerName));
  return METRICS.reduce((accumulator, metric) => {
    const values = snapshots.map((snapshot) => snapshot[metric.key]);
    const maxValue = values.length ? Math.max(...values) : 0;
    accumulator[metric.key] = maxValue || 1;
    return accumulator;
  }, {});
}

function buildNormalizedSnapshot(events, playerName, maxima) {
  const snapshot = getPlayerMetricSnapshot(events, playerName);
  return METRICS.reduce((accumulator, metric) => {
    const rawValue = snapshot[metric.key] || 0;
    const maxValue = maxima[metric.key] || 1;
    accumulator[metric.key] = maxValue > 0 ? Math.max(0, Math.min(100, (rawValue / maxValue) * 100)) : 0;
    return accumulator;
  }, {});
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  return element;
}

function buildPolygonPoints(values, center, radius) {
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / values.length;
    const x = center + Math.cos(angle) * radius * (value / 100);
    const y = center + Math.sin(angle) * radius * (value / 100);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return points.join(' ');
}

function createLegendItem(label, color) {
  const item = document.createElement('span');
  item.className = 'radar-chip';
  item.innerHTML = `<span class="radar-chip__swatch" style="background:${color}"></span>${label}`;
  return item;
}

export function mountRadar(container, { playerA, playerB, teamAColor, teamBColor, events = [] }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'radar-wrapper';

  const players = [playerA, playerB].filter(Boolean);
  const allPlayerNames = getAllPlayerNames(events);
  const maxima = getMetricMaxima(events, allPlayerNames);

  if (!players.length) {
    const empty = document.createElement('div');
    empty.className = 'radar-empty';
    empty.innerHTML = '<strong>No comparison selected</strong><span>Select a player from each side to compare their attacking and defensive footprint.</span>';
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return wrapper;
  }

  const legend = document.createElement('div');
  legend.className = 'radar-legend';
  if (playerA) {
    legend.appendChild(createLegendItem(playerA, teamAColor || '#60a5fa'));
  }
  if (playerB) {
    legend.appendChild(createLegendItem(playerB, teamBColor || '#f97316'));
  }
  wrapper.appendChild(legend);

  const chartShell = document.createElement('div');
  chartShell.className = 'radar-chart';
  const svg = createSvgElement('svg', {
    viewBox: '0 0 260 260',
    width: '100%',
    height: '100%',
    class: 'radar-svg',
    role: 'img',
    'aria-label': 'Player comparison radar chart',
  });

  const center = 130;
  const radius = 92;
  const ringLevels = [25, 50, 75, 100];
  ringLevels.forEach((level) => {
    const circle = createSvgElement('circle', {
      cx: center,
      cy: center,
      r: (radius * level) / 100,
      fill: 'none',
      stroke: 'rgba(255,255,255,0.13)',
      'stroke-width': '0.8',
    });
    svg.appendChild(circle);
  });

  METRICS.forEach((metric, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / METRICS.length;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const axis = createSvgElement('line', {
      x1: center,
      y1: center,
      x2: x,
      y2: y,
      stroke: 'rgba(255,255,255,0.2)',
      'stroke-width': '0.8',
    });
    svg.appendChild(axis);

    const label = createSvgElement('text', {
      x: center + Math.cos(angle) * (radius + 20),
      y: center + Math.sin(angle) * (radius + 20),
      fill: '#cbd5e1',
      'font-size': '10',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
    label.textContent = metric.label;
    svg.appendChild(label);
  });

  if (playerA) {
    const values = buildNormalizedSnapshot(events, playerA, maxima);
    const polygon = createSvgElement('polygon', {
      points: buildPolygonPoints(METRICS.map((metric) => values[metric.key]), center, radius),
      fill: teamAColor || '#60a5fa',
      'fill-opacity': '0.22',
      stroke: teamAColor || '#60a5fa',
      'stroke-width': '1.7',
    });
    svg.appendChild(polygon);
  }

  if (playerB) {
    const values = buildNormalizedSnapshot(events, playerB, maxima);
    const polygon = createSvgElement('polygon', {
      points: buildPolygonPoints(METRICS.map((metric) => values[metric.key]), center, radius),
      fill: teamBColor || '#f97316',
      'fill-opacity': '0.22',
      stroke: teamBColor || '#f97316',
      'stroke-width': '1.7',
    });
    svg.appendChild(polygon);
  }

  if (players.length === 1) {
    const prompt = createSvgElement('text', {
      x: center,
      y: center + radius + 42,
      fill: '#cbd5e1',
      'font-size': '11',
      'text-anchor': 'middle',
    });
    prompt.textContent = 'Select a player on the other side to compare.';
    svg.appendChild(prompt);
  }

  chartShell.appendChild(svg);
  wrapper.appendChild(chartShell);

  const table = document.createElement('div');
  table.className = 'radar-table';
  table.innerHTML = `
    <div class="radar-table__row radar-table__row--head">
      <span>Metric</span>
      <span>${playerA || 'Player A'}</span>
      <span>${playerB || 'Player B'}</span>
    </div>
  `;

  METRICS.forEach((metric) => {
    const row = document.createElement('div');
    row.className = 'radar-table__row';
    const left = document.createElement('span');
    left.textContent = metric.label;
    const middle = document.createElement('span');
    const right = document.createElement('span');
    middle.textContent = playerA ? metric.formatter(getPlayerMetricSnapshot(events, playerA)[metric.key]) : '—';
    right.textContent = playerB ? metric.formatter(getPlayerMetricSnapshot(events, playerB)[metric.key]) : '—';
    row.appendChild(left);
    row.appendChild(middle);
    row.appendChild(right);
    table.appendChild(row);
  });

  wrapper.appendChild(table);
  container.appendChild(wrapper);
  return wrapper;
}
