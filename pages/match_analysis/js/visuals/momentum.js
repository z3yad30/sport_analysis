import { teamShotTimeline } from '../stats.js';

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  return element;
}

function getFullTime(shots) {
  const maxMinute = shots.reduce((maxValue, shot) => Math.max(maxValue, Number(shot.minute || 0)), 0);
  return Math.max(90, maxMinute + 1);
}

function buildCumulativeXg(shots, teamName, fullTime, maxBothXg) {
  const points = [[30, 115]]; // Start at minute 0, xG 0
  let running = 0;
  const relevantShots = shots.filter((shot) => shot.team === teamName);

  relevantShots.forEach((shot) => {
    running += Number(shot.xg) || 0;
    const ratio = fullTime > 0 ? shot.minute / fullTime : 0;
    const x = 30 + ratio * 440;
    const y = 115 - (running / maxBothXg) * 60;
    points.push([x, y]);
  });

  // End at fullTime, keeping the last running value
  const endX = 30 + 440;
  const endY = 115 - (running / maxBothXg) * 60;
  points.push([endX, endY]);

  return points;
}

export function mountMomentum(container, { events = [], teams = [], teamColors = {} }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';
  const wrapper = document.createElement('section');
  wrapper.className = 'momentum-shell';

  const heading = document.createElement('div');
  heading.className = 'momentum-shell__heading';
  heading.innerHTML = '<p class="panel__eyebrow">Match momentum</p><h3>Shot timeline & xG flow</h3>';
  wrapper.appendChild(heading);

  const shots = teamShotTimeline(events);
  if (!shots.length) {
    const empty = document.createElement('div');
    empty.className = 'momentum-empty';
    empty.textContent = 'No shot events recorded for this match';
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return wrapper;
  }

  const fullTime = getFullTime(shots);
  const svg = createSvgElement('svg', {
    viewBox: '0 0 500 130',
    class: 'momentum-svg',
    role: 'img',
    'aria-label': 'Match shot timeline',
  });

  // Draw 45' and 90' ticks/gridlines
  const htX = 30 + (45 / fullTime) * 440;
  const ftX = 30 + (90 / fullTime) * 440;

  // HT Gridline
  svg.appendChild(createSvgElement('line', {
    x1: htX.toFixed(2),
    y1: '15',
    x2: htX.toFixed(2),
    y2: '115',
    stroke: 'rgba(255, 255, 255, 0.12)',
    'stroke-width': '1',
    'stroke-dasharray': '3 3',
  }));

  // FT Gridline
  svg.appendChild(createSvgElement('line', {
    x1: ftX.toFixed(2),
    y1: '15',
    x2: ftX.toFixed(2),
    y2: '115',
    stroke: 'rgba(255, 255, 255, 0.12)',
    'stroke-width': '1',
    'stroke-dasharray': '3 3',
  }));

  // HT Label
  const htLabel = createSvgElement('text', {
    x: htX.toFixed(2),
    y: '12',
    fill: 'rgba(255, 255, 255, 0.4)',
    'font-size': '8',
    'text-anchor': 'middle',
    'font-family': 'sans-serif',
  });
  htLabel.textContent = '45\'';
  svg.appendChild(htLabel);

  // FT Label
  const ftLabel = createSvgElement('text', {
    x: ftX.toFixed(2),
    y: '12',
    fill: 'rgba(255, 255, 255, 0.4)',
    'font-size': '8',
    'text-anchor': 'middle',
    'font-family': 'sans-serif',
  });
  ftLabel.textContent = '90\'';
  svg.appendChild(ftLabel);

  // Subtle baseline at 0
  const baseline = createSvgElement('line', {
    x1: '30',
    y1: '115',
    x2: '470',
    y2: '115',
    stroke: 'rgba(255, 255, 255, 0.15)',
    'stroke-width': '1',
  });
  svg.appendChild(baseline);

  const track = createSvgElement('rect', {
    x: '30',
    y: '34',
    width: '440',
    height: '2',
    rx: '1',
    fill: 'rgba(255,255,255,0.16)',
  });
  svg.appendChild(track);

  const teamNames = teams.filter(Boolean);
  const colors = {
    [teamNames[0] || 'Team A']: teamColors[teamNames[0]] || '#60a5fa',
    [teamNames[1] || 'Team B']: teamColors[teamNames[1]] || '#f97316',
  };

  // Compute max xG across both teams to scale uniformly
  const teamTotals = {};
  teamNames.forEach((teamName) => {
    const relevantShots = shots.filter((shot) => shot.team === teamName);
    teamTotals[teamName] = relevantShots.reduce((sum, shot) => sum + (Number(shot.xg) || 0), 0);
  });
  const maxBothXg = Math.max(1.0, ...Object.values(teamTotals));

  const xgPaths = teamNames.map((teamName) => {
    const points = buildCumulativeXg(shots, teamName, fullTime, maxBothXg);
    const path = createSvgElement('polyline', {
      points: points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
      fill: 'none',
      stroke: colors[teamName],
      'stroke-width': '1.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: '0.85',
    });
    svg.appendChild(path);
    return path;
  });

  // Position and stack markers
  const sortedShots = [...shots].sort((a, b) => a.minute - b.minute);
  const placed = [];

  sortedShots.forEach((shot) => {
    const ratio = fullTime > 0 ? shot.minute / fullTime : 0;
    const x = 30 + ratio * 440;

    // Stacking algorithm: check markers close in x (within ~2.5 minutes, approx 12 units)
    const closeMarkers = placed.filter((p) => Math.abs(p.x - x) < 12);

    let y = 35;
    let level = 0;
    const step = 9; // vertical spacing
    while (true) {
      const currentY = 35 + (level % 2 === 0 ? -1 : 1) * Math.ceil(level / 2) * step;
      const isOccupied = closeMarkers.some((p) => Math.abs(p.y - currentY) < step - 2);
      if (!isOccupied) {
        y = currentY;
        break;
      }
      level++;
    }

    const marker = createSvgElement('circle', {
      cx: x.toFixed(2),
      cy: y.toFixed(2),
      r: shot.isGoal ? '6.5' : '4.0',
      fill: shot.isGoal ? (colors[shot.team] || '#f8fafc') : 'none',
      stroke: colors[shot.team] || '#f8fafc',
      'stroke-width': shot.isGoal ? '2.0' : '1.5',
      cursor: 'pointer',
    });

    const title = createSvgElement('title');
    title.textContent = `${shot.player || 'Player'} • ${shot.minute}'${shot.isGoal ? ' • Goal' : ''} (${shot.xg ? shot.xg.toFixed(2) : '0.00'} xG)`;
    marker.appendChild(title);
    svg.appendChild(marker);

    placed.push({ x, y, shot });
  });

  wrapper.appendChild(svg);

  const labels = document.createElement('div');
  labels.className = 'momentum-legend';
  teamNames.forEach((teamName) => {
    const item = document.createElement('span');
    item.className = 'momentum-legend__item';
    item.innerHTML = `<span class="momentum-legend__swatch" style="background:${colors[teamName]}"></span>${teamName}`;
    labels.appendChild(item);
  });
  wrapper.appendChild(labels);

  container.appendChild(wrapper);
  return wrapper;
}
