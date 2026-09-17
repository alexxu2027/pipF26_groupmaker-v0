"""GroupMaker v0 — backend.

Serves the roster, randomizes groups, collects survey responses, and (in
production) serves the built frontend from frontend/dist.
"""

import csv
import datetime
import json
import os
import random

from flask import Flask, jsonify, request, send_from_directory

DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "roster.json")
SCHEMA_FILE = os.path.join(DATA_DIR, "survey_schema.json")
RESPONSES_FILE = os.path.join(DATA_DIR, "survey_responses.csv")

app = Flask(__name__, static_folder=None)


def load_roster():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/roster")
def get_roster():
    return jsonify(load_roster())


@app.post("/api/groups/randomize")
def randomize_groups():
    body = request.get_json(silent=True) or {}
    group_size = int(body.get("group_size", 4))
    group_size = max(2, min(group_size, 10))

    students = load_roster()["students"]
    random.shuffle(students)

    groups = [students[i : i + group_size] for i in range(0, len(students), group_size)]

    # Fold a too-small last group into the others, one member each.
    if len(groups) > 1 and len(groups[-1]) < max(2, group_size - 1):
        leftovers = groups.pop()
        for i, student in enumerate(leftovers):
            groups[i % len(groups)].append(student)

    return jsonify({"groups": [{"number": i + 1, "members": g} for i, g in enumerate(groups)]})


# ---- Survey ------------------------------------------------------------------
# The questions live in data/survey_schema.json. The form renders whatever is in
# there and the CSV header comes from the same list, so adding or reordering a
# question means editing that file only.


def load_schema():
    with open(SCHEMA_FILE, encoding="utf-8") as f:
        return json.load(f)


def survey_fields():
    """Schema fields, with roster-backed dropdowns filled in from the roster."""
    schema = load_schema()
    names = [s["name"] for s in load_roster()["students"]]
    for field in schema["fields"]:
        if field.get("source") == "roster":
            field["values"] = names
    return schema


def clean_answer(field, value):
    """Return (csv_value, problem) for one answer. problem is None when valid."""
    optional = field.get("optional", False)
    allowed = [str(v) for v in field.get("values", [])]

    if field["type"] == "multiselect":
        chosen = [str(v) for v in (value or []) if str(v).strip()]
        if not chosen:
            return "", None if optional else "missing"
        if any(v not in allowed for v in chosen):
            return "", "invalid"
        return "; ".join(chosen), None

    text = "" if value is None else str(value).strip()
    if not text:
        return "", None if optional else "missing"
    if field["type"] in ("dropdown", "scale") and text not in allowed:
        return "", "invalid"
    return text, None


@app.get("/api/survey/schema")
def get_survey_schema():
    return jsonify(survey_fields())


@app.post("/api/survey")
def submit_survey():
    body = request.get_json(silent=True) or {}
    answers = body.get("answers") or {}
    fields = survey_fields()["fields"]

    row, missing, invalid = {}, [], []
    for field in fields:
        value, problem = clean_answer(field, answers.get(field["column"]))
        row[field["column"]] = value
        if problem == "missing":
            missing.append(field["column"])
        elif problem == "invalid":
            invalid.append(field["column"])

    if missing or invalid:
        return jsonify({"error": "Some answers need fixing.", "missing": missing, "invalid": invalid}), 400

    row["submitted_at"] = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
    columns = [f["column"] for f in fields] + ["submitted_at"]

    # newline="" keeps the csv module from writing blank lines between rows on Windows.
    needs_header = not os.path.exists(RESPONSES_FILE) or os.path.getsize(RESPONSES_FILE) == 0
    with open(RESPONSES_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        if needs_header:
            writer.writeheader()
        writer.writerow(row)

    return jsonify({"ok": True, "submitted_at": row["submitted_at"]})


# ---- Serve the built frontend (production) ----------------------------------
# In development you won't use these routes: Vite serves the frontend at
# localhost:5173 and proxies /api requests here.


@app.get("/")
def index():
    return send_from_directory(DIST_DIR, "index.html")


@app.get("/<path:path>")
def assets(path):
    full = os.path.join(DIST_DIR, path)
    if os.path.isfile(full):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
