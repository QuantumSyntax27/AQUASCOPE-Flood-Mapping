import os
import re

print("=== Phase 3G: EMSR927 Validation — Inspect ===")
print()

# List validation service
val_path = r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\services\validation_service.py"
if os.path.exists(val_path):
    print(f"  ✓ {val_path} exists")
    with open(val_path) as f:
        content = f.read()
    lines = content.split('\n')
    for i, line in enumerate(lines[:80]):
        print(f"  {i+1}: {line}")
    print(f"  ... total lines: {len(lines)}")
else:
    print(f"  ✗ {val_path} NOT found")

print()

# Check EMSR927 reference data
emsr_path = r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\data"
if os.path.exists(emsr_path):
    emsr_files = [f for f in os.listdir(emsr_path) if 'emsr' in f.lower() or 'reference' in f.lower()]
    print(f"  EMSR/reference files: {emsr_files}")
else:
    print(f"  ✗ {emsr_path} directory NOT found")

print()

# Check results.py for validation-related classes
res_path = r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\schemas\results.py"
if os.path.exists(res_path):
    with open(res_path) as f:
        content = f.read()
    # Find validation-related classes
    matches = re.findall(r'class \w+.*:', content)
    print(f"  Schema classes with 'class': {matches}")
else:
    print(f"  ✗ {res_path} NOT found")