import re

with open(r'C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\services\validation_service.py', 'r') as f:
    src = f.read()

# Replace the problematic line
src = src.replace(
    'overlap_km2 if "overlap_km2" in dir() else 0.0',
    'overlap_km2 if overlap_km2 is not None else 0.0'
)

with open(r'C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\services\validation_service.py', 'w') as f:
    f.write(src)
print('Fixed')