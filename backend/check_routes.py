
import requests
import time
import sys
import json

print("Waiting for server to start...")
time.sleep(3)

try:
    print("Fetching routes from /api/debug/routes...")
    response = requests.get('http://localhost:5000/api/debug/routes')
    
    if response.status_code == 200:
        data = response.json()
        print("\n--- Registered Routes ---")
        for route in sorted(data.get('routes', [])):
            print(route)
            
        # Check specifically for admin stats
        if any('/api/admin/stats' in r for r in data.get('routes', [])):
            print("\n✅ FOUND: /api/admin/stats is registered!")
        else:
            print("\n❌ MISSING: /api/admin/stats is NOT in the list!")
    else:
        print(f"❌ Failed to get routes. Status: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"❌ Error: {e}")
