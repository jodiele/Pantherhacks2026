# SunCheck · PantherHacks 2026

Sun safety companion: **live UV index**, **burn alerts**, optional **photo scan** (demo ML + warmth heuristic), **sun exposure** education, and **skin cancer awareness** links. **Not medical advice.**

## Features

- UV index from [Open-Meteo](https://open-meteo.com/) (location or coordinates)
- Burn-risk alerts tied to current UV
- React (Vite) frontend + Flask API with PyTorch image classifier (`skin-model-pokemon.pt`)
- Client-side “warmth” signal on photos (informal demo only)

## Run locally

**Backend** (Python 3.10+ recommended; from repo root):

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

API: `http://127.0.0.1:5000` — `GET /api/health`, `POST /api/predict` (multipart field `file` or `image`).

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`). The dev server proxies `/api` to the Flask app.

## Credits

- Hackathon project for **PantherHacks 2026**.
- Model and original Flask/skin-classification work inspired by [MahimaKhatri/Skin-Disease-Detection](https://github.com/MahimaKhatri/Skin-Disease-Detection).

## License

Respect upstream and dataset/model licenses where applicable.
