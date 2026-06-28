from pathlib import Path

from flask import Flask, render_template, send_from_directory, request, jsonify

from helpers.analytics import load_dashboard_data, search_players

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)


@app.route('/Flags/<path:filename>')
def serve_flag(filename):
    return send_from_directory(BASE_DIR / 'Flags', filename)


@app.route('/Players/<path:filename>')
def serve_player(filename):
    return send_from_directory(BASE_DIR / 'Players', filename)


@app.route('/')
def index():
    stats, matches, groups = load_dashboard_data()
    cup_winner = {
        'name': 'Argentina',
        'wins': 'Won 3 Times',
        'flag': '/Flags/Argentina.png',
        'final_opponent': 'France',
        'final_flag': '/Flags/France.png',
        'final_score': 'Argentina 3 - 3 France (Argentina won 4-2 on penalties)',
    }
    knockout_rounds = [
        {
            'name': 'Round of 16',
            'matches': [
                ('Netherlands', 'United States'),
                ('Argentina', 'Australia'),
                ('France', 'Poland'),
                ('England', 'Senegal'),
            ],
        },
        {
            'name': 'Quarter-finals',
            'matches': [
                ('Argentina', 'Netherlands'),
                ('France', 'England'),
                ('Croatia', 'Brazil'),
                ('Morocco', 'Portugal'),
            ],
        },
        {
            'name': 'Semi-finals',
            'matches': [
                ('Argentina', 'Croatia'),
                ('France', 'Morocco'),
            ],
        },
        {
            'name': 'Final',
            'matches': [('Argentina', 'France')],
        },
    ]
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
        'index.html',
        stats=stats,
        matches=matches,
        groups=groups,
        cup_winner=cup_winner,
        knockout_rounds=knockout_rounds,
        awards=awards,
    )


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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
