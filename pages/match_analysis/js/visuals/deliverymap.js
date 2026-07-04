import { createPitchSvg, drawPitch, toSvgXY } from '../pitch.js';
import { outcomeColors } from '../theme.js';

function getDeliveryEvents(events, playerName) {
  const normalizedName = typeof playerName === 'string' ? playerName.trim() : '';
  if (!normalizedName) {
    return [];
  }

  return (events || []).filter((event) => {
    const eventPlayer = event?.player?.name || event?.player || '';
    return event?.type?.name === 'Pass' && String(eventPlayer).trim() === normalizedName;
  });
}

function getDeliveryLocation(event) {
  const location = event?.location || null;
  if (Array.isArray(location) && location.length >= 2) {
    return [Number(location[0]), Number(location[1])];
  }
  return null;
}

function isCross(event) {
  return Boolean(event?.pass?.cross);
}

function isThroughBall(event) {
  return String(event?.pass?.type?.name || '').toLowerCase() === 'through ball';
}

function getDeliveryType(event) {
  if (isCross(event)) {
    return 'cross';
  }
  if (isThroughBall(event)) {
    return 'through';
  }
  return null;
}

function isAccurate(event) {
  const outcomeName = String(event?.pass?.outcome?.name || '').trim().toLowerCase();
  return !outcomeName || outcomeName === 'complete' || outcomeName === 'completed' || outcomeName === 'successful';
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function mountDeliverymap(container, { player, teamColor, events = [] }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'deliverymap-wrapper';

  const deliveries = getDeliveryEvents(events, player).filter((event) => Boolean(getDeliveryType(event)));
  const stats = {
    total: deliveries.length,
    accuracy: deliveries.length ? deliveries.filter(isAccurate).length / deliveries.length : 0,
    crosses: deliveries.filter(isCross).length,
    throughBalls: deliveries.filter(isThroughBall).length,
  };

  const statRow = document.createElement('div');
  statRow.className = 'deliverymap-stats';
  const chips = [
    ['Total deliveries', stats.total],
    ['Accuracy %', formatPercent(stats.accuracy)],
    ['Crosses', stats.crosses],
    ['Through balls', stats.throughBalls],
  ];
  chips.forEach(([label, value]) => {
    const chip = document.createElement('div');
    chip.className = 'deliverymap-chip';
    chip.innerHTML = `<span class="deliverymap-chip__label">${label}</span><strong class="deliverymap-chip__value">${value}</strong>`;
    statRow.appendChild(chip);
  });
  wrapper.appendChild(statRow);

  const toggleRow = document.createElement('div');
  toggleRow.className = 'deliverymap-toggles';
  const modes = ['All', 'Crosses only', 'Through balls only'];
  let activeMode = 'All';
  const setMode = (mode) => {
    activeMode = mode;
    Array.from(toggleRow.querySelectorAll('button')).forEach((button) => {
      button.classList.toggle('is-active', button.dataset.mode === mode);
    });
    renderMode(mode);
  };

  const renderMode = (mode) => {
    const filtered = deliveries.filter((event) => {
      if (mode === 'Crosses only') {
        return isCross(event);
      }
      if (mode === 'Through balls only') {
        return isThroughBall(event);
      }
      return true;
    });

    renderDots(filtered);
  };

  modes.forEach((mode) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `deliverymap-toggle${mode === 'All' ? ' is-active' : ''}`;
    button.dataset.mode = mode;
    button.textContent = mode;
    button.addEventListener('click', () => setMode(mode));
    toggleRow.appendChild(button);
  });
  wrapper.appendChild(toggleRow);

  const legend = document.createElement('div');
  legend.className = 'deliverymap-legend';
  legend.innerHTML = `
    <span class="deliverymap-legend__item"><span class="deliverymap-legend__swatch deliverymap-legend__swatch--accurate"></span>Accurate delivery</span>
    <span class="deliverymap-legend__item"><span class="deliverymap-legend__swatch deliverymap-legend__swatch--inaccurate"></span>Inaccurate delivery</span>
  `;
  wrapper.appendChild(legend);

  if (!deliveries.length) {
    const empty = document.createElement('div');
    empty.className = 'deliverymap-empty';
    empty.textContent = 'No crosses or through balls recorded for this player';
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return wrapper;
  }

  const pitchShell = document.createElement('div');
  pitchShell.className = 'deliverymap-pitch';
  const svg = createPitchSvg(pitchShell, { width: '100%', height: '100%' });
  drawPitch(svg, { pitchColor: '#163b2d', lineColor: '#f8fafc', lineOpacity: 0.8, lineWidth: 0.8 });

  const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(overlayGroup);

  const renderDots = (eventsToRender) => {
    overlayGroup.innerHTML = '';
    if (!eventsToRender.length) {
      const empty = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      empty.setAttribute('x', '60');
      empty.setAttribute('y', '40');
      empty.setAttribute('text-anchor', 'middle');
      empty.setAttribute('fill', '#cbd5e1');
      empty.setAttribute('font-size', '4.5');
      empty.setAttribute('font-family', 'Inter, sans-serif');
      empty.textContent = 'No deliveries in this view';
      overlayGroup.appendChild(empty);
      return;
    }

    eventsToRender.forEach((event) => {
      const location = getDeliveryLocation(event);
      if (!location) {
        return;
      }

      const point = toSvgXY(location[0], location[1], { flipX: false });
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', 2.2);
      circle.setAttribute('fill', isAccurate(event) ? outcomeColors.accurate : outcomeColors.inaccurate);
      circle.setAttribute('stroke', teamColor || outcomeColors.accent);
      circle.setAttribute('stroke-width', '0.6');
      circle.setAttribute('cursor', 'pointer');
      overlayGroup.appendChild(circle);
    });
  };

  renderDots(deliveries);
  wrapper.appendChild(pitchShell);
  container.appendChild(wrapper);
  return wrapper;
}
