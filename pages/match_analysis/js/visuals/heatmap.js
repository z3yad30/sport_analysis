import { createPitchSvg, drawPitch, toSvgXY } from '../pitch.js';

function buildGrid(points, width = 120, height = 80, cols = 24, rows = 16) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  if (!points.length) {
    return grid;
  }

  const cellWidth = width / cols;
  const cellHeight = height / rows;

  points.forEach((point) => {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(point.x / cellWidth)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(point.y / cellHeight)));
    grid[row][col] += 1;
  });

  return grid;
}

function smoothGrid(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const smoothed = Array.from({ length: rows }, () => Array(cols).fill(0));
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
  ];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let total = 0;
      let weight = 0;
      for (let r = -1; r <= 1; r += 1) {
        for (let c = -1; c <= 1; c += 1) {
          const targetRow = row + r;
          const targetCol = col + c;
          if (targetRow < 0 || targetRow >= rows || targetCol < 0 || targetCol >= cols) {
            continue;
          }
          const value = grid[targetRow][targetCol];
          const kernelValue = kernel[r + 1][c + 1];
          total += value * kernelValue;
          weight += kernelValue;
        }
      }
      smoothed[row][col] = total / weight;
    }
  }

  return smoothed;
}

function createHeatmapCanvas(grid, width = 240, height = 160, accentColor = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const maxValue = Math.max(...grid.flat(), 1);
  const color = accentColor.startsWith('#') ? accentColor : '#ffffff';
  const rgb = hexToRgb(color) || { r: 255, g: 255, b: 255 };

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const srcRow = Math.min(grid.length - 1, Math.floor((row / height) * grid.length));
      const srcCol = Math.min(grid[0].length - 1, Math.floor((col / width) * grid[0].length));
      const density = grid[srcRow][srcCol] / maxValue;
      const index = (row * width + col) * 4;
      const alpha = Math.max(0.06, Math.min(0.82, density * 0.82));
      imageData.data[index] = rgb.r;
      imageData.data[index + 1] = rgb.g;
      imageData.data[index + 2] = rgb.b;
      imageData.data[index + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return null;
  }

  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function getPointsForPlayer(events, playerName, flip = false) {
  return (events || [])
    .filter((event) => event?.player === playerName)
    .map((event) => {
      const point = toSvgXY(event.x, event.y, { flip });
      return { x: point.x, y: point.y };
    });
}

export function mountHeatmap(container, { playerA, playerB, teamAColor, teamBColor, events = [] }) {
  if (!container) {
    return null;
  }

  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'heatmap-wrapper';

  const legend = document.createElement('div');
  legend.className = 'heatmap-legend';
  const legendItems = [];
  if (playerA) {
    legendItems.push(`<span class="heatmap-chip"><span class="heatmap-chip__swatch" style="background:${teamAColor || '#60a5fa'}"></span>${playerA}</span>`);
  }
  if (playerB) {
    legendItems.push(`<span class="heatmap-chip"><span class="heatmap-chip__swatch" style="background:${teamBColor || '#f97316'}"></span>${playerB}</span>`);
  }
  legend.innerHTML = legendItems.length ? legendItems.join('') : '<span class="heatmap-chip heatmap-chip--muted">Select a player from either side</span>';
  wrapper.appendChild(legend);

  const pitchShell = document.createElement('div');
  pitchShell.className = 'heatmap-pitch';
  const svg = createPitchSvg(pitchShell, { width: '100%', height: '100%' });
  drawPitch(svg, { pitchColor: '#163b2d', lineColor: '#f8fafc', lineOpacity: 0.8, lineWidth: 0.8 });

  const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(overlayGroup);

  if (playerA) {
    const pointsA = getPointsForPlayer(events, playerA, false);
    const gridA = smoothGrid(buildGrid(pointsA));
    const canvasA = createHeatmapCanvas(gridA, 240, 160, teamAColor || '#60a5fa');
    const imageA = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    imageA.setAttribute('href', canvasA.toDataURL('image/png'));
    imageA.setAttribute('x', '2');
    imageA.setAttribute('y', '2');
    imageA.setAttribute('width', '116');
    imageA.setAttribute('height', '76');
    imageA.setAttribute('preserveAspectRatio', 'none');
    imageA.setAttribute('opacity', '0.8');
    overlayGroup.appendChild(imageA);
  }

  if (playerB) {
    const pointsB = getPointsForPlayer(events, playerB, true);
    const gridB = smoothGrid(buildGrid(pointsB));
    const canvasB = createHeatmapCanvas(gridB, 240, 160, teamBColor || '#f97316');
    const imageB = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    imageB.setAttribute('href', canvasB.toDataURL('image/png'));
    imageB.setAttribute('x', '2');
    imageB.setAttribute('y', '2');
    imageB.setAttribute('width', '116');
    imageB.setAttribute('height', '76');
    imageB.setAttribute('preserveAspectRatio', 'none');
    imageB.setAttribute('opacity', '0.8');
    overlayGroup.appendChild(imageB);
  }

  if (!playerA && !playerB) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '60');
    text.setAttribute('y', '40');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#cbd5e1');
    text.setAttribute('font-size', '4.5');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.textContent = 'Select a player from either side';
    overlayGroup.appendChild(text);
  }

  wrapper.appendChild(pitchShell);
  container.appendChild(wrapper);
  return wrapper;
}
