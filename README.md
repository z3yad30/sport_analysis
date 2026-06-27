# 2022 FIFA World Cup Analysis Dashboard

A web-based dashboard that visualizes statistics and data from the 2022 FIFA World Cup tournament. The project fetches detailed match event data from StatsBomb's open-data repository and displays tournament statistics, group standings, knockout rounds, and individual awards.

## Features

- **Match Statistics**: View complete match data including scores, goals, and event details
- **Group Standings**: See final group stage standings with points, wins, draws, losses, and goal differentials
- **Knockout Rounds**: Track progression through Round of 16, Quarter-finals, Semi-finals, and Final
- **Tournament Awards**: Displays prestigious awards including Golden Ball, Golden Boot, Golden Glove, and more
- **Player & Team Data**: Comprehensive player and team information extracted from match events

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)
- Internet connection (for fetching data from StatsBomb API)

## Installation

1. **Navigate to the project directory**:
   ```bash
   cd d:\Drafts\Projects\2022_CUP_Analysis
   ```

2. **Install required dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

   This will install:
   - Flask >= 2.2 (web framework)

## Project Setup & Running

Follow these steps in order to set up and run the project:

### Step 1: Fetch Match Data
Run the data fetching script to download all match event data from StatsBomb:

```bash
python other/world_cup_2022_matches.py
```

**What this does:**
- Reads match metadata from `other/106.json`
- Fetches detailed event data for each match from StatsBomb's API
- Saves match data as JSON files in the `matches_data/` directory
- Creates files like `Argentina_vs_France.json`, `England_vs_Iran.json`, etc.

**Note**: This step requires an internet connection and may take a few minutes.

### Step 2: Build Cache (Optional - Automatic)
The analytics module will automatically build the cache when needed:

```bash
python helpers/analytics.py
```

**What this does:**
- Scans all match data in `matches_data/`
- Extracts player names and team information
- Calculates group standings from group stage matches
- Counts total goals scored
- Caches results in `helpers/` directory for faster loading
- Generates:
  - `helpers/players.json` - List of all players
  - `helpers/teams.json` - List of all teams
  - `helpers/goals.json` - Total goals count
  - `helpers/results.json` - Match results summary
  - `helpers/group_standings.json` - Group standings data
  - `helpers/cache_meta.json` - Cache metadata

**Note**: This step is automatically executed by the Flask app on first run, so it's optional to run manually.

### Step 3: Start the Flask Server
Run the main application server:

```bash
python app.py
```

**Output you should see:**
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

The server is now running and ready to serve the dashboard.

### Step 4: Access the Dashboard
Open your web browser and navigate to:

```
http://localhost:5000
```

Or alternatively:

```
http://127.0.0.1:5000
```

You should now see the 2022 FIFA World Cup Analysis Dashboard with:
- Tournament statistics (total matches, players, teams, goals)
- Group stage standings for all 8 groups
- Complete knockout bracket
- Tournament awards and winners
- Match details and results

## Project Structure

```
2022_CUP_Analysis/
├── app.py                          # Flask web server (main entry point)
├── requirements.txt                # Python dependencies
├── README.md                       # This file
├── helpers/
│   ├── __init__.py
│   ├── analytics.py               # Data processing and caching logic
│   ├── cache_meta.json            # Cache version tracking
│   ├── players.json               # Cached player list
│   ├── teams.json                 # Cached team list
│   ├── goals.json                 # Cached goals count
│   ├── results.json               # Cached match results
│   └── group_standings.json       # Cached group standings
├── matches_data/                  # Match event data (created after Step 1)
│   ├── Argentina_vs_France.json
│   ├── Argentina_vs_Australia.json
│   └── ... (32 match files total)
├── other/
│   ├── 106.json                   # Match metadata source file
│   └── world_cup_2022_matches.py  # Script to fetch match data
├── Flags/                         # Country flag images
├── Players/                       # Player profile images
├── static/
│   └── styles.css                 # CSS styling for the dashboard
└── templates/
    └── index.html                 # HTML template for the dashboard
```

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'flask'"
**Solution**: Make sure you've installed requirements:
```bash
pip install -r requirements.txt
```

### Issue: "Connection error" when fetching data
**Solution**: Check your internet connection and ensure StatsBomb API is accessible.

### Issue: "Port 5000 already in use"
**Solution**: Either close the other process using port 5000, or modify `app.py` line 126 to use a different port:
```python
app.run(host='0.0.0.0', port=5001, debug=True)  # Change 5000 to another port
```

### Issue: Empty dashboard after running
**Solution**: Make sure you've completed Step 1 (fetching data). Verify that JSON files exist in `matches_data/` directory.

## Notes

- **Debug Mode**: The Flask server runs in debug mode, which enables auto-reloading when code changes
- **Data Source**: All match data is sourced from [StatsBomb's open-data repository](https://github.com/statsbomb/open-data)
- **Cache System**: The application caches processed data to improve performance. Delete cache files in `helpers/` to force a rebuild
- **Stopping the Server**: Press `Ctrl+C` in the terminal to stop the Flask server

## License

This project uses data from StatsBomb's open-data repository. Refer to their terms for usage rights.
