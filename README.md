# 2022 FIFA World Cup Analysis Dashboard

A web-based dashboard for exploring the 2022 FIFA World Cup with match statistics, group standings, knockout progression, player/team information, and the interactive match-analysis experience.

## Features

- Match statistics and detailed event summaries
- Group standings and tournament progression
- Player and team information
- Interactive match-analysis pages for selected fixtures

## Requirements

- Python 3.9 or newer
- pip
- Windows Command Prompt (instructions below)

## Quick start on Windows (Command Prompt)

Run these commands from the project folder:

```cmd
cd /d D:\Drafts\Projects\2022_CUP_Analysis
python -m venv .venv
.\.venv\Scripts\activate.bat
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://127.0.0.1:5000/
```

## Optional: refresh match data

The repository already includes the sample match JSON files in the matches_data folder, so you can usually run the app immediately. If you want to refresh the data from the source, run:

```cmd
python other\world_cup_2022_matches.py
```

This downloads match-event data and writes new JSON files into the matches_data folder.

## Optional: rebuild cached analytics

If you want to regenerate the cached helper files used by the dashboard, run:

```cmd
python helpers\analytics.py
```

## Project structure

```text
2022_CUP_Analysis/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── helpers/
├── matches_data/
├── other/
├── Flags/
├── Players/
├── news/
├── pages/
└── tools/
```

## Notes for GitHub

Do not upload the local virtual environment folder `.venv/`. It is ignored by the repository settings in `.gitignore`.

## Troubleshooting

- If `pip` is not recognized, install Python and ensure it is added to PATH.
- If port `5000` is already in use, change the port in `app.py`.
- If the app cannot find Flask, run `pip install -r requirements.txt` again.

## Stop the server

Press `Ctrl + C` in the terminal to stop the Flask server.
