import { createPitchSvg, drawPitch, toSvgXY } from '../pitch.js';
import { shotStats } from '../stats.js';

function getShotEvents(events, playerName) {
  const normalizedName = typeof playerName === 'string' ? playerName.trim() : '';
  if (!normalizedName) {
    return [];
  }

  return (events || []).filter((event) => {
    const eventPlayer = event?.player?.name || event?.player || '';
    return event?.type?.name === 'Shot' && String(eventPlayer).trim() === normalizedName;
  });
}

function getShotLocation(event) {
  const rawLocation = event?.location || event?.shot?.location || null;
  if (Array.isArray(rawLocation) && rawLocation.length >= 2) {
    return [Number(rawLocation[0]), Number(rawLocation[1])];
  }
  return null;
}

function getShotOutcome(event) {
  return event?.shot?.outcome?.name || 'Unknown';
}

function getBodyPart(event) {
  return event?.shot?.body_part?.name || 'Unknown';
}

function getXg(event) {
  const value = Number(event?.shot?.statsbomb_xg);
  return Number.isFinite(value) ? value : 0;
}

function formatXg(value) {
  return value.toFixed(2);
}

function createTooltip(container) {
  const tooltip = document.createElement('div');
  tooltip.className = 'shotmap-tooltip';
  tooltip.hidden = true;
  container.appendChild(tooltip);
  return tooltip;
}

export function mountShotmap(container, { player, teamColor, events = [], flipX = false }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'shotmap-wrapper';

  const stats = shotStats(events, player);
  const shots = getShotEvents(events, player);

  const statRow = document.createElement('div');
  statRow.className = 'shotmap-stats';
  const chips = [
    ['Shots', stats.total],
    ['Goals', stats.goals],
    ['Total xG', formatXg(stats.totalXg)],
    ['Shot Accuracy%', `${stats.accuracy.toFixed(0)}%`],
  ];
  chips.forEach(([label, value]) => {
    const chip = document.createElement('div');
    chip.className = 'shotmap-chip';
    chip.innerHTML = `<span class="shotmap-chip__label">${label}</span><strong class="shotmap-chip__value">${value}</strong>`;
    statRow.appendChild(chip);
  });
  wrapper.appendChild(statRow);

  if (!shots.length) {
    const empty = document.createElement('div');
    empty.className = 'shotmap-empty';
    empty.textContent = 'No shots recorded for this player';
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return wrapper;
  }

  const pitchShell = document.createElement('div');
  pitchShell.className = 'shotmap-pitch';
  const svg = createPitchSvg(pitchShell, { width: '100%', height: '100%' });
  drawPitch(svg, { pitchColor: '#163b2d', lineColor: '#f8fafc', lineOpacity: 0.8, lineWidth: 0.8 });

  const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(overlayGroup);

  const tooltip = createTooltip(wrapper);
  const maxXg = Math.max(...shots.map(getXg), 0.1);
  const accent = teamColor || '#60a5fa';

  shots.forEach((shot) => {
    const location = getShotLocation(shot);
    if (!location) {
      return;
    }

    const point = toSvgXY(location[0], location[1], { flipX });
    const xg = getXg(shot);
    const isGoal = String(getShotOutcome(shot)).toLowerCase() === 'goal';
    const radius = isGoal ? 3.1 + (xg / maxXg) * 1.8 : 1.8 + (xg / maxXg) * 1.2;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', isGoal ? '#fbbf24' : accent);
    circle.setAttribute('fill-opacity', isGoal ? '0.95' : '0.72');
    circle.setAttribute('stroke', isGoal ? '#065f46' : '#f8fafc');
    circle.setAttribute('stroke-width', isGoal ? '0.8' : '0.45');
    circle.setAttribute('cursor', 'pointer');

    circle.addEventListener('mouseenter', (event) => {
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <strong>${Math.round(shot?.minute ?? 0)}'</strong>
        <span>xG ${formatXg(xg)}</span>
        <span>${getShotOutcome(shot)}</span>
        <span>${getBodyPart(shot)}</span>
      `;
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 8}px`;
      tooltip.style.top = `${event.clientY - rect.top + 8}px`;
    });

    circle.addEventListener('mousemove', (event) => {
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 8}px`;
      tooltip.style.top = `${event.clientY - rect.top + 8}px`;
    });

    circle.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });

    circle.addEventListener('click', (event) => {
      event.stopPropagation();
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <strong>${Math.round(shot?.minute ?? 0)}'</strong>
        <span>xG ${formatXg(xg)}</span>
        <span>${getShotOutcome(shot)}</span>
        <span>${getBodyPart(shot)}</span>
      `;
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 8}px`;
      tooltip.style.top = `${event.clientY - rect.top + 8}px`;
    });

    overlayGroup.appendChild(circle);
  });

  wrapper.appendChild(pitchShell);
  container.appendChild(wrapper);
  return wrapper;
}
