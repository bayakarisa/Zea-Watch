
import requests
import sys

BASE_URL = "http://localhost:5000/api"
EMAIL = "info@zeawatch.site"
PASSWORD = "ZeaWatch"

try:
    # 1. Login
    print(f"Logging in as {EMAIL}...")
    auth_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    
    if auth_resp.status_code != 200:
        print(f"❌ Login failed: {auth_resp.status_code} - {auth_resp.text}")
        sys.exit(1)
        
    token = auth_resp.json().get('access_token')
    if not token:
        print("❌ No access_token returned in login response")
        print(f"Response: {auth_resp.json()}")
        sys.exit(1)
        
    print("✅ Login successful. Token obtained.")
    
    # 2. Fetch Admin Stats
    print("Fetching admin stats...")
    headers = {"Authorization": f"Bearer {token}"}
    stats_resp = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
    
    if stats_resp.status_code == 200:
        print("\n✅ Admin Stats Retrieved Successfully:")
        print(stats_resp.json())
    else:
        print(f"❌ Failed to fetch stats: {stats_resp.status_code} - {stats_resp.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
