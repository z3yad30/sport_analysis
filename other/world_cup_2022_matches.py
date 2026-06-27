import requests
import json
import os
import re

# -----------------------------
# 1. LOAD THE MATCHES LIST
# -----------------------------
# Make sure '106.json' (your file) is in the same folder as this script
with open('106.json', 'r', encoding='utf-8') as f:
    matches = json.load(f)

# -----------------------------
# 2. CREATE A SAFE FILENAME
# -----------------------------
def make_safe_filename(team1, team2):
    """Remove special characters and replace spaces with underscores."""
    # Combine names
    raw_name = f"{team1}_vs_{team2}"
    # Replace any character that is NOT a letter, number, or underscore
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', raw_name)
    # Remove multiple consecutive underscores
    safe_name = re.sub(r'_+', '_', safe_name)
    # Remove leading/trailing underscores
    safe_name = safe_name.strip('_')
    return safe_name

# -----------------------------
# 3. FETCH AND SAVE EACH MATCH
# -----------------------------
# Create a folder to store the data
os.makedirs('matches_data', exist_ok=True)

for match in matches:
    match_id = match['match_id']
    home_team = match['home_team']['home_team_name']
    away_team = match['away_team']['away_team_name']
    
    # Build the safe filename
    filename = make_safe_filename(home_team, away_team) + '.json'
    filepath = os.path.join('matches_data', filename)
    
    # Build the StatsBomb API URL (event data)
    url = f"https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/{match_id}.json"
    
    print(f"Fetching: {home_team} vs {away_team} (ID: {match_id}) -> {filename}")
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            with open(filepath, 'w', encoding='utf-8') as outfile:
                json.dump(data, outfile, indent=2, ensure_ascii=False)
            print(f"  ✅ Saved successfully.")
        else:
            print(f"  ❌ Failed! HTTP Status: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n✅ All done! Check the 'world_cup_2022_matches' folder.")