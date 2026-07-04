import { createPitchSvg, drawPitch, toSvgXY } from '../pitch.js';
import { passStats } from '../stats.js';

function getPassEvents(events, playerName) {
  const normalizedName = typeof playerName === 'string' ? playerName.trim() : '';
  if (!normalizedName) {
    return [];
  }

  return (events || []).filter((event) => {
    const eventPlayer = event?.player?.name || event?.player || '';
    return event?.type?.name === 'Pass' && String(eventPlayer).trim() === normalizedName;
  });
}

function getPassLocation(event) {
  const location = event?.location || null;
  if (Array.isArray(location) && location.length >= 2) {
    return [Number(location[0]), Number(location[1])];
  }
  return null;
}

function getPassEndLocation(event) {
  const endLocation = event?.pass?.end_location || null;
  if (Array.isArray(endLocation) && endLocation.length >= 2) {
    return [Number(endLocation[0]), Number(endLocation[1])];
  }
  return null;
}

function getPassOutcome(event) {
  const outcome = event?.pass?.outcome?.name || '';
  return outcome || 'Completed';
}

function isCompletedPass(event) {
  const outcome = (event?.pass?.outcome?.name || '').trim().toLowerCase();
  return !outcome || ['complete', 'completed', 'success', 'successful'].includes(outcome);
}

function getPassHeight(event) {
  return event?.pass?.height?.name || 'Unknown';
}

function getRecipientName(event) {
  return event?.pass?.recipient?.name || 'Unknown';
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function createTooltip(container) {
  const tooltip = document.createElement('div');
  tooltip.className = 'passmap-tooltip';
  tooltip.hidden = true;
  container.appendChild(tooltip);
  return tooltip;
}

function isHighValuePass(event) {
  const endLocation = getPassEndLocation(event);
  const isProgressive = Array.isArray(endLocation) && endLocation.length >= 2 && Number(endLocation[0]) > 90 && Number(endLocation[1]) > 20 && Number(endLocation[1]) < 60;
  const hasKeyMarker = Boolean(event?.pass?.cross) || Boolean(event?.pass?.type?.name);
  return isProgressive || hasKeyMarker;
}

export function mountPassmap(container, { player, teamColor, events = [], flipX = false, showOnlyKeyAndProgressive = false }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'passmap-wrapper';

  const stats = passStats(events, player);
  const passes = getPassEvents(events, player);
  const visiblePasses = showOnlyKeyAndProgressive ? passes.filter(isHighValuePass) : passes;

  const statRow = document.createElement('div');
  statRow.className = 'passmap-stats';
  const chips = [
    ['Passes', stats.total],
    ['Completion %', formatPercent(stats.accuracy)],
    ['Progressive Passes', stats.progressivePasses],
    ['Key Passes', stats.keyPasses],
  ];

  chips.forEach(([label, value]) => {
    const chip = document.createElement('div');
    chip.className = 'passmap-chip';
    chip.innerHTML = `<span class="passmap-chip__label">${label}</span><strong class="passmap-chip__value">${value}</strong>`;
    statRow.appendChild(chip);
  });
  wrapper.appendChild(statRow);

  const controls = document.createElement('div');
  controls.className = 'passmap-controls';
  if (passes.length >= 60) {
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'passmap-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = showOnlyKeyAndProgressive;
    input.addEventListener('change', () => {
      mountPassmap(container, { player, teamColor, events, flipX, showOnlyKeyAndProgressive: input.checked });
    });
    toggleLabel.appendChild(input);
    toggleLabel.appendChild(document.createTextNode(' Show only key / progressive passes'));
    controls.appendChild(toggleLabel);
  }
  wrapper.appendChild(controls);

  if (!passes.length) {
    const empty = document.createElement('div');
    empty.className = 'passmap-empty';
    empty.textContent = 'No passes recorded for this player';
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return wrapper;
  }

  const pitchShell = document.createElement('div');
  pitchShell.className = 'passmap-pitch';
  const svg = createPitchSvg(pitchShell, { width: '100%', height: '100%' });
  drawPitch(svg, { pitchColor: '#163b2d', lineColor: '#f8fafc', lineOpacity: 0.8, lineWidth: 0.8 });

  const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(overlayGroup);

  const tooltip = createTooltip(wrapper);
  const accent = teamColor || '#60a5fa';
  const incompleteColor = '#f59e0b';

  if (!visiblePasses.length) {
    const empty = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    empty.setAttribute('x', '60');
    empty.setAttribute('y', '40');
    empty.setAttribute('text-anchor', 'middle');
    empty.setAttribute('fill', '#cbd5e1');
    empty.setAttribute('font-size', '4.5');
    empty.setAttribute('font-family', 'Inter, sans-serif');
    empty.textContent = 'No key or progressive passes to show';
    overlayGroup.appendChild(empty);
  }

  visiblePasses.forEach((passEvent) => {
    const start = getPassLocation(passEvent);
    const end = getPassEndLocation(passEvent);
    if (!start || !end) {
      return;
    }

    const startPoint = toSvgXY(start[0], start[1], { flipX });
    const endPoint = toSvgXY(end[0], end[1], { flipX });
    const completed = isCompletedPass(passEvent);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startPoint.x);
    line.setAttribute('y1', startPoint.y);
    line.setAttribute('x2', endPoint.x);
    line.setAttribute('y2', endPoint.y);
    line.setAttribute('stroke', completed ? accent : incompleteColor);
    line.setAttribute('stroke-opacity', completed ? '0.9' : '0.86');
    line.setAttribute('stroke-width', completed ? '0.95' : '0.8');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('marker-end', 'url(#pass-arrowhead)');
    line.setAttribute('cursor', 'pointer');

    line.addEventListener('mouseenter', (event) => {
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <strong>${Math.round(passEvent?.minute ?? 0)}'</strong>
        <span>${getRecipientName(passEvent)}</span>
        <span>${getPassOutcome(passEvent)}</span>
        <span>${getPassHeight(passEvent)}</span>
      `;
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 8}px`;
      tooltip.style.top = `${event.clientY - rect.top + 8}px`;
    });

    line.addEventListener('mousemove', (event) => {
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 8}px`;
      tooltip.style.top = `${event.clientY - rect.top + 8}px`;
    });

    line.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });

    line.addEventListener('click', (event) => {
      event.stopPropagation();
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <strong>${Math.round(passEvent?.minute ?? 0)}'</strong>
        <span>${getRecipientName(passEvent)}</span>
        <span>${getPassOutcome(passEvent)}</span>
        <span>${getPassHeight(passEvent)}</span>
      `;
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 8}px`;
      tooltip.style.top = `${event.clientY - rect.top + 8}px`;
    });

    overlayGroup.appendChild(line);
  });

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'pass-arrowhead');
  marker.setAttribute('viewBox', '0 0 8 8');
  marker.setAttribute('refX', '6');
  marker.setAttribute('refY', '4');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto');
  const markerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  markerPath.setAttribute('d', 'M 0 0 L 8 4 L 0 8 z');
  markerPath.setAttribute('fill', accent);
  marker.appendChild(markerPath);
  defs.appendChild(marker);
  svg.insertBefore(defs, overlayGroup);

  wrapper.appendChild(pitchShell);
  container.appendChild(wrapper);
  return wrapper;
}
