# GroupMaker v0

The class app for Projects in Programming & Data Science (Fall 2026). v0 shows
the class roster and randomizes it into groups. We build this out all semester.

## Run it locally

You need: Python 3.12+, Node 20+, git. (See the course setup instructions.)

**Terminal 1 — backend:**

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open the URL that Vite prints (usually http://localhost:5173). You should see
the roster and a **Randomize Groups** button.

## Layout

```
app.py              backend (Flask): serves /api/* and, in production, the built frontend
data/roster.json    the data: the class roster
frontend/           frontend (React + Vite): what you see in the browser
Dockerfile          a packaged set of code that Railway knows what to do with (used in week 6)
```

## Instructor note

Replace `data/roster.json` with the real class roster (names only) before Class 1.

Alex Xu 9/17/26