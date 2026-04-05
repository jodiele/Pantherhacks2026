import os

from app import app

if __name__ == '__main__':
    # Default 5001: macOS often binds AirPlay to 5000 ("Address already in use").
    port = int(os.environ.get('PORT', '5001'))
    app.run(debug=True, port=port, host='127.0.0.1')
