#!/bin/bash
# ZeaWatch Environment Setup Script for Mac/Linux

echo "Setting up ZeaWatch environment files..."

# Create backend .env file
cat > backend/.env << 'EOF'
PORT=5000
SUPABASE_URL=https://pewotfzydxqilbxzsdl.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3dvdGZ6eWR4cWlsYnh6c2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTU1NTYsImV4cCI6MjA3NzY3MTU1Nn0.1-6QXux2uNOHB0Ay3L2epji7vFgyAbPuIsofm1rShgE
GEMINI_API_KEY=AIzaSyCcWrQw_JGUKPoSTmiy5fkFJ_TlGAu1b0w
UPLOAD_FOLDER=./static/uploads
MODEL_PATH=./models/hybrid_model.pth
EOF

echo "✅ Created backend/.env"

# Create frontend .env.local file
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://pewotfzydxqilbxzsdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3dvdGZ6eWR4cWlsYnh6c2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTU1NTYsImV4cCI6MjA3NzY3MTU1Nn0.1-6QXux2uNOHB0Ay3L2epji7vFgyAbPuIsofm1rShgE
EOF

echo "✅ Created frontend/.env.local"
echo ""
echo "🎉 Environment files created successfully!"
echo ""
echo "Next steps:"
echo "1. Set up your Supabase database (see QUICK_START.md)"
echo "2. Install dependencies: cd frontend && npm install"
echo "3. Install backend dependencies: cd backend && pip install -r requirements.txt"
echo "4. Start the servers!"

