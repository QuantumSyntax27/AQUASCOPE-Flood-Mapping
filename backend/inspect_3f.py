import os

print("=== Phase 3F: Road Connectivity — Inspect ===")
print()

# List connectivity service
conn_path = r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\services\connectivity_service.py"
if os.path.exists(conn_path):
    print(f"  ✓ {conn_path} exists")
    with open(conn_path) as f:
        content = f.read()[:200]
    print(f"  First 200 chars: {content[:200]}")
else:
    print(f"  ✗ {conn_path} NOT found")

print()

# List API routes
api_path = r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\api"
if os.path.exists(api_path):
    files = [f for f in os.listdir(api_path) if f.endswith('.py')]
    print(f"  API files: {files}")
    
print()

# List test files
tests_path = r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\tests"
if os.path.exists(tests_path):
    files = [f for f in os.listdir(tests_path) if f.endswith('.py')]
    print(f"  Test files: {files}")