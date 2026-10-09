"""Test Phase 3C Flood Detection Service structure"""
import sys
import importlib.util
import os

# Test directly without full package import
mod_path = r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\services\flood_segmentation_service.py"
spec = importlib.util.spec_from_file_location("flood_seg", mod_path)
mod = importlib.util.module_from_spec(spec)

# Read the file and check key classes exist
with open(mod_path, 'r') as f:
    content = f.read()

# Check for key classes
checks = [
    "class FloodDetectionService:",
    "class MockFloodDetectionService:",
    "class FloodSegmentationResult:",
    "def detect_flood",
    "_try_load_model",
    "_real_detect_flood",
    "_mock_detect_flood",
]

print("Checking flood_segmentation_service.py structure...")
for check in checks:
    if check in content:
        print(f"  OK: {check}")
    else:
        print(f"  MISSING: {check}")

print()

# Check for key methods
methods = [
    "__init__",
    "detect_flood",
    "_try_load_model",
    "_real_detect_flood",
    "_mock_detect_flood",
]

print("Checking key methods:")
for m in methods:
    if f"    def {m}" in content or f"def {m}" in content:
        print(f"  OK: {m}")
    else:
        print(f"  MISSING: {m}")

print()
print("All structural checks complete")