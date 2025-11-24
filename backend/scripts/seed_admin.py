import os
import sys
import asyncio
from dotenv import load_dotenv

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env vars BEFORE importing services that might use them at module level
load_dotenv()

from services.supabase_service import SupabaseService
from services.auth_service import AuthService

def seed_admin():
    """Seed the initial admin user"""
    
    print("🌱 Seeding admin account...")
    
    email = "info@zeawatch.site"
    password = "ZeaWatch"  # Initial password
    
    db_service = SupabaseService()
    auth_service = AuthService()
    
    # Check if admin already exists
    if db_service.email_exists(email):
        print(f"⚠️  Admin user {email} already exists.")
        return
    
    # Hash password
    password_hash = auth_service.hash_password(password)
    
    # Create user
    try:
        user = db_service.create_user(
            name="ZeaWatch Admin",
            email=email,
            password_hash=password_hash,
            role="admin",
            preferred_language="en"
        )
        
        if user:
            # Verify the user immediately
            db_service.update_user(str(user['id']), verified=True)
            print(f"✅ Admin user created successfully!")
            print(f"📧 Email: {email}")
            print(f"🔑 Password: {password}")
            print("⚠️  IMPORTANT: Change this password immediately after login!")
        else:
            print("❌ Failed to create admin user.")
            
    except Exception as e:
        print(f"❌ Error seeding admin: {e}")

if __name__ == "__main__":
    seed_admin()
