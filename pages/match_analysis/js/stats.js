function normalizePlayerName(playerName) {
  return typeof playerName === 'string' ? playerName.trim() : '';
}

function getEventType(event) {
  return event?.type?.name || '';
}

function getEventPlayer(event) {
  return normalizePlayerName(event?.player?.name || event?.player || '');
}

function getEventTeam(event) {
  return event?.team?.name || event?.team || '';
}

function getLocation(event) {
  const location = event?.location;
  return Array.isArray(location) && location.length >= 2 ? [Number(location[0]), Number(location[1])] : null;
}

function getDistanceToGoal(x, y) {
  const goalX = 120;
  const goalY = 40;
  return Math.hypot(x - goalX, y - goalY);
}

function getPitchThird(x) {
  if (x < 40) return 'defensive';
  if (x < 80) return 'middle';
  return 'final';
}

export function getPlayerEvents(events, playerName) {
  const normalizedName = normalizePlayerName(playerName);
  if (!normalizedName) {
    return [];
  }
  return (events || []).filter((event) => getEventPlayer(event) === normalizedName);
}

export function passStats(events, playerName) {
  const playerEvents = getPlayerEvents(events, playerName);
  const passes = playerEvents.filter((event) => getEventType(event) === 'Pass');
  const completed = passes.filter((event) => {
    const outcomeName = event?.pass?.outcome?.name || '';
    return !outcomeName || outcomeName.toLowerCase() !== 'incomplete';
  });
  const progressive = passes.filter((event) => {
    const endLocation = event?.pass?.end_location;
    if (!Array.isArray(endLocation) || endLocation.length < 2) {
      return false;
    }
    const [, y] = endLocation;
    return Number(endLocation[0]) > 90 && Number(y) > 20 && Number(y) < 60;
  });
  const keyPasses = passes.filter((event) => Boolean(event?.pass?.cross) || Boolean(event?.pass?.type?.name));
  const crossesAttempted = passes.filter((event) => Boolean(event?.pass?.cross));
  const crossesAccurate = crossesAttempted.filter((event) => {
    const outcomeName = event?.pass?.outcome?.name || '';
    return !outcomeName || outcomeName.toLowerCase() !== 'incomplete';
  });

  return {
    total: passes.length,
    completed: completed.length,
    accuracy: passes.length ? completed.length / passes.length : 0,
    progressivePasses: progressive.length,
    keyPasses: keyPasses.length,
    crossesAttempted: crossesAttempted.length,
    crossesAccurate: crossesAccurate.length,
  };
}

export function shotStats(events, playerName) {
  const playerEvents = getPlayerEvents(events, playerName);
  const shots = playerEvents.filter((event) => getEventType(event) === 'Shot');
  const goals = shots.filter((event) => (event?.shot?.outcome?.name || '').toLowerCase() === 'goal');
  const xgSum = shots.reduce((sum, event) => sum + (Number(event?.shot?.statsbomb_xg) || 0), 0);
  const onTarget = shots.filter((event) => {
    const outcome = (event?.shot?.outcome?.name || '').toLowerCase();
    return outcome === 'goal' || outcome === 'saved' || outcome === 'post' || outcome === 'blocked';
  });
  const distances = shots
    .map((event) => {
      const location = getLocation(event);
      if (!location) {
        return null;
      }
      return getDistanceToGoal(location[0], location[1]);
    })
    .filter((distance) => typeof distance === 'number');
  const avgDistance = distances.length ? distances.reduce((sum, value) => sum + value, 0) / distances.length : 0;

  return {
    total: shots.length,
    goals: goals.length,
    totalXg: xgSum,
    shotsOnTarget: onTarget.length,
    avgShotDistance: avgDistance,
    accuracy: shots.length ? (goals.length / shots.length) * 100 : 0,
  };
}

export function defensiveStats(events, playerName) {
  const playerEvents = getPlayerEvents(events, playerName);
  const pressures = playerEvents.filter((event) => getEventType(event) === 'Pressure').length;
  const interceptions = playerEvents.filter((event) => getEventType(event) === 'Interception').length;
  const tackles = playerEvents.filter((event) => getEventType(event) === 'Tackle').length;
  const duels = playerEvents.filter((event) => getEventType(event) === 'Duel');
  const duelsWon = duels.filter((event) => (event?.duel?.outcome?.name || '').toLowerCase() === 'won').length;
  const duelsLost = duels.filter((event) => (event?.duel?.outcome?.name || '').toLowerCase() === 'lost').length;
  const blocks = playerEvents.filter((event) => getEventType(event) === 'Block').length;
  const clearances = playerEvents.filter((event) => getEventType(event) === 'Clearance').length;
  const recoveries = playerEvents.filter((event) => getEventType(event) === 'Ball Recovery').length;

  return {
    pressures,
    interceptions,
    tackles,
    duelsWon,
    duelsLost,
    blocks,
    clearances,
    ballRecoveries: recoveries,
  };
}

export function touchStats(events, playerName) {
  const playerEvents = getPlayerEvents(events, playerName);
  const touches = playerEvents.filter((event) => getEventType(event) === 'Pass' || getEventType(event) === 'Shot' || getEventType(event) === 'Carry' || getEventType(event) === 'Ball Receipt*' || getEventType(event) === 'Dribble' || getEventType(event) === 'Pressure');
  const byThird = { defensive: 0, middle: 0, final: 0 };
  touches.forEach((event) => {
    const location = getLocation(event);
    if (!location) {
      return;
    }
    const third = getPitchThird(location[0]);
    byThird[third] += 1;
  });
  const carries = playerEvents.filter((event) => getEventType(event) === 'Carry');
  const carryDistance = carries.reduce((sum, event) => {
    const location = getLocation(event);
    if (!location) {
      return sum;
    }
    return sum + Math.hypot(location[0] - (event?.carry?.end_location?.[0] || location[0]), location[1] - (event?.carry?.end_location?.[1] || location[1]));
  }, 0);

  return {
    totalTouches: touches.length,
    touchesByThird: byThird,
    carries: carries.length,
    progressiveCarryDistance: carryDistance,
  };
}

export function teamShotTimeline(events) {
  const chronological = (events || [])
    .filter((event) => getEventType(event) === 'Shot')
    .map((event) => ({
      minute: Number(event?.minute ?? 0),
      team: getEventTeam(event),
      xg: Number(event?.shot?.statsbomb_xg) || 0,
      isGoal: (event?.shot?.outcome?.name || '').toLowerCase() === 'goal',
    }))
    .sort((left, right) => left.minute - right.minute);
  return chronological;
}

export function summarizeTeamStats(events, teamName) {
  if (!teamName) {
    return null;
  }

  const teamEvents = events.filter((event) => event?.team === teamName);
  return {
    team: teamName,
    eventCount: teamEvents.length,
    players: [...new Set(teamEvents.map((event) => event?.player).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
  };
}

export function runSanityChecks(events) {
  if (!Array.isArray(events) || !events.length || typeof console === 'undefined') {
    return;
  }

  const messiShots = shotStats(events, 'Lionel Andrés Messi Cuccittini').total;
  const mbappeShots = shotStats(events, 'Kylian Mbappé Lottin').total;
  console.assert(messiShots >= 1, 'Messi should have recorded at least one shot in the sample match.');
  console.assert(mbappeShots >= 1, 'Mbappé should have recorded at least one shot in the sample match.');
}
