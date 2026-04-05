"""Shared skin classification inference (EfficientNet-style model)."""
import json
import os

import torch
import torchvision.transforms as T
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_BUNDLE_PT = os.path.join(BASE_DIR, "suncheck-model.pt")
_BUNDLE_JSON = os.path.join(BASE_DIR, "suncheck-classes.json")
_LEGACY_TWOCLASS_PT = os.path.join(BASE_DIR, "suncheck-dry-oily.pt")
_LEGACY_PT = os.path.join(BASE_DIR, "skin-model-pokemon.pt")

LEGACY_SKIN_CLASSES = [
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

# Custom fine-tuned ResNet18: 224px + ImageNet norm. Prefer model + classes json from train.py.
if os.path.isfile(_BUNDLE_PT) and os.path.isfile(_BUNDLE_JSON):
    MODEL_PATH = _BUNDLE_PT
    _USE_CUSTOM = True
    with open(_BUNDLE_JSON, encoding="utf-8") as _f:
        SKIN_CLASSES = json.load(_f)["classes"]
elif os.path.isfile(_LEGACY_TWOCLASS_PT):
    MODEL_PATH = _LEGACY_TWOCLASS_PT
    _USE_CUSTOM = True
    SKIN_CLASSES = ["dry", "oily"]
else:
    MODEL_PATH = _LEGACY_PT
    _USE_CUSTOM = False
    SKIN_CLASSES = LEGACY_SKIN_CLASSES

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

_model = None
_device = torch.device("cpu")
_transforms = None


def get_transforms():
    if _USE_CUSTOM:
        return T.Compose(
            [
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
            ]
        )
    return T.Compose(
        [
            T.Resize((512, 512)),
            T.ToTensor(),
        ]
    )


def warmth_hint_value(pil_image: Image.Image) -> float:
    """Rough red-channel excess in [0, 1] — demo only, not clinical."""
    img = pil_image.convert("RGB")
    w, h = img.size
    tw = 128
    th = max(1, int(h * (tw / w)))
    img = img.resize((tw, th), Image.Resampling.BILINEAR)
    total = 0.0
    n = 0
    for r, g, b in img.getdata():
        rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
        excess = max(0.0, rf - (gf + bf) / 2.0)
        total += excess
        n += 1
    if not n:
        return 0.0
    return min(1.0, (total / n) * 2.0)


def moisture_hint_from_scores(scores: dict) -> str:
    """Prefer oily vs dry probabilities; 2-class softmax sums to 1 so use margin for 'unclear'."""
    oily = float(scores.get("oily", 0))
    dry = float(scores.get("dry", 0))
    if len(scores) == 2 and "oily" in scores and "dry" in scores:
        if abs(oily - dry) < 0.15:
            return "unclear"
        return "oily" if oily > dry else "dry"
    if max(oily, dry) < 0.12:
        return "unclear"
    return "oily" if oily > dry else "dry"


def sunburn_degree_from_warmth(warmth: float) -> str:
    """Bucket warmth into a simple demo label — not real burn staging."""
    if warmth < 0.18:
        return "none"
    if warmth < 0.30:
        return "mild"
    if warmth < 0.44:
        return "moderate"
    return "severe"


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
    """Run classifier + demo summaries for moisture (oily/dry) and sun color hint."""
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
    warmth = warmth_hint_value(img)
    moisture_hint = moisture_hint_from_scores(scores)
    sunburn_degree = sunburn_degree_from_warmth(warmth)
    return {
        "label": label,
        "confidence": confidence,
        "scores": scores,
        "moisture_hint": moisture_hint,
        "sunburn_degree": sunburn_degree,
        "warmth_signal": warmth,
    }