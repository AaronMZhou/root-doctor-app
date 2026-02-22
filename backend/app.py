import io
import os
from typing import Dict, List

import timm
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import transforms


DEVICE = torch.device("cpu")

app = FastAPI(title="CropGuard Inference API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_checkpoint_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    requested = os.getenv("MODEL_CHECKPOINT_PATH")

    candidates = [
        requested,
        os.path.join(base_dir, "models", "best_model.pth"),
        os.path.join(os.getcwd(), "models", "best_model.pth"),
        os.path.join(os.getcwd(), "backend", "models", "best_model.pth"),
    ]

    # Check absolute path candidates first, then try cwd-relative expansions.
    resolved_candidates: List[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        if os.path.isabs(candidate):
            resolved_candidates.append(candidate)
        else:
            resolved_candidates.append(candidate)
            resolved_candidates.append(os.path.join(os.getcwd(), candidate))

    seen = set()
    for candidate in resolved_candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if os.path.exists(candidate):
            return candidate

    debug_paths = ", ".join(seen)
    raise FileNotFoundError(f"Checkpoint not found. Checked: {debug_paths}")


CHECKPOINT_PATH = _resolve_checkpoint_path()


def _load_checkpoint() -> Dict:
    checkpoint = torch.load(CHECKPOINT_PATH, map_location=DEVICE)
    if not isinstance(checkpoint, dict):
        raise ValueError("Checkpoint format is invalid (expected dict).")
    return checkpoint


checkpoint = _load_checkpoint()
model_name = checkpoint.get("model_name", "tf_efficientnetv2_s")
class_to_idx = checkpoint.get("class_to_idx", {})
img_size = int(checkpoint.get("img_size", 224))
num_classes = len(class_to_idx)
idx_to_class = {idx: label for label, idx in class_to_idx.items()}

if num_classes == 0:
    raise ValueError("class_to_idx is missing in checkpoint.")

model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
model.load_state_dict(checkpoint["state_dict"], strict=True)
model.to(DEVICE)
model.eval()

preprocess = transforms.Compose(
    [
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


@app.get("/health")
def health():
    return {"ok": True, "model": model_name, "classes": num_classes, "imgSize": img_size}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")

    try:
        raw = await file.read()
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {exc}") from exc

    tensor = preprocess(image).unsqueeze(0).to(DEVICE)

    with torch.inference_mode():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    top_k = min(3, num_classes)
    top_probs, top_indices = torch.topk(probs, k=top_k)

    top3: List[Dict] = []
    for p, idx in zip(top_probs.tolist(), top_indices.tolist()):
        label = idx_to_class.get(int(idx))
        if label is None:
            continue
        top3.append({"label": label, "prob": round(float(p), 3)})

    if not top3:
        raise HTTPException(status_code=500, detail="Model produced no valid predictions.")

    predicted = top3[0]
    return {
        "predictedLabel": predicted["label"],
        "confidence": predicted["prob"],
        "top3": top3,
        "modelVersion": f"{model_name}-best_model.pth",
    }
