# Backend Inference API

This API serves model inference using `backend/models/best_model.pth`.

## Run locally

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r backend/requirements.txt
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- `GET /health`
- `POST /predict` (multipart field name: `file`)

## Frontend env

Set:

```bash
VITE_PREDICT_API_URL=http://localhost:8000
```
