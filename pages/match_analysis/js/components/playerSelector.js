export function createPlayerSelector({ teamName, players, accentColor, onSelect, container, selectedValue = null }) {
  if (!container) {
    return {
      setDisabled() {},
      getSelected() { return null; },
      setSelected() {},
    };
  }

  const state = {
    selected: selectedValue ?? null,
    disabled: false,
  };

  const normalizedPlayers = Array.isArray(players)
    ? players
        .map((player) => {
          if (!player) {
            return null;
          }
          if (typeof player === 'string') {
            return { name: player, jerseyNumber: null };
          }
          return {
            name: player.name || '',
            jerseyNumber: player.jerseyNumber ?? null,
          };
        })
        .filter((player) => player && player.name)
    : [];

  const uniquePlayers = [];
  const seen = new Set();
  normalizedPlayers.forEach((player) => {
    if (!seen.has(player.name)) {
      seen.add(player.name);
      uniquePlayers.push(player);
    }
  });

  const root = document.createElement('div');
  root.className = 'player-selector';
  root.style.setProperty('--selector-accent', accentColor || '#7dd3fc');

  function createOption(option) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'player-selector__option';
    button.dataset.playerName = option.name || '';

    if (state.selected === option.name) {
      button.classList.add('is-selected');
    }

    if (state.disabled) {
      button.disabled = true;
    }

    const label = document.createElement('span');
    label.className = 'player-selector__label';
    label.textContent = option.label || option.name;

    const meta = document.createElement('span');
    meta.className = 'player-selector__meta';
    meta.textContent = option.name ? (option.jerseyNumber ? `#${option.jerseyNumber}` : '—') : 'None';

    button.appendChild(label);
    button.appendChild(meta);
    button.addEventListener('click', () => {
      if (state.disabled) {
        return;
      }
      const nextValue = option.name || null;
      state.selected = nextValue;
      rerender();
      onSelect?.(nextValue);
    });

    return button;
  }

  function rerender() {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(createOption({ name: '', label: 'None', jerseyNumber: null }));

    uniquePlayers.forEach((player) => {
      fragment.appendChild(createOption({ name: player.name, label: player.name, jerseyNumber: player.jerseyNumber }));
    });

    root.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'player-selector__heading';
    heading.innerHTML = `<span>${teamName || 'Team'}</span><span>Single select</span>`;
    root.appendChild(heading);
    const list = document.createElement('div');
    list.className = 'player-selector__list';
    list.appendChild(fragment);
    root.appendChild(list);
  }

  rerender();
  container.innerHTML = '';
  container.appendChild(root);

  return {
    setDisabled(value) {
      state.disabled = Boolean(value);
      root.classList.toggle('is-disabled', state.disabled);
      const buttons = root.querySelectorAll('.player-selector__option');
      buttons.forEach((button) => {
        button.disabled = state.disabled;
      });
    },
    getSelected() {
      return state.selected;
    },
    setSelected(value) {
      state.selected = value ?? null;
      rerender();
    },
  };
}
