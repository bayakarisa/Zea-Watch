
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("Checking 'analyses' table count...")
try:
    res = supabase.table('analyses').select('id', count='exact').execute()
    count = res.count if hasattr(res, 'count') else len(res.data)
    print(f"COUNT: {count}")
except Exception as e:
    print(f"ERROR: {e}")
