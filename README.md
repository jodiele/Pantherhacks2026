# Suntology · PantherHacks 2026

Sun safety companion: **live UV index**, **burn alerts**, optional **photo scan** (demo ML + warmth heuristic), **sun exposure** education, and **skin cancer awareness** links. **Not medical advice.**

## Features

- UV index from [Open-Meteo](https://open-meteo.com/) (location or coordinates)
- Burn-risk alerts tied to current UV
- React (Vite) frontend + Flask API with PyTorch image classifier (`suntology-model.pt` / `suncheck-model.pt` / `suncheck-dry-oily.pt`)
- Client-side “warmth” signal on photos (informal demo only)

## Run locally

**Backend** (Python 3.10+ recommended; from **`skin-disease-detection-inspo/`** — the folder that contains `run.py`):

On macOS, `python` is often missing; use **`python3`** or the venv below.

```bash
cd skin-disease-detection-inspo   # if you’re in the parent Skintology folder
python3 -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 run.py                    # or: .venv/bin/python run.py
```

Shortcut (same folder): `npm run api` — uses `.venv` if present, otherwise `python3`.

API: `http://127.0.0.1:5001` by default (`PORT` env overrides; 5001 avoids macOS AirPlay on 5000) — `GET /api/health`, `POST /api/predict` (multipart field `file` or `image`).

**“Address already in use” / port 5001:** An older Flask process is still running (e.g. another terminal or a background run). Free the port, then start again:

```bash
lsof -nP -iTCP:5001 -sTCP:LISTEN
kill $(lsof -t -iTCP:5001 -sTCP:LISTEN)
```

If you must use another port (e.g. `PORT=5002 python3 run.py`), change the `proxy` target in `frontend/vite.config.ts` to match.

**Chat: `CERTIFICATE_VERIFY_FAILED` on macOS:** The API key is usually fine; Python failed to verify HTTPS to Mistral/OpenAI. The app uses the `certifi` CA bundle for outbound calls—run `pip install -r requirements.txt` again so `certifi` is installed, then restart Flask. Alternatively, install certs for the Python.org macOS build: open **`/Applications/Python 3.x/Install Certificates.command`**.

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`). The dev server proxies `/api` to the Flask app.

## What’s in this repo (trimmed)

Legacy notebooks, duplicate static sites, and old image folders were removed. What’s left:

| Path | Purpose |
|------|---------|
| `app/` | Flask app: `inference.py` (model), `routes.py` (JSON API) |
| `run.py` | Start the API server |
| `suntology-model.pt`, `suncheck-model.pt`, `suncheck-dry-oily.pt` | PyTorch weights for `/api/predict` (see training section) |
| `requirements.txt` | Python dependencies |
| `frontend/` | Vite + React UI (Suntology) |

Everything else you see locally (`node_modules/`, `.venv/`) is installed by npm/pip and is gitignored.

## Train your own classifier (dry / oily / sunburnt, etc.)

Put images in `data/<class>/` folders (gitignored), e.g. `data/dry/`, `data/oily/`, `data/sunburnt/`. Class indices follow **alphabetical** folder names. From the repo root:

```bash
source .venv/bin/activate
python training/train.py --epochs 15
```

This writes `suntology-model.pt` and `suntology-classes.json`. If those are missing, the API still accepts the legacy names `suncheck-model.pt` and `suncheck-classes.json`. Older setups may use `suncheck-dry-oily.pt` alone (two classes: dry, oily). Without any of these files, `/api/predict` returns an error until you add weights. Restart Flask after training.

## Credits

- Hackathon project for **PantherHacks 2026**.

## License

Respect upstream and dataset/model licenses where applicable.
