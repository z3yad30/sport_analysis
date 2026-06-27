import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MATCHES_DIR = BASE_DIR / "matches_data"
CACHE_DIR = Path(__file__).resolve().parent
CACHE_VERSION = 4
OTHER_DATA_PATH = BASE_DIR / "other" / "106.json"
GROUPS_CACHE_PATH = CACHE_DIR / "group_standings.json"


def safe_load_json(path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def safe_write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False)


def clean_team_label(text):
    if not text:
        return ""
    return text.replace("_", " ").strip()


def normalize_text(text):
    return text.strip().lower().replace("_", " ") if isinstance(text, str) else ""


def collect_player_name(player, players_set):
    if isinstance(player, dict):
        name = player.get("name")
        if isinstance(name, str) and name.strip():
            players_set.add(name.strip())


def collect_team_name(team, teams_set):
    if isinstance(team, dict):
        name = team.get("name")
        if isinstance(name, str) and name.strip():
            teams_set.add(name.strip())


def parse_match_teams(stem):
    if "_vs_" in stem:
        home, away = stem.split("_vs_", 1)
        return clean_team_label(home), clean_team_label(away)
    return clean_team_label(stem), ""


def event_is_goal(event):
    if not isinstance(event, dict):
        return False
    event_type = event.get("type", {})
    if isinstance(event_type, dict):
        type_name = event_type.get("name", "")
        if type_name == "Goal":
            return True
        # Only count "Own Goal For" (the benefiting team)
        # Do NOT count "Own Goal Against" — it is the paired event for the same goal
        if type_name == "Own Goal For":
            return True
    shot = event.get("shot")
    if isinstance(shot, dict) and shot.get("outcome", {}).get("name") == "Goal":
        return True
    return False


def get_event_team(event):
    for key in ("team", "possession_team"):
        team = event.get(key)
        if isinstance(team, dict) and team.get("name"):
            return team.get("name")
    return None


def build_match_summary(file_path, players_set, teams_set):
    raw_data = safe_load_json(file_path)
    if not isinstance(raw_data, list):
        return None

    home_name, away_name = parse_match_teams(file_path.stem)
    # counts for full-time + extra-time goals
    home_score = 0
    away_score = 0
    # penalty shootout goals (post-match shootout)
    home_penalties = 0
    away_penalties = 0
    event_team_names = set()

    for event in raw_data:
        collect_team_name(event.get("team"), teams_set)
        collect_team_name(event.get("possession_team"), teams_set)

        if event_is_goal(event):
            event_team = get_event_team(event)
            period = event.get("period")
            # treat periods 1-4 as full time + extra time; period 5 is penalty shootout
            is_shootout = period == 5
            if event_team:
                event_team_names.add(event_team)
                normalized = normalize_text(event_team)
                # helper to increment correct counter
                def add_goal(to_home):
                    nonlocal home_score, away_score, home_penalties, away_penalties
                    if is_shootout:
                        if to_home:
                            home_penalties += 1
                        else:
                            away_penalties += 1
                    else:
                        if to_home:
                            home_score += 1
                        else:
                            away_score += 1

                if normalized == normalize_text(home_name):
                    add_goal(True)
                elif normalized == normalize_text(away_name):
                    add_goal(False)
                else:
                    if normalize_text(home_name) in normalized:
                        add_goal(True)
                    elif normalize_text(away_name) in normalized:
                        add_goal(False)
                    else:
                        # fallback: if away_name missing or unknown, assign to home
                        add_goal(not bool(away_name))

        collect_player_name(event.get("player"), players_set)
        if isinstance(event.get("pass"), dict):
            collect_player_name(event["pass"].get("recipient"), players_set)
        if isinstance(event.get("tactics"), dict):
            lineup = event["tactics"].get("lineup")
            if isinstance(lineup, list):
                for item in lineup:
                    collect_player_name(item.get("player"), players_set)

    if not home_name and not away_name and event_team_names:
        event_names = sorted(event_team_names)
        if len(event_names) >= 2:
            home_name, away_name = event_names[0], event_names[1]
        elif event_names:
            home_name = event_names.pop()

    # determine winner considering full-time + extra-time only; shootout winner can be inferred too
    winner = "Draw"
    if home_score > away_score:
        winner = home_name
    elif away_score > home_score:
        winner = away_name
    else:
        # if draw in FT/ET but shootout penalties exist, the shootout decides winner
        if home_penalties or away_penalties:
            if home_penalties > away_penalties:
                winner = home_name
            elif away_penalties > home_penalties:
                winner = away_name

    return {
        "id": file_path.stem,
        "display_name": f"{home_name} vs {away_name}".strip(),
        "home_team": home_name,
        "away_team": away_name,
        "home_score": home_score,
        "away_score": away_score,
        "home_penalties": home_penalties,
        "away_penalties": away_penalties,
        "winner": winner,
        "score_display": f"{home_score} - {away_score}",
    }


def scan_matches():
    players_set = set()
    teams_set = set()
    match_results = []

    if not MATCHES_DIR.exists():
        return players_set, teams_set, 0, []

    for file_path in sorted(MATCHES_DIR.glob("*.json")):
        summary = build_match_summary(file_path, players_set, teams_set)
        if summary:
            match_results.append(summary)

    total_goals = sum(result["home_score"] + result["away_score"] for result in match_results)
    return players_set, teams_set, total_goals, match_results


def load_group_metadata():
    raw_data = safe_load_json(OTHER_DATA_PATH)
    return raw_data if isinstance(raw_data, list) else []


def build_group_standings():
    raw_matches = load_group_metadata()
    if not raw_matches:
        return []

    sorted_matches = sorted(
        (match for match in raw_matches if isinstance(match, dict)),
        key=lambda item: (
            item.get("match_date", ""),
            item.get("kick_off", ""),
        ),
    )

    group_map = {}

    for match in sorted_matches:
        stage_name = (match.get("competition_stage", {}) or {}).get("name", "")
        if not isinstance(stage_name, str) or stage_name.strip().lower() != "group stage":
            continue

        home_team_meta = match.get("home_team") or {}
        away_team_meta = match.get("away_team") or {}
        home_team = home_team_meta.get("home_team_name")
        away_team = away_team_meta.get("away_team_name")
        home_group = home_team_meta.get("home_team_group")
        away_group = away_team_meta.get("away_team_group")
        
        if not home_team or not away_team:
            continue
        
        # Infer missing group from the other team if available
        if home_group and not away_group:
            away_group = home_group
        elif away_group and not home_group:
            home_group = away_group
        
        # Skip if both groups are missing or they don't match
        if not home_group or not away_group or home_group != away_group:
            continue

        try:
            home_score = int(match.get("home_score") or 0)
            away_score = int(match.get("away_score") or 0)
        except (TypeError, ValueError):
            home_score = 0
            away_score = 0

        def ensure_team_entry(group_label, team_name):
            group_entry = group_map.setdefault(group_label, {"group": group_label, "teams": {}})
            teams = group_entry["teams"]
            if team_name not in teams:
                teams[team_name] = {
                    "name": team_name,
                    "played": 0,
                    "points": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                    "gf": 0,
                    "ga": 0,
                    "gd": 0,
                    "form": [],
                }
            return teams[team_name]

        home_entry = ensure_team_entry(home_group, home_team)
        away_entry = ensure_team_entry(home_group, away_team)

        home_entry["played"] += 1
        away_entry["played"] += 1
        home_entry["gf"] += home_score
        home_entry["ga"] += away_score
        away_entry["gf"] += away_score
        away_entry["ga"] += home_score

        if home_score > away_score:
            home_entry["wins"] += 1
            home_entry["points"] += 3
            away_entry["losses"] += 1
            home_entry["form"].append("win")
            away_entry["form"].append("loss")
        elif away_score > home_score:
            away_entry["wins"] += 1
            away_entry["points"] += 3
            home_entry["losses"] += 1
            away_entry["form"].append("win")
            home_entry["form"].append("loss")
        else:
            home_entry["draws"] += 1
            away_entry["draws"] += 1
            home_entry["points"] += 1
            away_entry["points"] += 1
            home_entry["form"].append("draw")
            away_entry["form"].append("draw")

    groups = []
    for group_label, group_data in sorted(group_map.items(), key=lambda item: item[0]):
        teams = []
        for team in group_data["teams"].values():
            team["gd"] = team["gf"] - team["ga"]
            teams.append(team)
        teams.sort(key=lambda item: (-item["points"], -item["gd"], -item["gf"], item["name"]))
        groups.append({"group": group_label, "teams": teams})

    return groups


def ensure_cache():
    players_path = CACHE_DIR / "players.json"
    teams_path = CACHE_DIR / "teams.json"
    goals_path = CACHE_DIR / "goals.json"
    results_path = CACHE_DIR / "results.json"

    group_standings_path = GROUPS_CACHE_PATH
    expected_file_count = len(list(MATCHES_DIR.glob("*.json")))
    results_data = safe_load_json(results_path) or {"matches": []}
    cache_meta = CACHE_DIR / 'cache_meta.json'
    cache_info = safe_load_json(cache_meta) or {}
    missing_cache = any(not path.exists() for path in (players_path, teams_path, goals_path, results_path, group_standings_path, cache_meta))
    missing_cache = missing_cache or cache_info.get('version') != CACHE_VERSION
    missing_cache = missing_cache or cache_info.get('match_count') != expected_file_count
    if missing_cache:
        players_set, teams_set, total_goals, matches = scan_matches()
        groups = build_group_standings()
        safe_write_json(players_path, {"players": sorted(players_set)})
        safe_write_json(teams_path, {"teams": sorted(teams_set)})
        safe_write_json(goals_path, {"total_goals": total_goals})
        safe_write_json(results_path, {"matches": matches})
        safe_write_json(group_standings_path, {"groups": groups})
        safe_write_json(cache_meta, {
            "version": CACHE_VERSION,
            "match_count": expected_file_count,
        })
        return {
            "players": sorted(players_set),
            "teams": sorted(teams_set),
            "total_goals": total_goals,
            "matches": matches,
            "groups": groups,
        }

    players_data = safe_load_json(players_path) or {"players": []}
    teams_data = safe_load_json(teams_path) or {"teams": []}
    goals_data = safe_load_json(goals_path) or {"total_goals": 0}
    results_data = safe_load_json(results_path) or {"matches": []}
    group_data = safe_load_json(group_standings_path) or {"groups": []}

    return {
        "players": players_data.get("players", []),
        "teams": teams_data.get("teams", []),
        "total_goals": goals_data.get("total_goals", 0),
        "matches": results_data.get("matches", []),
        "groups": group_data.get("groups", []),
    }


def load_dashboard_data():
    data = ensure_cache()
    return {
        "match_count": len(data["matches"]),
        "player_count": len(data["players"]),
        "team_count": len(data["teams"]),
        "total_goals": data["total_goals"],
    }, data["matches"], data.get("groups", [])