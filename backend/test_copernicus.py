#!/usr/bin/env python
"""Test Copernicus Data Space API access."""
import httpx
import sys

try:
    r = httpx.get("https://sh.dataspace.copernicus.eu/api/v1/", timeout=10)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print("API is accessible!")
        # Try to search for scenes
        params = {
            "query": "Sentinel-1",
            "datetime": "2026-08-01/2026-08-31",
            "view": "product",
        }
        r2 = httpx.get(
            "https://sh.dataspace.copernicus.eu/api/v1/search",
            params=params,
            timeout=30,
        )
        print(f"Search Status: {r2.status_code}")
        if r2.status_code == 200:
            import json
            data = r2.json()
            print(f"Found {data.get('total', 0)} results")
            if data.get("features"):
                for feat in data["features"][:3]:
                    props = feat.get("properties", {})
                    print(f"  - {props.get('title', 'N/A')}")
                    print(f"    orbit: {props.get('relative_orbit', 'N/A')}")
                    print(f"    datetime: {props.get('datetime', 'N/A')}")
        else:
            print(f"Search response: {r2.text[:200]}")
    else:
        print(f"API returned: {r.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)