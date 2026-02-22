import modal
import io
import base64

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch",
        "torchvision",
        "timm",
        "Pillow",
        "fastapi[standard]",
    )
)

app = modal.App("root-doctor", image=image)

volume = modal.Volume.from_name("model-weights", create_if_missing=True)
MODEL_DIR = "/model"

CLASS_NAMES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]


@app.cls(
    gpu="T4",
    volumes={MODEL_DIR: volume},
    scaledown_window=300,
)
@modal.concurrent(max_inputs=10)
class RootDoctorModel:

    @modal.enter()
    def load_model(self):
        import torch
        import timm

        model_path = f"{MODEL_DIR}/best_model.pth"
        checkpoint = torch.load(model_path, map_location="cuda", weights_only=False)

        model_name = checkpoint.get("model_name", "tf_efficientnetv2_s")
        num_classes = len(checkpoint.get("class_to_idx", CLASS_NAMES))
        img_size = checkpoint.get("img_size", 224)

        self.model = timm.create_model(
            model_name, pretrained=False, num_classes=num_classes
        )
        self.model.load_state_dict(checkpoint["state_dict"])
        self.model.eval()
        self.model.cuda()

        # Build class_names list ordered by index from checkpoint
        class_to_idx = checkpoint.get("class_to_idx")
        if class_to_idx:
            self.class_names = [None] * len(class_to_idx)
            for name, idx in class_to_idx.items():
                self.class_names[idx] = name
        else:
            self.class_names = CLASS_NAMES

        from torchvision import transforms
        self.transform = transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        print(f"Model loaded — {model_name}, {len(self.class_names)} classes, {img_size}px on GPU")

    @modal.fastapi_endpoint(method="POST")
    async def predict(self, request: dict):
        import torch
        from PIL import Image

        try:
            image_data = request.get("image")
            if not image_data:
                return {"error": "No image provided"}, 400

            if "," in image_data:
                image_data = image_data.split(",")[1]

            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            input_tensor = self.transform(image).unsqueeze(0).cuda()

            with torch.no_grad():
                outputs = self.model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted_class = torch.max(probabilities, 1)

            prediction = self.class_names[predicted_class.item()]
            confidence_score = confidence.item()

            top3_probs, top3_indices = torch.topk(probabilities, 3, dim=1)
            top3 = [
                {"label": self.class_names[idx.item()], "prob": round(prob.item(), 4)}
                for prob, idx in zip(top3_probs[0], top3_indices[0])
            ]

            return {
                "prediction": prediction,
                "confidence": round(confidence_score, 4),
                "top3": top3,
                "all_probabilities": {
                    name: round(prob, 4)
                    for name, prob in zip(self.class_names, probabilities[0].tolist())
                },
            }

        except Exception as e:
            return {"error": str(e)}, 500


@app.function(volumes={MODEL_DIR: volume})
def upload_model(model_bytes: bytes):
    with open(f"{MODEL_DIR}/best_model.pth", "wb") as f:
        f.write(model_bytes)
    volume.commit()
    print(f"Model uploaded to {MODEL_DIR}/best_model.pth")
