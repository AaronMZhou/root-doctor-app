# SafeCrop

SafeCrop is a web app for vegetable leaf disease detection, result interpretation, and community outbreak awareness.

## Live App

- Frontend (Vercel): https://safecrop.vercel.app/

## Team

Team name: Convolutional Comprehensible Cannoneers
Members: Aaron Zhou, Hari Girish

## What SafeCrop Does

1. Lets users capture or upload a leaf image.
2. Runs disease prediction through a backend inference API.
3. Shows readable diagnosis labels, confidence, and top predictions.
4. Stores local scan history and insights.
5. Supports optional community sharing and map-based outbreak visibility.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- Mapping: Leaflet + React Leaflet
- Auth/Data/Storage/Realtime: Supabase
- Inference API: FastAPI + PyTorch + timm + torchvision

## Project Structure

```text
.
|-- src/                 # Frontend app
|-- backend/             # FastAPI inference service + model checkpoint
|-- supabase/            # Supabase config and SQL migrations
|-- public/              # Static assets (favicon, etc.)
|-- package.json         # Frontend scripts and dependencies
```

## Local Development

### 1) Frontend

```bash
npm install
npm run dev
```

### 2) Backend

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r backend/requirements.txt
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

### 3) Connect frontend to backend

Set this in `.env` (or `.env.local`):

```bash
VITE_PREDICT_API_URL=http://localhost:8000
```

If `VITE_PREDICT_API_URL` is missing or unreachable, the frontend falls back to mock prediction logic.

## Deployment Notes

1. Deploy frontend to Vercel.
2. Deploy backend API separately (for example Render/Modal/Fly/Railway).
3. In Vercel environment variables, set:

```bash
VITE_PREDICT_API_URL=https://your-backend-url
```

## Model Inference

- Model checkpoint path in repo: `backend/models/best_model.pth`
- Backend entrypoint: `backend/app.py`
- Endpoints: `GET /health`, `POST /predict`
