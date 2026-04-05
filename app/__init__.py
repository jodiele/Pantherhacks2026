import os

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
app.config["UPLOAD_PATH"] = os.path.join(os.path.dirname(__file__), "static", "uploads")
os.makedirs(app.config["UPLOAD_PATH"], exist_ok=True)

CORS(app, resources={r"/api/*": {"origins": "*"}})

from app import routes  # noqa: E402
