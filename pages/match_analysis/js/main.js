import { getMatchById, getPlayersByTeam, getTeams, normalizeEvents } from './data.js';
import { getState, resetState, setState, subscribe } from './state.js';
import { runSanityChecks, summarizeTeamStats } from './stats.js';
import { createPlayerSelector } from './components/playerSelector.js';
import { mountHeatmap } from './visuals/heatmap.js';
import { mountShotmap } from './visuals/shotmap.js';
import { mountPassmap } from './visuals/passmap.js';
import { mountDeliverymap } from './visuals/deliverymap.js';
import { mountDefensivemap } from './visuals/defensivemap.js';
import { mountRadar } from './visuals/radar.js';
import { mountTouchmap } from './visuals/touchmap.js';
import { mountMomentum } from './visuals/momentum.js';

function getMatchIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('matchId');
}

function resolveMatchId() {
  return getMatchIdFromQuery() || window.sessionStorage.getItem('activeMatchId');
}

function ensureVisualRoot(visualHost) {
  const previousRoot = visualHost.querySelector('#visual-root');
  if (previousRoot) {
    previousRoot.remove();
  }

  const visualRoot = document.createElement('div');
  visualRoot.id = 'visual-root';
  visualRoot.className = 'visual-root';
  visualHost.appendChild(visualRoot);
  return visualRoot;
}

function renderLoadingState(visualHost, visualPlaceholderTitleEl, visualPlaceholderCopyEl) {
  const visualRoot = ensureVisualRoot(visualHost);
  visualHost.classList.add('visual-placeholder--active');
  visualPlaceholderTitleEl.hidden = true;
  visualPlaceholderCopyEl.hidden = true;
  visualRoot.innerHTML = `
    <div class="visual-loading" role="status" aria-live="polite">
      <div class="visual-loading__spinner"></div>
      <div class="visual-loading__text">
        <strong>Preparing match story</strong>
        <span>Normalizing events…</span>
      </div>
    </div>
  `;
}

function renderPlayerVisualCard(container, { title, accentColor, content }) {
  const card = document.createElement('article');
  card.className = 'visual-card';
  card.innerHTML = `
    <div class="visual-card__header">
      <span class="visual-card__dot" style="background:${accentColor || '#60a5fa'}"></span>
      <h4>${title}</h4>
    </div>
    <div class="visual-card__body"></div>
  `;
  card.querySelector('.visual-card__body').appendChild(content);
  container.appendChild(card);
  return card;
}

function renderShell(match, teams, events, rawEvents = [], stateSnapshot = getState(), options = {}) {
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
    setState({ match, events, teams, isLoading: Boolean(stateSnapshot.isLoading || options.isLoading) });
    return renderShell(match, teams, events, rawEvents, getState(), options);
  }

  const activeTab = stateSnapshot.activeTab || 'Heatmap';
  const isLoading = Boolean(stateSnapshot.isLoading || options.isLoading);
  const tabs = ['Heatmap', 'Shot Map', 'Pass Map', 'Deliveries', 'Defensive Actions', 'Touch Map', 'Radar Compare'];
  const accentA = '#60a5fa';
  const accentB = '#f97316';
  const playersA = getPlayersByTeam(events, teams[0] || '').map((name) => ({ name, jerseyNumber: null }));
  const playersB = getPlayersByTeam(events, teams[1] || '').map((name) => ({ name, jerseyNumber: null }));

  const momentumHost = document.getElementById('momentum-shell');
  if (momentumHost) {
    mountMomentum(momentumHost, {
      events: rawEvents,
      teams,
      teamColors: { [teams[0] || 'Team A']: accentA, [teams[1] || 'Team B']: accentB },
    });
  }

  tabStripEl.innerHTML = '';
  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab${activeTab === tab ? ' is-active' : ''}`;
    button.textContent = tab;
    button.addEventListener('click', () => {
      setState({ activeTab: tab });
    });
    tabStripEl.appendChild(button);
  });

  visualTitleEl.textContent = activeTab;
  const visualHost = document.getElementById('visual-placeholder');
  if (visualHost) {
    visualHost.classList.remove('visual-placeholder--empty');
    visualHost.classList.add('visual-placeholder--active');
    visualPlaceholderTitleEl.hidden = true;
    visualPlaceholderCopyEl.hidden = true;

    if (isLoading) {
      renderLoadingState(visualHost, visualPlaceholderTitleEl, visualPlaceholderCopyEl);
    } else {
      const visualRoot = ensureVisualRoot(visualHost);
      const isRadarTab = activeTab === 'Radar Compare';
      const selectedPlayers = [
        stateSnapshot.selectedPlayerA ? { playerName: stateSnapshot.selectedPlayerA, teamName: teams[0] || 'Team A', accentColor: accentA } : null,
        stateSnapshot.selectedPlayerB ? { playerName: stateSnapshot.selectedPlayerB, teamName: teams[1] || 'Team B', accentColor: accentB } : null,
      ].filter(Boolean);

      if (isRadarTab) {
        mountRadar(visualRoot, {
          playerA: stateSnapshot.selectedPlayerA,
          playerB: stateSnapshot.selectedPlayerB,
          teamAColor: accentA,
          teamBColor: accentB,
          events: rawEvents,
        });
      } else if (!selectedPlayers.length) {
        visualRoot.innerHTML = '<div class="visual-empty">Select a player from either side to compare their match story.</div>';
      } else {
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'visual-cards-grid';
        visualRoot.appendChild(cardsGrid);

        selectedPlayers.forEach(({ playerName, teamName, accentColor }) => {
          const cardShell = document.createElement('div');
          cardShell.className = 'visual-card-shell';
          const cardTitle = `${playerName} • ${teamName}`;
          const body = document.createElement('div');
          body.className = 'visual-card-body';

          if (activeTab === 'Heatmap') {
            mountHeatmap(body, {
              playerA: playerName,
              playerB: null,
              teamAColor: accentColor,
              teamBColor: accentColor,
              events,
            });
          } else if (activeTab === 'Shot Map') {
            mountShotmap(body, {
              player: playerName,
              teamColor: accentColor,
              events: rawEvents,
              flipX: teamName === teams[1],
            });
          } else if (activeTab === 'Pass Map') {
            mountPassmap(body, {
              player: playerName,
              teamColor: accentColor,
              events: rawEvents,
              flipX: teamName === teams[1],
            });
          } else if (activeTab === 'Deliveries') {
            mountDeliverymap(body, {
              player: playerName,
              teamColor: accentColor,
              events: rawEvents,
            });
          } else if (activeTab === 'Defensive Actions') {
            mountDefensivemap(body, {
              player: playerName,
              teamColor: accentColor,
              events: rawEvents,
              flipX: teamName === teams[1],
            });
          } else if (activeTab === 'Touch Map') {
            mountTouchmap(body, {
              player: playerName,
              teamColor: accentColor,
              events: rawEvents,
              flipX: teamName === teams[1],
            });
          }

          renderPlayerVisualCard(cardsGrid, {
            title: cardTitle,
            accentColor,
            content: body,
          });
        });
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

  renderShell(context.match, context.teams, context.events, rawEvents, { ...getState(), isLoading: true });
  window.setTimeout(() => {
    setState({ isLoading: false });
  }, 140);
}

document.addEventListener('DOMContentLoaded', boot);
