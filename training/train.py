#!/usr/bin/env python3
"""
Fine-tune a small classifier on data/<class_name>/*.jpg

Expects folders under ./data/ (e.g. data/dry/, data/oily/, data/sunburnt/).
ImageFolder uses alphabetical class order (e.g. dry, oily, sunburnt).

Usage (from repo root):
  source .venv/bin/activate
  python training/train.py --epochs 15

Output: suncheck-model.pt and suncheck-classes.json in repo root (see app/inference.py).
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, models, transforms

# Repo root (parent of training/)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA = os.path.join(ROOT, "data")
DEFAULT_OUT = os.path.join(ROOT, "suncheck-model.pt")
DEFAULT_CLASSES_JSON = os.path.join(ROOT, "suncheck-classes.json")

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
IMG_SIZE = 224


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=DEFAULT_DATA, help="ImageFolder root")
    ap.add_argument("--out", default=DEFAULT_OUT, help="Where to save model .pt")
    ap.add_argument(
        "--classes-json",
        default=DEFAULT_CLASSES_JSON,
        help="Where to save class names (same index order as training)",
    )
    ap.add_argument("--epochs", type=int, default=15)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--val-fraction", type=float, default=0.2)
    args = ap.parse_args()

    if not os.path.isdir(args.data):
        print(f"Missing data folder: {args.data}", file=sys.stderr)
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Device:", device)

    train_tf = transforms.Compose(
        [
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomAffine(degrees=10, translate=(0.05, 0.05)),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    val_tf = transforms.Compose(
        [
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )

    ds_train_view = datasets.ImageFolder(args.data, transform=train_tf)
    ds_val_view = datasets.ImageFolder(args.data, transform=val_tf)
    if len(ds_train_view.classes) < 2:
        print("Need at least 2 class folders under data/", file=sys.stderr)
        sys.exit(1)

    n_val = max(1, int(len(ds_train_view) * args.val_fraction))
    n_train = len(ds_train_view) - n_val
    g = torch.Generator().manual_seed(42)
    perm = torch.randperm(len(ds_train_view), generator=g).tolist()
    val_indices = perm[:n_val]
    train_indices = perm[n_val:]

    train_set = Subset(ds_train_view, train_indices)
    val_set = Subset(ds_val_view, val_indices)

    # Re-wrap train with augmentations (train_set already has train_tf from full)
    train_loader = DataLoader(
        train_set,
        batch_size=args.batch,
        shuffle=True,
        num_workers=0,
        pin_memory=device.type == "cuda",
    )
    val_loader = DataLoader(
        val_set,
        batch_size=args.batch,
        shuffle=False,
        num_workers=0,
        pin_memory=device.type == "cuda",
    )

    n_classes = len(ds_train_view.classes)
    print("Classes (index -> folder name):")
    for i, c in enumerate(ds_train_view.classes):
        print(f"  {i}: {c}")
    print()
    print("Inference loads class order from --classes-json next to the saved model.")

    weights = models.ResNet18_Weights.IMAGENET1K_V1
    model = models.resnet18(weights=weights)
    model.fc = nn.Linear(model.fc.in_features, n_classes)
    model = model.to(device)

    crit = nn.CrossEntropyLoss()
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)

    best_val = 0.0
    for epoch in range(args.epochs):
        model.train()
        train_loss = 0.0
        train_n = 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            logits = model(x)
            loss = crit(logits, y)
            loss.backward()
            opt.step()
            train_loss += loss.item() * x.size(0)
            train_n += x.size(0)

        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                pred = model(x).argmax(dim=1)
                correct += (pred == y).sum().item()
                total += y.size(0)
        val_acc = correct / max(1, total)
        print(
            f"Epoch {epoch + 1}/{args.epochs}  "
            f"train_loss={train_loss / max(1, train_n):.4f}  val_acc={val_acc:.3f}",
        )
        if val_acc >= best_val:
            best_val = val_acc
            torch.save(model.cpu(), args.out)
            model.to(device)
            with open(args.classes_json, "w", encoding="utf-8") as f:
                json.dump({"classes": list(ds_train_view.classes)}, f, indent=2)

    print()
    print(f"Saved best checkpoint to: {args.out}")
    print(f"Saved class list to: {args.classes_json}")
    print("Restart Flask; inference loads model + classes automatically when both exist.")


if __name__ == "__main__":
    main()
