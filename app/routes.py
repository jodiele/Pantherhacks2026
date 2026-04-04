import io

from flask import jsonify, request
from PIL import Image
from werkzeug.utils import secure_filename

from app import app
from app.inference import predict_image, load_model


@app.route("/api/health", methods=["GET"])
def health():
    try:
        load_model()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/predict", methods=["POST"])
def api_predict():
    f = request.files.get("file") or request.files.get("image")
    if not f or not getattr(f, "filename", None):
        return jsonify({"error": "No image file provided (use field name `file` or `image`)."}), 400

    try:
        data = f.read()
        if not data:
            return jsonify({"error": "Empty file."}), 400
        img = Image.open(io.BytesIO(data)).convert("RGB")
        result = predict_image(img)
        result["filename"] = secure_filename(f.filename) if f.filename else "upload"
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/", methods=["GET"])
def root():
    return jsonify(
        {
            "name": "Skintology API",
            "health": "/api/health",
            "predict": "POST /api/predict (multipart: file or image)",
        }
    )
