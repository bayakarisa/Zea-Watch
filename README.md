# ZeaWatch - AI-Powered Maize Disease Detection

A full-stack web application for detecting maize leaf diseases using AI (CNN + Transformer hybrid) and Google Gemini API for descriptive insights.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (TypeScript), Tailwind CSS, shadcn/ui
- **Backend**: Flask (Python), AI models (CNN + Transformer), Gemini API
- **Database**: Supabase (PostgreSQL)

## 📁 Project Structure

```
zeawatch/
├── frontend/          # Next.js application
├── backend/           # Flask API server
├── .env              # Environment variables
└── README.md
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+
- Supabase account (or MongoDB)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`

### Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000

# Backend
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
UPLOAD_FOLDER=./backend/static/uploads
MODEL_PATH=./backend/models/hybrid_model.h5
```

## 🎯 Features

- ✅ Upload maize leaf images (drag-drop or camera)
- ✅ AI-powered disease detection
- ✅ Detailed disease descriptions via Gemini API
- ✅ Treatment recommendations
- ✅ Scan history tracking
- ✅ Clean, modern UI with soft green palette

## 📝 API Endpoints

- `POST /api/analyze` - Analyze a maize leaf image
- `GET /api/history` - Get scan history
- `DELETE /api/history/:id` - Delete a scan entry

## 🧠 AI Model

The application uses a hybrid approach:
- CNN (EfficientNet) for feature extraction
- Vision Transformer (ViT) for attention-based analysis
- Google Gemini API for natural language descriptions and recommendations

## 📄 License

See LICENSE file for details.

