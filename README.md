# Suntology

Sun-safety web app: **live UV and day planning**, **optional photo scan** (PyTorch classifier + a simple on-device “warmth” readout for demos), **sunscreen coverage map** (with optional MediaPipe hand/face hints), **education** and **resources**, and **email/password sign-in** (Firebase). **For education only—not medical advice or diagnosis.**

Built for **PantherHacks 2026**.

---

## What’s in the app

| Area | What it does |
|------|----------------|
| **Home** | Hero, links into UV planning and learning. |
| **UV Planning** (`/uv`) | Current UV, hourly curve (Open-Meteo), burn-style guidance, “plan around the sun” panel. Optional **WeatherAPI.com** strip when a key is set. |
| **Scan** (`/scan`) | Webcam or upload → `POST /api/predict` → classifier scores + demo warmth label. Follow-up chat uses the same assistant as Learn when the API is configured. |
| **Coverage** (`/coverage`) | Interactive sunscreen coverage demo; optional MediaPipe tracking. |
| **Learn** (`/learn`) | Static sun / UV / awareness content + education chat (`/api/chat`). |
| **Resources** (`/resources`) | Vendor docs and trusted health links. |
| **Auth** (`/auth`) | Firebase email/password; modal-style screen with optional side art. |

**Data sources**

- **UV & geocoding:** [Open-Meteo](https://open-meteo.com/) (no API key).
- **Weather card / week outlook (optional):** [WeatherAPI.com](https://www.weatherapi.com/) — set `VITE_WEATHER_API_KEY` in the frontend env.

**Backend API** (Flask, default `http://127.0.0.1:5001`)

- `GET /api/health` — liveness; tries to load the classifier.
- `POST /api/predict` — multipart field `file` or `image` (image bytes).
- `POST /api/chat` — JSON body with messages; uses **Mistral** or **OpenAI** on the server when keys exist (see `.env.example`).

---

## Stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Framer Motion, Firebase Auth, MediaPipe Tasks Vision, shadcn-style UI pieces |
| **Backend** | Python 3.10+, Flask, PyTorch / torchvision, Pillow, flask-cors, python-dotenv, certifi (HTTPS to LLM APIs) |
| **Deploy (optional)** | `wsgi.py` at this folder root for hosts (e.g. Vercel) that expect a named WSGI entry |

---

## Run locally

Use **two processes**: Flask API + Vite dev server. From **`skin-disease-detection-inspo/`** (the directory that contains `run.py`).

### 1. Backend

On macOS, `python` is often missing—use **`python3`** or a venv.

```bash
cd skin-disease-detection-inspo
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 run.py
```

Shortcut from the same folder:

```bash
npm run api
```

Default URL: `http://127.0.0.1:5001` (`PORT` overrides; **5001** avoids macOS AirPlay using **5000**).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`). **`vite.config.ts`** proxies `/api` to `127.0.0.1:5001`.

**From repo root** (parent of `frontend/`), you can also run:

```bash
npm run dev      # same as npm run dev --prefix frontend
npm run build    # production build of the SPA
```

---

## Environment variables

### Backend (Flask)

Copy **`.env.example`** → **`.env`** next to `run.py`, or put secrets in the **parent** folder’s **`.env`** (e.g. `Skintology/.env`)—Flask loads repo `.env` first, then parent with `override=False`.

| Variable | Purpose |
|----------|---------|
| `MISTRAL_API_KEY` | Chat completions (primary). |
| `OPENAI_API_KEY` | Optional alternative for chat. |
| `PORT` | Listen port (default `5001`). |

See `.env.example` for optional Mistral model / agent IDs.

### Frontend (`frontend/.env.local`)

Never commit real keys. Restart Vite after edits.

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_*` | Required for auth (see `src/lib/firebase.ts` / `vite-env.d.ts`). |
| `VITE_WEATHER_API_KEY` | Optional; enables WeatherAPI.com in the UV / day plan UI. |

Chat keys are **server-only** (`MISTRAL_*` / `OPENAI_*` in Flask `.env`), not `VITE_*`.

---

## Model weights (photo scan)

`app/inference.py` picks the first bundle that exists on disk (next to `run.py`):

1. `suntology-model.pt` + `suntology-classes.json` (from `training/train.py`)
2. `suncheck-model.pt` + `suncheck-classes.json`
3. `suncheck-dry-oily.pt` alone (two classes: `dry`, `oily`)

If none are present, `/api/predict` fails until you add files. Restart Flask after adding or replacing weights.

---

## Train your own classifier

Put images in `data/<class>/` (gitignored). Class order follows **alphabetical** folder names. From this folder with venv active:

```bash
source .venv/bin/activate
python training/train.py --epochs 15
```

Outputs `suntology-model.pt` and `suntology-classes.json` in the repo root.

---

## Deploying (e.g. Vercel)

- **Python entry:** This repo includes **`wsgi.py`** so platforms that require a standard WSGI file (alongside `app.py` / `index.py`, etc.) can find the Flask `app`.
- **Project root:** Point the host at **`skin-disease-detection-inspo/`** (where `wsgi.py`, `requirements.txt`, and `app/` live)—not only `frontend/`, or Python won’t see the API.
- **PyTorch + `.pt` files** are large; serverless bundles have **size and cold-start** limits. If deploy fails after fixing the entrypoint, consider a container/VPS for the API, or a smaller inference setup.

For a **static frontend** on Vercel plus API elsewhere, build `frontend` and set your production API base URL in the client (today the app assumes same-origin `/api` in dev).

---

## Troubleshooting

**Port 5001 in use**

```bash
lsof -nP -iTCP:5001 -sTCP:LISTEN
kill $(lsof -t -iTCP:5001 -sTCP:LISTEN)
```

If you change `PORT`, update `frontend/vite.config.ts` `server.proxy` to match.

**`CERTIFICATE_VERIFY_FAILED` (macOS) when calling Mistral/OpenAI**

Ensure `certifi` is installed (`pip install -r requirements.txt`) and restart Flask. For python.org macOS builds you can also run **Install Certificates.command** in `/Applications/Python 3.x/`.

**Wrong `.env` for chat**

LLM keys belong in the **Flask** environment (`.env` next to `run.py` or parent `.env`), not only in `frontend/.env.local`.

---

## Repo layout (main pieces)

| Path | Role |
|------|------|
| `app/` | Flask app: `__init__.py`, `routes.py`, `inference.py`, `chat_assistant.py` |
| `run.py` | Dev server entry |
| `wsgi.py` | WSGI entry (env load + `app`) for production-style hosts |
| `requirements.txt` | Python dependencies |
| `training/train.py` | Train classifier → `suntology-model.pt` + JSON |
| `frontend/` | Vite + React SPA |
| `scripts/start-api.sh` | Used by `npm run api` |

`node_modules/`, `.venv/`, and local `.env` files are not committed.

---

## Credits & license

Hackathon project for **PantherHacks 2026**. Respect upstream, dataset, and model licenses where applicable.
