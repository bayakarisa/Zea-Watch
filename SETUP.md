# ZeaWatch Setup Guide

Complete setup instructions for the ZeaWatch AI-powered maize disease detection application.

## Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+
- **Supabase account** (free tier works) or use in-memory storage for development
- **Google Gemini API key** (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Step 1: Clone and Setup

```bash
cd Zea-Watch
```

## Step 2: Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 3: Backend Setup

```bash
cd ../backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the backend directory:
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
UPLOAD_FOLDER=./static/uploads
MODEL_PATH=./models/hybrid_model.pth
```

## Step 4: Database Setup (Supabase)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disease VARCHAR(100) NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
```

3. Copy your project URL and API keys from Supabase Settings → API

## Step 5: Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your backend `.env` file as `GEMINI_API_KEY`

## Step 6: Running the Application

### Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python app.py
```

Backend will run on `http://localhost:5000`

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

## Step 7: Testing

1. Open `http://localhost:3000` in your browser
2. Upload a maize leaf image (or any test image)
3. Wait for analysis results
4. Check scan history

## Troubleshooting

### Backend Issues

- **Import errors**: Make sure you activated the virtual environment
- **Gemini API errors**: Verify your API key is correct
- **Database errors**: If Supabase isn't configured, the app falls back to in-memory storage

### Frontend Issues

- **API connection errors**: Make sure backend is running on port 5000
- **Build errors**: Run `npm install` again

### Model Issues

- The app uses pretrained models from Hugging Face/TorchVision
- First run may download models (can take a few minutes)
- If models fail to load, the app uses fallback predictions

## Development Notes

- Uploaded images are stored in `backend/static/uploads/`
- Without Supabase, history is stored in memory (lost on restart)
- AI models are loaded on first prediction (may take 10-30 seconds)

## Production Deployment

1. Set up production environment variables
2. Use a production database (Supabase or PostgreSQL)
3. Deploy backend to a service like Heroku, Railway, or AWS
4. Deploy frontend to Vercel or Netlify
5. Update API URLs in frontend `.env`

