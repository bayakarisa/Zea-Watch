
import os
import sys
from dotenv import load_dotenv

# Add parent dir to path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env vars
load_dotenv()

try:
    from services.supabase_service import SupabaseService
    import services.supabase_service
    print(f"Imported SupabaseService from: {services.supabase_service.__file__}")
    
    print("Initializing SupabaseService...")
    service = SupabaseService()
    
    print("Fetching admin stats...")
    stats = service.get_admin_stats()
    
    print("\n--- Admin Stats Results ---")
    for key, value in stats.items():
        print(f"{key}: {value}")
        
    if stats.get('total_predictions', 0) > 0:
        print("\n[SUCCESS] Found predictions/analyses!")
    else:
        print("\n[WARNING] Still showing 0 predictions. Check if 'analyses' table is actually populated.")

except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
