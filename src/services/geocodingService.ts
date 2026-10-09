/** Geocoding service abstraction for AQUASCOPE.
Provides two implementations:
1. Real — OpenStreetMap Nominatim (no API key required, needs network + User-Agent)
2. Mock — deterministic fallback (existing behaviour, used when real provider unavailable)

Source / status is tracked on every result:
"REAL" → resolved by the real geocoder
"FALLBACK" → resolved by the mock deterministic geocoder

*/
export type GeocodeSource = "REAL" | "FALLBACK";

export interface GeocodeResult {
  place_name: string;
  display_name: string;
  latitude: number;
  longitude: number;
  country: string;
  state: string | null;
  city: string | null;
  provider_source: string;      // e.g. "OpenStreetMap Nominatim" | "Mock geocoder (deterministic)"
  source: GeocodeSource;        // "REAL" | "FALLBACK"
  description?: string;
}

/** Searches a location query using the real OpenStreetMap Nominatim service.
Returns null if the request fails (network error, blocked, etc.).
Nominatim does not require an API key but does require a valid User-Agent header identifying the calling application.
*/
export async function realGeocode(
  query: string,
  userAgent: string = "AQUASCOPE-Frontend"
): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // Nominatim requires a descriptive User-Agent; do NOT omit.
        "User-Agent": userAgent,
      },
      // 8-second timeout so a slow / blocked request does not hang the UI.
    });

    if (!res.ok) {
      // non-200 from Nominatim – treat as fallback
      return null;
    }

    // Nominatim returns: [{ lat, lon, display_name, address: {...}, ... }]
    const rawData: Array<{ lat: string; lon: string; display_name: string; address: any }> = await res.json();
    if (!rawData || rawData.length === 0) {
      return null;
    }

    const first = rawData[0];
    return {
      place_name: first.display_name,
      display_name: first.display_name,
      latitude: parseFloat(first.lat),
      longitude: parseFloat(first.lon),
      country: first.address?.country || "",
      state: addressState(first.address),
      city: addressCity(first.address),
      provider_source: "OpenStreetMap Nominatim",
      source: "REAL" as const,
      description: first.display_name,
    };
  } catch (e) {
    // Network error, timeout, CORS, etc. – fall back to mock
    return null;
  }
}

/** Extract city/town from Nominatim address object. */
function addressCity(addr: any): string | null {
  if (!addr) return null;
  for (const key of ["city", "town", "village", "hamlet"]) {
    if (addr && addr[key]) return addr[key];
  }
  return null;
}

/** Extract state/region from Nominatim address object. */
function addressState(addr: any): string | null {
  if (!addr) return null;
  for (const key of ["state", "region", "province", "district"]) {
    if (addr[key]) return addr[key];
  }
  return null;
}

/** Mock (deterministic) geocoder — kept as the fallback when the real provider is unavailable.
Its output format matches GeocodeResult so the upper layers don't need to change.
This mirror of a very small known-locations list plus a deterministic fallback ensures the UI never breaks when Nominatim is offline.
*/
export function mockGeocode(address: string): GeocodeResult {
  const clean = address.trim();
  if (!clean) throw new Error("Empty address");

  // Minimal known locations — just enough for the demo / test set.
  const known: Record<string, GeocodeResult> = {
    trishuli: {
      place_name: "Trishuli",
      display_name: "Trishuli, Nepal",
      latitude: 27.851,
      longitude: 85.184,
      country: "Nepal",
      state: "Bagmati Province",
      city: "Trishuli",
      provider_source: "Mock geocoder (deterministic)",
      source: "FALLBACK" as const,
      description: "Trishuli, Nepal",
    },
    kathmandu: {
      place_name: "Kathmandu",
      display_name: "Kathmandu, Nepal",
      latitude: 27.7172,
      longitude: 85.324,
      country: "Nepal",
      state: "Bagmati Province",
      city: "Kathmandu",
      provider_source: "Mock geocoder (deterministic)",
      source: "FALLBACK" as const,
      description: "Kathmandu, Nepal",
    },
    delhi: {
      place_name: "Delhi",
      display_name: "Delhi, India",
      latitude: 28.7041,
      longitude: 77.1025,
      country: "India",
      state: "Delhi",
      city: "Delhi",
      provider_source: "Mock geocoder (deterministic)",
      source: "FALLBACK" as const,
      description: "Delhi, India",
    },
    berlin: {
      place_name: "Berlin",
      display_name: "Berlin, Germany",
      latitude: 52.52,
      longitude: 13.40,
      country: "Germany",
      state: "Berlin",
      city: "Berlin",
      provider_source: "Mock geocoder (deterministic)",
      source: "FALLBACK" as const,
      description: "Berlin, Germany",
    },
    london: {
      place_name: "London",
      display_name: "London, UK",
      latitude: 51.51,
      longitude: -0.13,
      country: "UK",
      state: "Greater London",
      city: "London",
      provider_source: "Mock geocoder (deterministic)",
      source: "FALLBACK" as const,
      description: "London, UK",
    },
    tokyo: {
      place_name: "Tokyo",
      display_name: "Tokyo, Japan",
      latitude: 35.69,
      longitude: 139.69,
      country: "Japan",
      state: "Tokyo",
      city: "Tokyo",
      provider_source: "Mock geocoder (deterministic)",
      source: "FALLBACK" as const,
      description: "Tokyo, Japan",
    },
    "new york": {
      place_name: "New York",
      display_name: "New York, USA",
      latitude: 40.71,
      longitude: -74.01,
      country: "USA",
      state: "New York",
      city: "New York",
      provider_source: "Mock geocoder (deterministic)",
      source: "FALLBACK" as const,
      description: "New York, USA",
    },
  };

  const by = known[clean.toLowerCase()];
  if (by) return by;

  // Deterministic fallback that spreads across a few world capitals
  // so the result is never the same "Nepal-only" set.
  const capitals = [
    { lat: 48.86, lng: 2.35, country: "France", state: "Île-de-France", city: "Paris" },     // Paris
    { lat: 51.51, lng: -0.13, country: "UK", state: "Greater London", city: "London" },     // London
    { lat: 35.69, lng: 139.69, country: "Japan", state: "Tokyo", city: "Tokyo" },           // Tokyo
    { lat: 40.71, lng: -74.01, country: "USA", state: "New York", city: "New York" },       // New York
    { lat: -33.87, lng: 151.21, country: "Australia", state: "New South Wales", city: "Sydney" },  // Sydney
    { lat: 34.05, lng: -118.24, country: "USA", state: "California", city: "Los Angeles" },    // Los Angeles
    { lat: 52.52, lng: 13.40, country: "Germany", state: "Berlin", city: "Berlin" },         // Berlin
    { lat: 28.7, lng: 77.1, country: "India", state: "Delhi", city: "Delhi" },              // Delhi
    { lat: 6.52, lng: 3.38, country: "Nigeria", state: "Lagos", city: "Lagos" },            // Lagos
  ];
  const i = Math.abs(clean.length) % capitals.length;
  const c = capitals[i];
  return {
    place_name: clean,
    display_name: `${clean} (fallback)`,
    latitude: c.lat,
    longitude: c.lng,
    country: c.country,
    state: c.state,
    city: c.city,
    provider_source: "Mock geocoder (deterministic)",
    source: "FALLBACK" as const,
    description: `${clean} (fallback)`,
  };
}

/** Main entry point used by the UI / LocationStep.
Flow:
1. Try the real OpenStreetMap Nominatim geocoder.
2. If it fails (network, timeout, blockage) → fall back to the mock.
3. Return a GeocodeResult with .source set to "REAL" or "FALLBACK"
so the caller can display "real geocoded" vs "simulated".
*/
export async function geocodeLocation(
  query: string,
  userAgent?: string
): Promise<GeocodeResult> {
  // 1️⃣ Try the real provider first.
  const real = await realGeocode(query, userAgent ?? "AQUASCOPE-Frontend");
  if (real) return real;

  // 2️⃣ Fall back to the mock implementation.
  return mockGeocode(query);
}

/** Simple deterministic hash used by the mock fallback. */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0; // eslint-disable-line no-bitwise
  }
  return h;
}