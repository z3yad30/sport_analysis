let selectorId = 0;

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
  const listId = `player-selector-options-${selectorId++}`;

  function rerender() {
    root.innerHTML = '';
    const input = document.createElement('input');
    input.className = 'player-selector__input';
    input.type = 'search';
    input.setAttribute('list', listId);
    input.setAttribute('aria-label', `Search ${teamName || 'team'} players`);
    input.placeholder = 'Search players…';
    input.autocomplete = 'off';
    input.value = uniquePlayers.find((player) => player.name === state.selected)?.name || 'None';
    input.disabled = state.disabled;
    input.addEventListener('change', () => {
      const selectedOption = input.value === 'None'
        ? { name: '' }
        : uniquePlayers.find((player) => player.name === input.value);

      if (!selectedOption) {
        input.value = uniquePlayers.find((player) => player.name === state.selected)?.name || 'None';
        return;
      }

      const nextValue = selectedOption.name || null;
      state.selected = nextValue;
      onSelect?.(nextValue);
    });

    const options = document.createElement('datalist');
    options.id = listId;
    const noneOption = document.createElement('option');
    noneOption.value = 'None';
    options.appendChild(noneOption);
    uniquePlayers.forEach((player) => {
      const option = document.createElement('option');
      option.value = player.name;
      options.appendChild(option);
    });

    root.append(input, options);
  }

  rerender();
  container.innerHTML = '';
  container.appendChild(root);

  return {
    setDisabled(value) {
      state.disabled = Boolean(value);
      root.classList.toggle('is-disabled', state.disabled);
      root.querySelector('.player-selector__input').disabled = state.disabled;
    },
    getSelected() {
      return state.selected;
    },
    setSelected(value) {
      state.selected = value ?? null;
      const input = root.querySelector('.player-selector__input');
      input.value = uniquePlayers.find((player) => player.name === state.selected)?.name || 'None';
    },
  };
}
