import os

# Read analysis_service.py focusing on the flood infrastructure intersection
with open(r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\app\services\analysis_service.py") as f:
    content = f.read()
lines = content.split('\n')

# Find the key sections: flooding, infrastructure, connectivity, validation
print("=== analysis_service.py: flood + infrastructure ===")
for i, line in enumerate(lines):
    if any(kw in line for kw in ['flooding', 'flood_mask', 'analyze_infrastructure', 'connectivity', 'flood.flood']):
        # Print surrounding context (3 lines before and after)
        start = max(0, i-3)
        end = min(len(lines), i+4)
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}")
        print()