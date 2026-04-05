import io

from flask import jsonify, request
from PIL import Image
from werkzeug.utils import secure_filename

from app import app
from app.chat_assistant import run_chat, sanitize_messages
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


@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    JSON body: { "messages": [...], "scan_context": { ... } }

    LLM env (first match wins): MISTRAL_API_KEY + optional MISTRAL_AGENT_ID (Mistral Agents beta
    POST /v1/conversations), or MISTRAL_API_KEY alone (chat completions, MISTRAL_MODEL default
    mistral-small-latest), or OPENAI_API_KEY. Without keys, returns demo replies.
    Optional: MISTRAL_AGENT_VERSION (default 0).
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Expected JSON object body."}), 400

    messages, err = sanitize_messages(data.get("messages"))
    if err:
        return jsonify({"error": err}), 400

    scan_context = data.get("scan_context")
    if scan_context is not None and not isinstance(scan_context, dict):
        return jsonify({"error": "scan_context must be an object if provided."}), 400
    ctx = scan_context if isinstance(scan_context, dict) else {}

    reply = run_chat(ctx, messages)
    return jsonify({"reply": reply})


@app.route("/", methods=["GET"])
def root():
    return jsonify(
        {
            "name": "Skintology API",
            "health": "/api/health",
            "predict": "POST /api/predict (multipart: file or image)",
            "chat": "POST /api/chat (JSON: messages, scan_context)",
        }
    )
