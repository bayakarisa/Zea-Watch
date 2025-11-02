# ZeaWatch Quick Start Guide

## ✅ Your API Keys Are Ready!

I've noted your API keys. Here's how to set them up:

## 📝 Step 1: Create Backend .env File

Create a file named `.env` in the `backend/` directory with these contents:

```env
PORT=5000
SUPABASE_URL=https://pewotfzydxqilbxzsdl.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3dvdGZ6eWR4cWlsYnh6c2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTU1NTYsImV4cCI6MjA3NzY3MTU1Nn0.1-6QXux2uNOHB0Ay3L2epji7vFgyAbPuIsofm1rShgE
GEMINI_API_KEY=AIzaSyCcWrQw_JGUKPoSTmiy5fkFJ_TlGAu1b0w
UPLOAD_FOLDER=./static/uploads
MODEL_PATH=./models/hybrid_model.pth
```

## 📝 Step 2: Create Frontend .env.local File

Create a file named `.env.local` in the `frontend/` directory with these contents:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://pewotfzydxqilbxzsdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3dvdGZ6eWR4cWlsYnh6c2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTU1NTYsImV4cCI6MjA3NzY3MTU1Nn0.1-6QXux2uNOHB0Ay3L2epji7vFgyAbPuIsofm1rShgE
```

## 🗄️ Step 3: Set Up Supabase Database

1. Go to your Supabase project: https://supabase.com/dashboard/project/pewotfzydxqilbxzsdl
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL from `database/schema.sql`:

```sql
-- Create analyses table
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

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations" ON analyses
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

5. Click **Run** to execute the query

## 🚀 Step 4: Install Dependencies

### Frontend:
```bash
cd frontend
npm install
```

### Backend:
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

## ▶️ Step 5: Run the Application

### Terminal 1 - Start Backend:
```bash
cd backend
# Activate venv if not already active
python app.py
```

Backend should start on `http://localhost:5000`

### Terminal 2 - Start Frontend:
```bash
cd frontend
npm run dev
```

Frontend should start on `http://localhost:3000`

## 🎯 Step 6: Test the Application

1. Open `http://localhost:3000` in your browser
2. You should see the ZeaWatch landing page
3. Try uploading a test image (any image will work for testing)
4. Wait for the AI analysis to complete
5. Check the Scan History to see your results

## ✅ Verification Checklist

- [ ] Backend .env file created with your API keys
- [ ] Frontend .env.local file created with your API keys
- [ ] Supabase database table created (run SQL schema)
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000

## 🐛 Troubleshooting

### Backend won't start:
- Check that Python virtual environment is activated
- Verify all dependencies are installed
- Check that `.env` file exists in `backend/` directory

### Frontend won't start:
- Run `npm install` again
- Check that `.env.local` file exists in `frontend/` directory
- Clear Next.js cache: `rm -rf .next` (or `rmdir /s .next` on Windows)

### Database errors:
- Verify Supabase table was created successfully
- Check that API keys are correct
- The app will fall back to in-memory storage if Supabase fails

### Gemini API errors:
- Verify your Gemini API key is correct
- Check API quota limits
- The app will use fallback descriptions if Gemini fails

## 🎉 You're All Set!

Your ZeaWatch application is now configured with your API keys. Start both servers and begin analyzing maize leaf images!

