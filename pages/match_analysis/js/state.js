const state = {
  match: null,
  events: [],
  teams: [],
  selectedPlayerA: null,
  selectedPlayerB: null,
  activeTab: 'Heatmap',
  isLoading: false,
  selectionVersion: 0,
};

const listeners = new Set();

function publish() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

export function getState() {
  return {
    ...state,
    events: [...state.events],
    teams: [...state.teams],
  };
}

export function setState(patch) {
  Object.assign(state, patch);
  state.selectionVersion += 1;
  publish();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetState() {
  state.match = null;
  state.events = [];
  state.teams = [];
  state.selectedPlayerA = null;
  state.selectedPlayerB = null;
  state.activeTab = 'Heatmap';
  state.isLoading = false;
  state.selectionVersion = 0;
  publish();
}
