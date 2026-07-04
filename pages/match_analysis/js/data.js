const STORAGE_CANDIDATES = ['matches', 'matchCollection', 'matchData'];

function parseStoredValue(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn('Unable to parse stored match data.', error);
    return null;
  }
}

export function readMatchesFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  for (const key of STORAGE_CANDIDATES) {
    const storedValue = window.localStorage.getItem(key);
    const parsedValue = parseStoredValue(storedValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue;
    }

    if (parsedValue && Array.isArray(parsedValue.matches)) {
      return parsedValue.matches;
    }
  }

  return [];
}

export function getMatchById(matchId) {
  if (!matchId) {
    return null;
  }

  const matches = readMatchesFromStorage();
  const match = matches.find((entry) => String(entry?.id) === String(matchId));

  if (match) {
    return match;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const singleMatchValue = window.localStorage.getItem(`match_${matchId}`);
    const parsedSingleMatch = parseStoredValue(singleMatchValue);
    if (parsedSingleMatch) {
      return parsedSingleMatch;
    }
  }

  return null;
}

export function normalizeEvents(rawEvents) {
  if (!Array.isArray(rawEvents)) {
    return [];
  }

  return rawEvents
    .map((event) => {
      const location = Array.isArray(event?.location) ? event.location : null;
      const hasValidLocation = Array.isArray(location) && location.length >= 2 && Number.isFinite(location[0]) && Number.isFinite(location[1]);

      if (!hasValidLocation) {
        return null;
      }

      const teamName = event?.team?.name || '';
      const playerName = event?.player?.name || '';
      const positionName = event?.position?.name || '';

      if (!teamName || !playerName) {
        return null;
      }

      return {
        type: event?.type?.name || '',
        team: teamName,
        player: playerName,
        position: positionName,
        x: Number(location[0]),
        y: Number(location[1]),
        minute: Number(event?.minute ?? 0),
        second: Number(event?.second ?? 0),
        period: event?.period ?? null,
        raw: event,
      };
    })
    .filter(Boolean);
}

export function getTeams(events, matchRecord = null) {
  const teamNames = [...new Set(events.map((event) => event?.team).filter(Boolean))];

  if (matchRecord?.home_team && matchRecord?.away_team) {
    const orderedTeams = [matchRecord.home_team, matchRecord.away_team].filter(Boolean);
    return orderedTeams.filter((team, index) => orderedTeams.indexOf(team) === index);
  }

  return teamNames;
}

export function getPlayersByTeam(events, teamName) {
  if (!teamName) {
    return [];
  }

  const players = events
    .filter((event) => event?.team === teamName && event?.player)
    .map((event) => event.player);

  return [...new Set(players)].sort((left, right) => left.localeCompare(right));
}
