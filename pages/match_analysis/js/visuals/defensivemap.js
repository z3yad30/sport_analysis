import { createPitchSvg, drawPitch, toSvgXY } from '../pitch.js';
import { defensiveStats } from '../stats.js';
import { outcomeColors } from '../theme.js';

const EVENT_TYPES = {
  Pressure: { label: 'Pressure', shape: 'circle' },
  Interception: { label: 'Interception', shape: 'diamond' },
  Duel: { label: 'Duel', shape: 'triangle' },
  Block: { label: 'Block', shape: 'square' },
  Clearance: { label: 'Clearance', shape: 'hexagon' },
  'Ball Recovery': { label: 'Recovery', shape: 'star' },
  'Foul Committed': { label: 'Foul', shape: 'cross' },
  Tackle: { label: 'Tackle', shape: 'tackle' },
};

function getDefensiveEvents(events, playerName) {
  const normalizedName = typeof playerName === 'string' ? playerName.trim() : '';
  if (!normalizedName) {
    return [];
  }

  return (events || []).filter((event) => {
    const eventPlayer = event?.player?.name || event?.player || '';
    const eventType = event?.type?.name || '';
    return Boolean(eventType) && String(eventPlayer).trim() === normalizedName && Boolean(EVENT_TYPES[eventType]);
  });
}

function getLocation(event) {
  const location = event?.location || [];
  if (Array.isArray(location) && location.length >= 2) {
    return [Number(location[0]), Number(location[1])];
  }
  return null;
}

function getOutcome(event) {
  const outcomeName = String(event?.duel?.outcome?.name || '').trim().toLowerCase();
  return outcomeName === 'won' ? 'won' : outcomeName === 'lost' ? 'lost' : 'neutral';
}

function isDuelWon(event) {
  return getOutcome(event) === 'won';
}

function createShape(group, event, { accent, fill }) {
  const eventType = event?.type?.name || '';
  const config = EVENT_TYPES[eventType] || EVENT_TYPES.Pressure;
  const centerX = 0;
  const centerY = 0;

  const createElement = (tagName, attributes = {}) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
    return element;
  };

  const marker = createElement('g', { 'data-event-type': config.label });
  const color = eventType === 'Duel' ? (isDuelWon(event) ? outcomeColors.accurate : outcomeColors.inaccurate) : accent;
  const strokeColor = eventType === 'Duel' ? color : accent;
  const fillColor = eventType === 'Duel' ? color : fill;

  switch (config.shape) {
    case 'diamond':
      marker.appendChild(createElement('polygon', {
        points: `${centerX},${centerY - 1.6} ${centerX + 1.6},${centerY} ${centerX},${centerY + 1.6} ${centerX - 1.6},${centerY}`,
        fill: fillColor,
        stroke: strokeColor,
        'stroke-width': '0.7',
      }));
      break;
    case 'triangle':
      marker.appendChild(createElement('polygon', {
        points: `${centerX},${centerY - 1.8} ${centerX + 1.7},${centerY + 1.6} ${centerX - 1.7},${centerY + 1.6}`,
        fill: fillColor,
        stroke: strokeColor,
        'stroke-width': '0.7',
      }));
      break;
    case 'square':
      marker.appendChild(createElement('rect', {
        x: centerX - 1.4,
        y: centerY - 1.4,
        width: 2.8,
        height: 2.8,
        rx: 0.35,
        fill: fillColor,
        stroke: strokeColor,
        'stroke-width': '0.7',
      }));
      break;
    case 'hexagon':
      marker.appendChild(createElement('polygon', {
        points: `${centerX - 1.5},${centerY} ${centerX - 1.0},${centerY - 1.3} ${centerX + 1.0},${centerY - 1.3} ${centerX + 1.5},${centerY} ${centerX + 1.0},${centerY + 1.3} ${centerX - 1.0},${centerY + 1.3}`,
        fill: fillColor,
        stroke: strokeColor,
        'stroke-width': '0.7',
      }));
      break;
    case 'star':
      marker.appendChild(createElement('path', {
        d: `M ${centerX} ${centerY - 1.7} L ${centerX + 0.5} ${centerY - 0.55} L ${centerX + 1.7} ${centerY - 0.55} L ${centerX + 0.75} ${centerY + 0.1} L ${centerX + 1.2} ${centerY + 1.55} L ${centerX} ${centerY + 0.75} L ${centerX - 1.2} ${centerY + 1.55} L ${centerX - 0.75} ${centerY + 0.1} L ${centerX - 1.7} ${centerY - 0.55} L ${centerX - 0.5} ${centerY - 0.55} Z`,
        fill: fillColor,
        stroke: strokeColor,
        'stroke-width': '0.6',
      }));
      break;
    case 'cross':
      marker.appendChild(createElement('line', { x1: centerX - 1.4, y1: centerY - 1.4, x2: centerX + 1.4, y2: centerY + 1.4, stroke: strokeColor, 'stroke-width': '0.8' }));
      marker.appendChild(createElement('line', { x1: centerX + 1.4, y1: centerY - 1.4, x2: centerX - 1.4, y2: centerY + 1.4, stroke: strokeColor, 'stroke-width': '0.8' }));
      break;
    case 'tackle':
      marker.appendChild(createElement('path', {
        d: `M ${centerX - 1.35} ${centerY - 1.25} L ${centerX + 1.25} ${centerY + 1.25} M ${centerX - 1.25} ${centerY + 1.25} L ${centerX + 1.35} ${centerY - 1.25}`,
        stroke: strokeColor,
        'stroke-width': '0.8',
        'stroke-linecap': 'round',
      }));
      marker.appendChild(createElement('circle', { cx: centerX, cy: centerY, r: 0.8, fill: fillColor, stroke: strokeColor, 'stroke-width': '0.6' }));
      break;
    default:
      marker.appendChild(createElement('circle', { cx: centerX, cy: centerY, r: 1.4, fill: fillColor, stroke: strokeColor, 'stroke-width': '0.7' }));
      break;
  }

  group.appendChild(marker);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function mountDefensivemap(container, { player, teamColor, events = [], flipX = false }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'defensivemap-wrapper';

  const defensiveEvents = getDefensiveEvents(events, player);
  const stats = defensiveStats(events, player);
  const duelCount = stats.duelsWon + stats.duelsLost;
  const duelWinPct = duelCount ? stats.duelsWon / duelCount : 0;

  const statRow = document.createElement('div');
  statRow.className = 'defensivemap-stats';
  const chips = [
    ['Pressures', stats.pressures],
    ['Interceptions', stats.interceptions],
    ['Tackles / Duels Won', stats.tackles + stats.duelsWon],
    ['Duels Won %', formatPercent(duelWinPct)],
    ['Recoveries', stats.ballRecoveries],
    ['Clearances', stats.clearances],
    ['Blocks', stats.blocks],
  ];

  chips.forEach(([label, value]) => {
    const chip = document.createElement('div');
    chip.className = 'defensivemap-chip';
    chip.innerHTML = `<span class="defensivemap-chip__label">${label}</span><strong class="defensivemap-chip__value">${value}</strong>`;
    statRow.appendChild(chip);
  });
  wrapper.appendChild(statRow);

  const legend = document.createElement('div');
  legend.className = 'defensivemap-legend';
  const legendItems = [
    ['Pressure', 'circle'],
    ['Interception', 'diamond'],
    ['Tackle / Duel', 'triangle'],
    ['Block', 'square'],
    ['Clearance', 'hexagon'],
    ['Recovery', 'star'],
    ['Foul', 'cross'],
  ];
  const legendMarkup = legendItems.map(([label, shape]) => {
    const sample = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sample.setAttribute('viewBox', '0 0 14 14');
    sample.setAttribute('width', '14');
    sample.setAttribute('height', '14');
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    sample.appendChild(group);
    const accent = teamColor || outcomeColors.accent;
    const fill = 'rgba(255,255,255,0.16)';
    switch (shape) {
      case 'diamond':
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'polygon')).setAttribute('points', '7,2 12,7 7,12 2,7');
        break;
      case 'triangle':
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'polygon')).setAttribute('points', '7,2 12,12 2,12');
        break;
      case 'square':
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'rect')).setAttribute('x', '3');
        group.lastChild.setAttribute('y', '3');
        group.lastChild.setAttribute('width', '8');
        group.lastChild.setAttribute('height', '8');
        break;
      case 'hexagon':
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'polygon')).setAttribute('points', '7,2 11,4 11,10 7,12 3,10 3,4');
        break;
      case 'star':
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path')).setAttribute('d', 'M7 2 L8 5 L11 5 L8.7 7 L9.6 10 L7 8.2 L4.4 10 L5.3 7 L3 5 L6 5 Z');
        break;
      case 'cross':
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'line')).setAttribute('x1', '3');
        group.lastChild.setAttribute('y1', '3');
        group.lastChild.setAttribute('x2', '11');
        group.lastChild.setAttribute('y2', '11');
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'line')).setAttribute('x1', '11');
        group.lastChild.setAttribute('y1', '3');
        group.lastChild.setAttribute('x2', '3');
        group.lastChild.setAttribute('y2', '11');
        break;
      default:
        group.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'circle')).setAttribute('cx', '7');
        group.lastChild.setAttribute('cy', '7');
        group.lastChild.setAttribute('r', '4');
        break;
    }
    Array.from(group.children).forEach((child) => {
      child.setAttribute('fill', fill);
      child.setAttribute('stroke', accent);
      child.setAttribute('stroke-width', '1');
    });
    const item = document.createElement('span');
    item.className = 'defensivemap-legend__item';
    item.appendChild(sample);
    item.appendChild(document.createTextNode(label));
    return item.outerHTML;
  }).join('');
  legend.innerHTML = legendMarkup;
  wrapper.appendChild(legend);

  if (!defensiveEvents.length) {
    const empty = document.createElement('div');
    empty.className = 'defensivemap-empty';
    empty.textContent = 'No defensive actions recorded for this player';
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return wrapper;
  }

  const pitchShell = document.createElement('div');
  pitchShell.className = 'defensivemap-pitch';
  const svg = createPitchSvg(pitchShell, { width: '100%', height: '100%' });
  drawPitch(svg, { pitchColor: '#163b2d', lineColor: '#f8fafc', lineOpacity: 0.8, lineWidth: 0.8 });

  const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(overlayGroup);

  defensiveEvents.forEach((event) => {
    const location = getLocation(event);
    if (!location) {
      return;
    }

    const point = toSvgXY(location[0], location[1], { flipX });
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('transform', `translate(${point.x} ${point.y})`);
    createShape(group, event, {
      accent: teamColor || outcomeColors.accent,
      fill: 'rgba(248,250,252,0.13)',
    });
    overlayGroup.appendChild(group);
  });

  wrapper.appendChild(pitchShell);
  container.appendChild(wrapper);
  return wrapper;
}
