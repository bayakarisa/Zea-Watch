import os
import socket
import sys
from dotenv import load_dotenv
from supabase import create_client
import google.generativeai as genai

# Load env vars
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

def test_dns(hostname, name):
    print(f"Testing DNS for {name} ({hostname})...")
    try:
        ip = socket.gethostbyname(hostname)
        print(f"[OK] Resolved {hostname} to {ip}")
        return True
    except Exception as e:
        print(f"[FAIL] Failed to resolve {hostname}: {e}")
        return False

def test_supabase():
    print("\n--- Testing Supabase Connection ---")
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
    
    if not url:
        print("[FAIL] SUPABASE_URL not found in environment")
        return
    
    print(f"SUPABASE_URL found (length={len(url)})")
    
    # Extract hostname
    try:
        hostname = url.replace('https://', '').replace('http://', '').split('/')[0]
        if not hostname:
             print(f"[FAIL] Could not extract hostname from URL: {url}")
             return

        if not test_dns(hostname, "Supabase"):
            return
    except Exception as e:
        print(f"[FAIL] Could not parse Supabase URL: {e}")
        return

    try:
        client = create_client(url, key)
        # Try a simple select
        res = client.table('users').select('count', count='exact').limit(1).execute()
        print("[OK] Supabase connection successful")
    except Exception as e:
        print(f"[FAIL] Supabase connection failed: {e}")

def test_gemini():
    print("\n--- Testing Gemini Connection ---")
    key = os.getenv('GEMINI_API_KEY')
    if not key:
        print("[FAIL] GEMINI_API_KEY not found in environment")
        return

    # Hostname for Gemeni is usually generativelanguage.googleapis.com
    if not test_dns("generativelanguage.googleapis.com", "Gemini API"):
        return

    try:
        genai.configure(api_key=key)
        models = genai.list_models()
        first_model = next(models, None)
        if first_model:
            print(f"[OK] Gemini connection successful (Found model: {first_model.name})")
        else:
            print("[WARN] Gemini connected but returned no models")
    except Exception as e:
        print(f"[FAIL] Gemini connection failed: {e}")

if __name__ == "__main__":
    print("Starting Connectivity Debug...")
    test_supabase()
    test_gemini()
    print("\nDone.")
