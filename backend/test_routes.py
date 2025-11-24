import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

print("Registered Routes:")
for rule in app.url_map.iter_rules():
    print(f"{rule.endpoint}: {rule}")

print("\nChecking predict.analyze...")
found = False
for rule in app.url_map.iter_rules():
    if rule.endpoint == 'predict.analyze':
        print(f"✅ Found predict.analyze: {rule}")
        found = True
        break

if not found:
    print("❌ predict.analyze NOT FOUND")
