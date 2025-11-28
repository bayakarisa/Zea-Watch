
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found in environment variables.")
    exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Connected to Supabase: {SUPABASE_URL}")

    # 1. Check 'analyses' table count
    print("\nChecking 'analyses' table...")
    response = supabase.table('analyses').select('id', count='exact').execute()
    count = response.count if hasattr(response, 'count') else len(response.data)
    print(f"Total rows in 'analyses': {count}")

    # 2. Check 'predictions' table count (should be 0 or unused)
    print("\nChecking 'predictions' table...")
    try:
        response = supabase.table('predictions').select('id', count='exact').execute()
        p_count = response.count if hasattr(response, 'count') else len(response.data)
        print(f"Total rows in 'predictions': {p_count}")
    except Exception as e:
        print(f"Error checking 'predictions': {e}")

    # 3. Test get_admin_stats logic
    print("\nTesting get_admin_stats logic...")
    stats = {}
    
    # Users
    users = supabase.table('users').select('id', count='exact').execute()
    stats['total_users'] = users.count
    
    # Uploads
    uploads = supabase.table('uploads').select('id', count='exact').execute()
    stats['total_uploads'] = uploads.count
    
    # Predictions (using analyses)
    preds = supabase.table('analyses').select('id', count='exact').execute()
    stats['total_predictions'] = preds.count
    
    print("Calculated Stats:", stats)

    # 4. Check 'audit_logs' table
    print("\nChecking 'audit_logs' table...")
    try:
        audit = supabase.table('audit_logs').select('id', count='exact').limit(1).execute()
        print(f"Audit logs table exists. Count: {audit.count}")
    except Exception as e:
        print(f"Error checking 'audit_logs': {e}")

except Exception as e:
    print(f"\nError: {e}")
