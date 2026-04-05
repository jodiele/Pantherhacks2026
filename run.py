import os
from pathlib import Path

from dotenv import load_dotenv

# Always load repo-root .env (works even if you start Python from another cwd).
_ROOT = Path(__file__).resolve().parent
load_dotenv(_ROOT / ".env")

from app import app

if __name__ == '__main__':
    # Default 5001: macOS often binds AirPlay to 5000 ("Address already in use").
    port = int(os.environ.get('PORT', '5001'))
    app.run(debug=True, port=port, host='127.0.0.1')
