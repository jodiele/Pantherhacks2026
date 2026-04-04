"""Shared skin classification inference (EfficientNet-style model)."""
import os

import torch
import torchvision.transforms as T
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "skin-model-pokemon.pt")

SKIN_CLASSES = [
    "acanthosis-nigricans",
    "acne",
    "acne-scars",
    "alopecia-areata",
    "dry",
    "melasma",
    "oily",
    "vitiligo",
    "warts",
]

_model = None
_device = torch.device("cpu")
_transforms = None


def get_transforms():
    return T.Compose(
        [
            T.Resize((512, 512)),
            T.ToTensor(),
        ]
    )


def load_model():
    global _model, _transforms
    if _model is None:
        if not os.path.isfile(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
        # Full pickled module; newer PyTorch defaults weights_only=True.
        try:
            _model = torch.load(
                MODEL_PATH, map_location=_device, weights_only=False
            )
        except TypeError:
            _model = torch.load(MODEL_PATH, map_location=_device)
        _model.to(_device)
        _model.eval()
        _transforms = get_transforms()
    return _model, _transforms


def predict_image(pil_image: Image.Image) -> dict:
    """Run inference; returns label and per-class scores if available."""
    model, tr = load_model()
    img = pil_image.convert("RGB")
    tensor = tr(img).unsqueeze(0).to(_device)
    with torch.no_grad():
        out = model(tensor)
        probs = torch.softmax(out, dim=1)[0]
        idx = int(torch.argmax(probs).item())
        label = SKIN_CLASSES[idx]
        confidence = float(probs[idx].item())
    scores = {SKIN_CLASSES[i]: float(probs[i].item()) for i in range(len(SKIN_CLASSES))}
    return {"label": label, "confidence": confidence, "scores": scores}
