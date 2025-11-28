
import requests
import time
import sys

print("Waiting for server to start...")
time.sleep(3)

try:
    print("Testing /api/admin/stats...")
    # We need a token to access admin stats, but let's see if we get 401 (which means server is up) or connection error
    response = requests.get('http://localhost:5000/api/admin/stats')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 401:
        print("✅ Server is reachable (got 401 Unauthorized as expected without token)")
    elif response.status_code == 200:
        print("✅ Server is reachable and returned 200")
        print(response.json())
    else:
        print(f"⚠️  Server returned unexpected status: {response.status_code}")
        
except requests.exceptions.ConnectionError:
    print("❌ Could not connect to server. Is it running?")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
