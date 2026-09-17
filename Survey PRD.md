# PRD: GroupMaker Survey Page

Paste this into Cursor's agent on YOUR GroupMaker v0 copy — after filling in the
Schema section from the board.

## Overview

Add a **survey page** to GroupMaker. Right now the app can only show the roster
and randomize groups. To form *good* groups, we need information about each
student — this survey is how we collect it.

## Context

- Repo: your GroupMaker v0 (Flask backend `app.py`, React frontend in `frontend/`, data files in `data/`)
- The survey runs **locally only**. Responses are stored in a CSV file on your machine — no database, no cloud.

## User story

A student opens the app, clicks "Survey," answers every question on one page,
hits Submit, and sees a confirmation. Their answers are saved as one row in a CSV file.

## Functional requirements

1. A **Survey** page/view in the React frontend, reachable from the main page (link or button). The roster and Randomize Groups features must keep working unchanged.
2. The form renders **every field in the Schema section below**, using the input type specified (dropdown, 1–5 scale, multi-select, free text).
3. The **name dropdown is populated from `data/roster.json`** — names are never typed by hand.
4. All fields are required except those marked *optional*. Submitting with a missing required field shows which fields are missing; nothing is saved.
5. On submit, the frontend sends the answers to a new backend endpoint **`POST /api/survey`**.
6. The backend **appends one row to `data/survey_responses.csv`**. If the file doesn't exist, create it with a header row matching the schema's column names, in order. Add a `submitted_at` timestamp column (ISO format) as the last column.
7. After a successful save, the form is replaced by a confirmation message. If the backend fails, show an error and keep the user's answers on screen.
8. Submitting twice appends two rows (no dedup logic — keep it simple).

## Schema

*Fill in from the board. One row per field. Column names: lowercase_with_underscores. Every dropdown/scale/multi-select must list its exact allowed values.*

| Column name | Question shown to user | Input type | Allowed values | Optional? |
|---|---|---|---|---|
| *(example)* school_year | What year are you? | dropdown | First-year / Sophomore / Junior / Senior / Other | no |
| *(example)* working_style | Describe your working style in 1–2 sentences | free text | — | no |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

## Out of scope

- No login/authentication
- No database — CSV only
- No editing or viewing past responses in the app
- No styling beyond "usable and readable"

## Acceptance test (do this yourself before calling it done)

1. Start backend and frontend; open the survey page.
2. Try submitting with a blank required field → blocked with a clear message.
3. Fill everything out **as yourself** and submit → confirmation appears.
4. Open `data/survey_responses.csv` → exactly one row, columns match the schema in order, your answers are correct, timestamp present.
5. Submit again → second row appended, header not repeated.
