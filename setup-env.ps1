# ZeaWatch Environment Setup Script for Windows PowerShell

Write-Host "Setting up ZeaWatch environment files..." -ForegroundColor Green

# Create backend .env file
$backendEnv = @"
PORT=5000
SUPABASE_URL=https://pewotfzydxqilbxzsdl.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3dvdGZ6eWR4cWlsYnh6c2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTU1NTYsImV4cCI6MjA3NzY3MTU1Nn0.1-6QXux2uNOHB0Ay3L2epji7vFgyAbPuIsofm1rShgE
GEMINI_API_KEY=AIzaSyCcWrQw_JGUKPoSTmiy5fkFJ_TlGAu1b0w
UPLOAD_FOLDER=./static/uploads
MODEL_PATH=./models/hybrid_model.pth
"@

$backendEnv | Out-File -FilePath "backend\.env" -Encoding utf8
Write-Host "✅ Created backend/.env" -ForegroundColor Green

# Create frontend .env.local file
$frontendEnv = @"
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://pewotfzydxqilbxzsdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3dvdGZ6eWR4cWlsYnh6c2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTU1NTYsImV4cCI6MjA3NzY3MTU1Nn0.1-6QXux2uNOHB0Ay3L2epji7vFgyAbPuIsofm1rShgE
"@

$frontendEnv | Out-File -FilePath "frontend\.env.local" -Encoding utf8
Write-Host "✅ Created frontend/.env.local" -ForegroundColor Green

Write-Host "`n🎉 Environment files created successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Set up your Supabase database (see QUICK_START.md)" -ForegroundColor White
Write-Host "2. Install dependencies: cd frontend && npm install" -ForegroundColor White
Write-Host "3. Install backend dependencies: cd backend && pip install -r requirements.txt" -ForegroundColor White
Write-Host "4. Start the servers!" -ForegroundColor White

