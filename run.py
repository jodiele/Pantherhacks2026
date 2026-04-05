import os
from pathlib import Path

from dotenv import load_dotenv

# Load env: this folder first (same directory as run.py), then parent folder (e.g. Skintology/.env
# when the repo lives in skin-disease-detection-inspo/). Parent only fills vars not already set.
_ROOT = Path(__file__).resolve().parent
load_dotenv(_ROOT / ".env")
load_dotenv(_ROOT.parent / ".env", override=False)

from app import app

if __name__ == '__main__':
    # Default 5001: macOS often binds AirPlay to 5000 ("Address already in use").
    port = int(os.environ.get('PORT', '5001'))
    app.run(debug=True, port=port, host='127.0.0.1')
