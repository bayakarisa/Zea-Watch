from app import app

print("Listing all routes:")
for rule in app.url_map.iter_rules():
    print(f"{rule} {rule.methods}")
