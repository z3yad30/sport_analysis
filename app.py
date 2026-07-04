from pathlib import Path

from flask import Flask, render_template, send_from_directory, request, jsonify

from helpers.analytics import load_dashboard_data, search_players

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, template_folder='pages', static_url_path='/pages', static_folder='pages')


@app.route('/Flags/<path:filename>')
def serve_flag(filename):
    return send_from_directory(BASE_DIR / 'Flags', filename)


@app.route('/Players/<path:filename>')
def serve_player(filename):
    return send_from_directory(BASE_DIR / 'Players', filename)


@app.route('/news/<path:filename>')
def serve_news(filename):
    return send_from_directory(BASE_DIR / 'news', filename)


@app.route('/')
def home():
    stats, matches, groups = load_dashboard_data()
    cup_winner = {
        'name': 'Argentina',
        'wins': 'Won 3 Times',
        'flag': '/Flags/Argentina.png',
        'final_opponent': 'France',
        'final_flag': '/Flags/France.png',
        'final_score': 'Argentina 3 - 3 France (Argentina won 4-2 on penalties)',
    }
    news_items = [
        {
            'tag': 'Champions',
            'headline': 'Messi’s final chapter crowns Argentina in Qatar',
            'content': 'Argentina lifted the trophy after Lionel Messi led a fearless campaign and a dramatic final against France.',
            'image': '/news/argentina-final.png',
        },
        {
            'tag': 'Surprise story',
            'headline': 'Japan’s run shocks the tournament favourites',
            'content': 'Japan stunned Germany and Spain to become the story of the group stage before a thrilling knockout run.',
            'image': '/news/japan-shock.svg',
        },
        {
            'tag': 'African dream',
            'headline': 'Morocco make history with a magical run',
            'content': 'Morocco reached the semifinals and captured the imagination of the world with disciplined defending and fearless attacks.',
            'image': '/news/morocco-run.svg',
        },
        {
            'tag': 'Record breaker',
            'headline': 'Mbappé lights up the final with a record-breaking comeback',
            'content': 'Kylian Mbappé scored twice in the final’s closing minutes to force extra time and rewrite the match narrative.',
            'image': '/news/mbappe-record.png',
        },
    ]

    return render_template(
        'home/home.html',
        stats=stats,
        matches=matches,
        cup_winner=cup_winner,
        news_items=news_items,
    )


@app.route('/matches')
def matches():
    stats, matches, groups = load_dashboard_data()
    return render_template(
        'matches/matches.html',
        matches=matches,
        groups=groups,
    )


@app.route('/players')
def players():
    awards = [
        {
            'trophy': 'Golden Ball',
            'meaning': 'Best overall player of the tournament',
            'winner': 'Lionel Messi',
            'image': '/Players/Lionel Messi.png',
            'country': 'Argentina',
            'country_flag': '/Flags/Argentina.png',
            'description': 'Lionel Messi led Argentina with composure, creativity, and decisive moments in the knockout rounds.',
        },
        {
            'trophy': 'Golden Boot',
            'meaning': 'Top goalscorer of the tournament',
            'winner': 'Kylian Mbappé',
            'image': '/Players/Kylian Mbappé.png',
            'country': 'France',
            'country_flag': '/Flags/France.png',
            'description': 'Kylian Mbappé finished as the tournament top scorer with eight goals, including a dramatic final performance.',
        },
        {
            'trophy': 'Golden Glove',
            'meaning': 'Best goalkeeper',
            'winner': 'Emiliano Martínez',
            'image': '/Players/Emiliano Martínez.png',
            'country': 'Argentina',
            'country_flag': '/Flags/Argentina.png',
            'description': 'Emiliano Martínez delivered the crucial saves that shaped Argentina’s path to the title.',
        },
        {
            'trophy': 'Best Young Player',
            'meaning': 'Best player aged 21 or younger',
            'winner': 'Enzo Fernández',
            'image': '/Players/Enzo Fernández.png',
            'country': 'Argentina',
            'country_flag': '/Flags/Argentina.png',
            'description': 'Enzo Fernández stood out as the tournament’s most impressive young midfielder with poise and control.',
        },
        {
            'trophy': 'FIFA Fair Play Trophy',
            'meaning': 'Team with the best disciplinary record and sportsmanship',
            'winner': 'England national football team',
            'image': '/Flags/England.png',
            'country': 'England',
            'country_flag': '/Flags/England.png',
            'description': 'England were honoured for their discipline and fair-play standards across the competition.',
        },
    ]
    return render_template(
        'players/players.html',
        awards=awards,
    )


@app.route('/teams')
def teams():
    return render_template('teams/teams.html')


@app.route('/profile')
def profile():
    return render_template('profile/profile.html')


@app.route('/api/search-players')
def search_players_api():
    query = request.args.get('q', '').strip()
    results = search_players(query)
    
    # Add image path to each player
    enhanced_results = []
    for player in results:
        player_data = {
            "name": player.get("name"),
            "team": player.get("team"),
            "image": f"/Players/{player.get('name')}.png"
        }
        enhanced_results.append(player_data)
    
    return jsonify(enhanced_results)


@app.route('/api/match/<match_id>')
def get_match_data(match_id):
    """Fetch match event data by match ID"""
    import json

    match_file = BASE_DIR / 'matches_data' / f'{match_id}.json'

    if not match_file.exists():
        return jsonify({'error': 'Match not found'}), 404

    try:
        with open(match_file, 'r', encoding='utf-8') as f:
            events = json.load(f)

        metadata = None
        metadata_path = BASE_DIR / 'other' / '106.json'
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata_records = json.load(f)

            team_parts = [part.strip() for part in match_id.split('_vs_') if part.strip()]
            if len(team_parts) >= 2:
                home_name, away_name = team_parts[0], team_parts[1]
                metadata = next(
                    (
                        record
                        for record in metadata_records
                        if (record.get('home_team', {}).get('home_team_name') or '').replace('_', ' ').strip().lower() == home_name.lower()
                        and (record.get('away_team', {}).get('away_team_name') or '').replace('_', ' ').strip().lower() == away_name.lower()
                    ),
                    None,
                )

        payload = {
            'id': match_id,
            'home_team': (metadata or {}).get('home_team', {}).get('home_team_name') or (team_parts[0] if len(team_parts) >= 2 else None),
            'away_team': (metadata or {}).get('away_team', {}).get('away_team_name') or (team_parts[1] if len(team_parts) >= 2 else None),
            'competition': (metadata or {}).get('competition', {}).get('competition_name') or 'FIFA World Cup',
            'date': (metadata or {}).get('match_date') or '',
            'home_score': (metadata or {}).get('home_score'),
            'away_score': (metadata or {}).get('away_score'),
            'events': events,
        }
        return jsonify(payload)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/match_analysis')
def match_analysis():
    # Match analysis page removed — route deprecated
    return render_template('matches/matches.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
