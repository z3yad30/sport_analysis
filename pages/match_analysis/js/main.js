import { getMatchById, getPlayersByTeam, getTeams, normalizeEvents } from './data.js';
import { getState, resetState, setState, subscribe } from './state.js';
import { runSanityChecks, summarizeTeamStats } from './stats.js';
import { createPlayerSelector } from './components/playerSelector.js';
import { mountHeatmap } from './visuals/heatmap.js';
import { mountShotmap } from './visuals/shotmap.js';
import { mountPassmap } from './visuals/passmap.js';
import { mountDeliverymap } from './visuals/deliverymap.js';

function getMatchIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('matchId');
}

function resolveMatchId() {
  return getMatchIdFromQuery() || window.sessionStorage.getItem('activeMatchId');
}

function renderShell(match, teams, events, rawEvents = [], stateSnapshot = getState()) {
  const titleEl = document.getElementById('match-title');
  const scorelineEl = document.getElementById('scoreline');
  const competitionEl = document.getElementById('match-competition');
  const dateEl = document.getElementById('match-date');
  const emptyStateEl = document.getElementById('analysis-empty-state');
  const shellEl = document.getElementById('analysis-shell');
  const teamANameEl = document.getElementById('team-a-name');
  const teamBNameEl = document.getElementById('team-b-name');
  const tabStripEl = document.getElementById('tab-strip');
  const visualTitleEl = document.getElementById('active-visual-title');
  const visualPlaceholderTitleEl = document.getElementById('visual-placeholder-title');
  const visualPlaceholderCopyEl = document.getElementById('visual-placeholder-copy');
  const teamASelectorEl = document.getElementById('team-a-selector');
  const teamBSelectorEl = document.getElementById('team-b-selector');

  if (!match) {
    emptyStateEl.hidden = false;
    shellEl.hidden = true;
    emptyStateEl.innerHTML = '<div><h2>Match not found</h2><p>Go back to the matches page and select another fixture.</p></div>';
    return;
  }

  emptyStateEl.hidden = true;
  shellEl.hidden = false;

  titleEl.textContent = `${match.home_team || 'Home'} vs ${match.away_team || 'Away'}`;
  teamANameEl.textContent = teams[0] || 'Team A';
  teamBNameEl.textContent = teams[1] || 'Team B';
  scorelineEl.innerHTML = `
    <span class="scoreline__team scoreline__team--a">${teams[0] || 'Team A'}</span>
    <span class="scoreline__divider">${match.home_score ?? 0} - ${match.away_score ?? 0}</span>
    <span class="scoreline__team scoreline__team--b">${teams[1] || 'Team B'}</span>
  `;
  competitionEl.textContent = match.competition || match.competition_name || 'Competition';
  dateEl.textContent = match.date || match.match_date || 'Date unavailable';

  if (!stateSnapshot.match) {
    setState({ match, events, teams });
  }

  const tabs = ['Heatmap', 'Shot Map', 'Pass Map', 'Delivery Map', 'Defensive Actions', 'Touch Map', 'Radar Compare'];
  const accentA = '#60a5fa';
  const accentB = '#f97316';
  const playersA = getPlayersByTeam(events, teams[0] || '').map((name) => ({ name, jerseyNumber: null }));
  const playersB = getPlayersByTeam(events, teams[1] || '').map((name) => ({ name, jerseyNumber: null }));

  tabStripEl.innerHTML = '';
  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab${stateSnapshot.activeTab === tab ? ' is-active' : ''}`;
    button.textContent = tab;
    button.addEventListener('click', () => {
      setState({ activeTab: tab });
      renderShell(match, teams, events, rawEvents);
    });
    tabStripEl.appendChild(button);
  });

  visualTitleEl.textContent = stateSnapshot.activeTab || 'Heatmap';
  visualPlaceholderTitleEl.textContent = stateSnapshot.activeTab === 'Heatmap'
    ? 'Heatmap'
    : stateSnapshot.activeTab === 'Shot Map'
      ? 'Shot Map'
      : stateSnapshot.activeTab === 'Pass Map'
        ? 'Pass Map'
        : stateSnapshot.activeTab === 'Delivery Map'
          ? 'Delivery Map'
          : 'Visual shell ready';
  visualPlaceholderCopyEl.textContent = stateSnapshot.selectedPlayerA || stateSnapshot.selectedPlayerB
    ? `Active tab: ${stateSnapshot.activeTab}. A: ${stateSnapshot.selectedPlayerA || 'None'} • B: ${stateSnapshot.selectedPlayerB || 'None'}`
    : `Active tab: ${stateSnapshot.activeTab}. Select a player from each side to begin exploring the match story.`;

  const visualHost = document.getElementById('visual-placeholder');
  if (visualHost) {
    const isSpecialVisual = stateSnapshot.activeTab === 'Heatmap' || stateSnapshot.activeTab === 'Shot Map' || stateSnapshot.activeTab === 'Pass Map' || stateSnapshot.activeTab === 'Delivery Map';
    visualHost.classList.toggle('visual-placeholder--active', isSpecialVisual);
    visualPlaceholderTitleEl.hidden = isSpecialVisual;
    visualPlaceholderCopyEl.hidden = isSpecialVisual;

    let visualRoot = document.getElementById('visual-root');
    if (!visualRoot) {
      visualRoot = document.createElement('div');
      visualRoot.id = 'visual-root';
      visualHost.appendChild(visualRoot);
    }

    if (stateSnapshot.activeTab === 'Heatmap') {
      mountHeatmap(visualRoot, {
        playerA: stateSnapshot.selectedPlayerA,
        playerB: stateSnapshot.selectedPlayerB,
        teamAColor: accentA,
        teamBColor: accentB,
        events,
      });
    } else if (stateSnapshot.activeTab === 'Shot Map') {
      const activePlayer = stateSnapshot.selectedPlayerA || stateSnapshot.selectedPlayerB || null;
      const activeTeamName = stateSnapshot.selectedPlayerA ? teams[0] : stateSnapshot.selectedPlayerB ? teams[1] : null;
      mountShotmap(visualRoot, {
        player: activePlayer,
        teamColor: activeTeamName === teams[0] ? accentA : accentB,
        events: rawEvents,
        flipX: activeTeamName === teams[1],
      });
    } else if (stateSnapshot.activeTab === 'Pass Map') {
      const activePlayer = stateSnapshot.selectedPlayerA || stateSnapshot.selectedPlayerB || null;
      const activeTeamName = stateSnapshot.selectedPlayerA ? teams[0] : stateSnapshot.selectedPlayerB ? teams[1] : null;
      mountPassmap(visualRoot, {
        player: activePlayer,
        teamColor: activeTeamName === teams[0] ? accentA : accentB,
        events: rawEvents,
        flipX: activeTeamName === teams[1],
      });
    } else if (stateSnapshot.activeTab === 'Delivery Map') {
      const activePlayer = stateSnapshot.selectedPlayerA || stateSnapshot.selectedPlayerB || null;
      const activeTeamName = stateSnapshot.selectedPlayerA ? teams[0] : stateSnapshot.selectedPlayerB ? teams[1] : null;
      mountDeliverymap(visualRoot, {
        player: activePlayer,
        teamColor: activeTeamName === teams[0] ? accentA : accentB,
        events: rawEvents,
      });
    } else {
      visualRoot.remove();
      visualRoot = null;
    }

    if (!isSpecialVisual) {
      const rootToClear = document.getElementById('visual-root');
      if (rootToClear) {
        rootToClear.remove();
      }
    }
  }

  if (teamASelectorEl && teamBSelectorEl) {
    createPlayerSelector({
      teamName: teams[0] || 'Team A',
      players: playersA,
      accentColor: accentA,
      container: teamASelectorEl,
      selectedValue: stateSnapshot.selectedPlayerA,
      onSelect: (playerName) => {
        setState({ selectedPlayerA: playerName });
        renderShell(match, teams, events, rawEvents);
      },
    });

    createPlayerSelector({
      teamName: teams[1] || 'Team B',
      players: playersB,
      accentColor: accentB,
      container: teamBSelectorEl,
      selectedValue: stateSnapshot.selectedPlayerB,
      onSelect: (playerName) => {
        setState({ selectedPlayerB: playerName });
        renderShell(match, teams, events, rawEvents);
      },
    });
  }

  console.info('Resolved match:', match.id);
  console.info('Players - home team:', playersA.map((player) => player.name));
  console.info('Players - away team:', playersB.map((player) => player.name));
  console.info('Team summaries:', summarizeTeamStats(events, teams[0] || ''), summarizeTeamStats(events, teams[1] || ''));
}

function boot() {
  resetState();
  const matchId = resolveMatchId();

  if (!matchId) {
    renderShell(null, [], []);
    return;
  }

  const match = getMatchById(matchId);
  const rawEvents = Array.isArray(match?.events) ? match.events : Array.isArray(match?.raw_events) ? match.raw_events : [];
  const events = normalizeEvents(rawEvents);
  const teams = getTeams(events, match);

  if (match?.id === 'Argentina_vs_France') {
    runSanityChecks(events);
  }

  const context = { match, teams, events, rawEvents };
  subscribe(() => {
    renderShell(context.match, context.teams, context.events, context.rawEvents, getState());
  });

  renderShell(context.match, context.teams, context.events, rawEvents);
}

document.addEventListener('DOMContentLoaded', boot);
