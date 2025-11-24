import sys
import os
from dotenv import load_dotenv
from services.supabase_service import SupabaseService

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

def check_user_history(email):
    db = SupabaseService()
    user = db.get_user_by_email(email)
    
    if not user:
        print(f"User {email} not found.")
        return

    print(f"User found: {user['id']}")
    
    history = db.get_user_analyses(user['id'])
    print(f"Found {len(history)} analyses for user.")
    
    for item in history[:5]:
        print(f"- {item.get('disease')} ({item.get('confidence')}%) - {item.get('created_at')}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = "info@zeawatch.site"
        
    check_user_history(email)
