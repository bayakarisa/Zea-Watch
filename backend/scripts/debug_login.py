import sys
import os
# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from services.supabase_service import SupabaseService

def check_user(email):
    print(f"Checking user: {email}")
    
    # Check env vars
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    anon_key = os.getenv('SUPABASE_KEY')
    print(f"SUPABASE_SERVICE_ROLE_KEY set: {'Yes' if service_key else 'No'}")
    print(f"SUPABASE_KEY set: {'Yes' if anon_key else 'No'}")
    
    if not service_key:
        print("⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Using SUPABASE_KEY (anon) which enforces RLS.")

    db = SupabaseService()
    
    # Test Insert
    import uuid
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    print(f"\nAttempting to insert test user: {test_email}")
    try:
        new_user = db.create_user(
            name="Test User",
            email=test_email,
            password_hash="hash",
            role="user"
        )
        print(f"✅ Insert success: {new_user}")
    except Exception as e:
        print(f"❌ Insert failed: {e}")



if __name__ == "__main__":
    email = "josephbaya9648@gmail.com"
    check_user(email)
