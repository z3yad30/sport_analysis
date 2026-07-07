import { createPitchSvg, drawPitch, toSvgXY } from '../pitch.js';
import { touchStats } from '../stats.js';

function getTouchEvents(events, playerName) {
  const normalizedName = typeof playerName === 'string' ? playerName.trim() : '';
  if (!normalizedName) {
    return [];
  }

  const touchedEventTypes = ['Pass', 'Shot', 'Carry', 'Ball Receipt*', 'Dribble', 'Pressure'];
  return (events || []).filter((event) => {
    const eventPlayer = event?.player?.name || event?.player || '';
    const eventType = event?.type?.name || '';
    return touchedEventTypes.includes(eventType) && String(eventPlayer).trim() === normalizedName;
  });
}

function getLocation(event) {
  const location = event?.location || [];
  if (Array.isArray(location) && location.length >= 2) {
    return [Number(location[0]), Number(location[1])];
  }
  return null;
}

function getPitchThird(x) {
  if (x < 40) return 'defensive';
  if (x < 80) return 'middle';
  return 'final';
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function isProgressiveCarry(event) {
  const endLocation = event?.carry?.end_location;
  if (!Array.isArray(endLocation) || endLocation.length < 2) {
    return false;
  }
  const [, y] = endLocation;
  return Number(endLocation[0]) > 90 && Number(y) > 20 && Number(y) < 60;
}

export function mountTouchmap(container, { player, teamColor, events = [], flipX = false }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'touchmap-wrapper';

  const touchEvents = getTouchEvents(events, player);
  const stats = touchStats(events, player);
  const totalTouches = touchEvents.length;
  const byThird = stats.touchesByThird || { defensive: 0, middle: 0, final: 0 };
  const totalThirdTouches = Object.values(byThird).reduce((sum, value) => sum + value, 0) || 1;

  const statRow = document.createElement('div');
  statRow.className = 'touchmap-stats';
  const chips = [
    ['Total Touches', totalTouches],
    ['Touches by third', `${formatPercent(byThird.defensive / totalThirdTouches)} / ${formatPercent(byThird.middle / totalThirdTouches)} / ${formatPercent(byThird.final / totalThirdTouches)}`],
    ['Progressive Carries', stats.progressiveCarries || 0],
    ['Total Carry Distance', `${Math.round(stats.totalCarryDistance || 0)}m`],
  ];
  chips.forEach(([label, value]) => {
    const chip = document.createElement('div');
    chip.className = 'touchmap-chip';
    chip.innerHTML = `<span class="touchmap-chip__label">${label}</span><strong class="touchmap-chip__value">${value}</strong>`;
    statRow.appendChild(chip);
  });
  wrapper.appendChild(statRow);

  const thirdBar = document.createElement('div');
  thirdBar.className = 'touchmap-thirdbar';
  const thirdLabels = [
    ['Def', byThird.defensive / totalThirdTouches],
    ['Mid', byThird.middle / totalThirdTouches],
    ['Fin', byThird.final / totalThirdTouches],
  ];
  thirdLabels.forEach(([label, ratio]) => {
    const item = document.createElement('div');
    item.className = `touchmap-thirdbar__item touchmap-thirdbar__item--${label.toLowerCase()}`;
    item.innerHTML = `<span class="touchmap-thirdbar__label">${label}</span><div class="touchmap-thirdbar__track"><span class="touchmap-thirdbar__fill" style="width:${Math.max(6, Math.round(ratio * 100))}%"></span></div><strong>${formatPercent(ratio)}</strong>`;
    thirdBar.appendChild(item);
  });
  wrapper.appendChild(thirdBar);

  if (!touchEvents.length) {
    const empty = document.createElement('div');
    empty.className = 'touchmap-empty';
    empty.textContent = 'No touch events recorded for this player';
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return wrapper;
  }

  const pitchShell = document.createElement('div');
  pitchShell.className = 'touchmap-pitch';
  const svg = createPitchSvg(pitchShell, { width: '100%', height: '100%' });
  drawPitch(svg, { pitchColor: '#163b2d', lineColor: '#f8fafc', lineOpacity: 0.8, lineWidth: 0.8 });

  const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(overlayGroup);

  const thirdBands = [
    { label: 'defensive', x: 2, width: 38, fill: 'rgba(248,250,252,0.04)' },
    { label: 'middle', x: 40, width: 40, fill: 'rgba(248,250,252,0.02)' },
    { label: 'final', x: 80, width: 38, fill: 'rgba(248,250,252,0.04)' },
  ];
  thirdBands.forEach((band) => {
    overlayGroup.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
    const rect = overlayGroup.lastChild;
    rect.setAttribute('x', band.x);
    rect.setAttribute('y', '2');
    rect.setAttribute('width', band.width);
    rect.setAttribute('height', '76');
    rect.setAttribute('fill', band.fill);
    rect.setAttribute('rx', '2');
  });

  touchEvents.forEach((event, index) => {
    const location = getLocation(event);
    if (!location) {
      return;
    }

    const point = toSvgXY(location[0], location[1], { flipX });
    const jitterX = ((index % 4) - 1.5) * 0.35;
    const jitterY = (((index / 4) % 3) - 1) * 0.3;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x + jitterX);
    circle.setAttribute('cy', point.y + jitterY);
    circle.setAttribute('r', event?.type?.name === 'Carry' ? 1.35 : 1.1);
    circle.setAttribute('fill', teamColor || '#38bdf8');
    circle.setAttribute('fill-opacity', '0.84');
    circle.setAttribute('stroke', 'rgba(248,250,252,0.32)');
    circle.setAttribute('stroke-width', '0.4');
    overlayGroup.appendChild(circle);
  });

  touchEvents.filter((event) => event?.type?.name === 'Carry').forEach((event) => {
    const start = getLocation(event);
    const endLocation = event?.carry?.end_location;
    if (!start || !Array.isArray(endLocation) || endLocation.length < 2) {
      return;
    }

    const startPoint = toSvgXY(start[0], start[1], { flipX });
    const endPoint = toSvgXY(Number(endLocation[0]), Number(endLocation[1]), { flipX });
    const progressive = isProgressiveCarry(event);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startPoint.x);
    line.setAttribute('y1', startPoint.y);
    line.setAttribute('x2', endPoint.x);
    line.setAttribute('y2', endPoint.y);
    line.setAttribute('stroke', progressive ? '#facc15' : teamColor || '#38bdf8');
    line.setAttribute('stroke-width', progressive ? '1.35' : '0.9');
    line.setAttribute('stroke-opacity', progressive ? '0.95' : '0.7');
    line.setAttribute('stroke-linecap', 'round');
    overlayGroup.appendChild(line);
  });

  wrapper.appendChild(pitchShell);
  container.appendChild(wrapper);
  return wrapper;
}
