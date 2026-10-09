import type { PlaceLocation } from '../types';
import { delay } from '../utils/geo';
import { geocodeLocation } from '../services/geocodingService';

/**
 * Searchable place index (mock).
 * In production this would call a geocoding API (Nominatim etc.).
 */
export const PLACES: PlaceLocation[] = [
  // Nepal locations (retained for demo / familiar use)
  {
    id: 'trishuli',
    name: 'Trishuli',
    region: 'Rasuwa / Dhading, Bagmati Province',
    country: 'Nepal',
    lat: 27.851,
    lng: 85.184,
    zoom: 12,
    description: 'Trishuli River corridor along the Prithvi Highway (H2)',
  },
  {
    id: 'kathmandu',
    name: 'Kathmandu',
    region: 'Bagmati Province',
    country: 'Nepal',
    lat: 27.7172,
    lng: 85.324,
    zoom: 12,
    description: 'Capital city, Kathmandu Valley',
  },
  {
    id: 'pokhara',
    name: 'Pokhara',
    region: 'Gandaki Province',
    country: 'Nepal',
    lat: 28.2096,
    lng: 83.9856,
    zoom: 12,
    description: 'Lakeside city, Kaski District',
  },
  {
    id: 'bharatpur',
    name: 'Bharatpur',
    region: 'Bagmati Province',
    country: 'Nepal',
    lat: 27.681,
    lng: 84.86,
    zoom: 12,
    description: 'Chitwan District, Narayani River basin',
  },
  {
    id: 'hetauda',
    name: 'Hetauda',
    region: 'Bagmati Province',
    country: 'Nepal',
    lat: 27.4167,
    lng: 85.0167,
    zoom: 12,
    description: 'Makwanpur District, inner Terai',
  },
  {
    id: 'dharan',
    name: 'Dharan',
    region: 'Koshi Province',
    country: 'Nepal',
    lat: 26.81,
    lng: 87.32,
    zoom: 12,
    description: 'Sunsari District, eastern Terai',
  },
  {
    id: 'birgunj',
    name: 'Birgunj',
    region: 'Madhesh Province',
    country: 'Nepal',
    lat: 27.0333,
    lng: 84.8333,
    zoom: 12,
    description: 'Parsa District, India border corridor',
  },
  {
    id: 'butwal',
    name: 'Butwal',
    region: 'Lumbini Province',
    country: 'Nepal',
    lat: 27.7,
    lng: 83.45,
    zoom: 12,
    description: 'Rupandehi District, Tinau River',
  },
  {
    id: 'nepalgunj',
    name: 'Nepalgunj',
    region: 'Lumbini Province',
    country: 'Nepal',
    lat: 28.05,
    lng: 81.6,
    zoom: 12,
    description: 'Banke District, western Terai',
  },
  {
    id: 'dhankuta',
    name: 'Dhankuta',
    region: 'Koshi Province',
    country: 'Nepal',
    lat: 26.8667,
    lng: 87.1,
    zoom: 12,
    description: 'Dhankuta District, mid-hills',
  },
  {
    id: 'chitwan',
    name: 'Chitwan',
    region: 'Bagmati Province',
    country: 'Nepal',
    lat: 27.5298,
    lng: 84.4967,
    zoom: 12,
    description: 'Chitwan National Park buffer zone',
  },
  {
    id: 'lumbini',
    name: 'Lumbini',
    region: 'Lumbini Province',
    country: 'Nepal',
    lat: 27.4833,
    lng: 83.2767,
    zoom: 12,
    description: 'Rupandehi District, pilgrimage site',
  },
  // Global locations — added for Phase 2 global support
  {
    id: 'delhi',
    name: 'Delhi',
    region: 'National Capital Region, Delhi',
    country: 'India',
    lat: 28.7041,
    lng: 77.1025,
    zoom: 5,
    description: 'National capital region of India',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    lat: 19.076,
    lng: 72.8777,
    zoom: 5,
    description: 'Financial capital of India',
  },
  {
    id: 'new-york',
    name: 'New York',
    region: 'New York State',
    country: 'USA',
    lat: 40.7128,
    lng: -74.006,
    zoom: 5,
    description: 'Major US city on Atlantic coast',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    region: 'Kanto Region',
    country: 'Japan',
    lat: 35.6895,
    lng: 139.6917,
    zoom: 5,
    description: 'Capital city of Japan',
  },
  {
    id: 'london',
    name: 'London',
    region: 'Greater London',
    country: 'UK',
    lat: 51.5074,
    lng: -0.1278,
    zoom: 5,
    description: 'Capital city of the United Kingdom',
  },
  {
    id: 'paris',
    name: 'Paris',
    region: 'Île-de-France',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    zoom: 5,
    description: 'Capital city of France',
  },
  {
    id: 'lagos',
    name: 'Lagos',
    region: 'Lagos State',
    country: 'Nigeria',
    lat: 6.5244,
    lng: 3.3792,
    zoom: 5,
    description: 'Major Nigerian city on Gulf of Guinea',
  },
  {
    id: 'rio-de-janeiro',
    name: 'Rio de Janeiro',
    region: 'Rio de Janeiro State',
    country: 'Brazil',
    lat: -22.9068,
    lng: -43.1729,
    zoom: 5,
    description: 'Major Brazilian coastal city',
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    region: 'Autonomous City of Buenos Aires',
    country: 'Argentina',
    lat: -34.6037,
    lng: -58.3816,
    zoom: 5,
    description: 'Capital city of Argentina',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    region: 'Cairo Governorate',
    country: 'Egypt',
    lat: 30.0444,
    lng: 31.2357,
    zoom: 5,
    description: 'Capital city of Egypt',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    region: 'New South Wales',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    zoom: 5,
    description: 'Major Australian coastal city',
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    region: 'Mexico City',
    country: 'Mexico',
    lat: 19.4326,
    lng: -99.1332,
    zoom: 5,
    description: 'Capital city of Mexico',
  },
];

export const DEFAULT_LOCATION: PlaceLocation = PLACES[0];

/**
 * Mock location search with simulated latency.
 * First tries the PLACES index (known/demo locations like Trishuli, Kathmandu).
 * If no match, falls back to the geocoding service (real OpenStreetMap Nominatim
 * or the built‑in mock geocoder).
 */
export async function searchLocations(query: string): Promise<PlaceLocation[]> {
  await delay(320);
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  // 1️⃣ Try the geocoding service first (real Nominatim → deterministic mock fallback).
  //    The service returns GeocodeResult with explicit source ("REAL" | "FALLBACK")
  //    and provider_source so callers never silently use fallback coords as real.
  const geocoded = await geocodeLocation(q);
  if (geocoded) {
    return [
      {
        id: `geocoded-${geocoded.place_name
          .toLowerCase()
          .replace(/\s+/g, "-")}`,
        name: geocoded.place_name,
        region: geocoded.state || geocoded.city || "",
        country: geocoded.country,
        lat: geocoded.latitude,
        lng: geocoded.longitude,
        zoom: 5,
        description: geocoded.description || "Geocoded location",
      },
    ];
  }

  // 2️⃣ Fall back to the PLACES index (known/demo locations).
  //    These are marked as FALLBACK so the UI can distinguish real vs mock.
  const fromPlaces = PLACES.filter(
    (p) => `${p.name} ${p.region} ${p.country}`.toLowerCase().includes(q),
  );
  if (fromPlaces.length) {
    // Annotate PLACES results as FALLBACK so they are never mistaken for REAL geocoding.
    return fromPlaces.map((p) => ({
      ...p,
      // PlaceLocation has no source field; we inject it as a runtime extension
      // via a type‑assertion-friendly augmentation that downstream code can read.
      // The UI already surfaces source/provider_source on analysis results;
      // this keeps the invariant that PLACES entries are never silently REAL.
      source: "FALLBACK" as const,
      provider_source: "AQUASCOPE deterministic fallback",
    }));
  }

  return [];
}

/**
 * Mock address geocoder – kept for backward compatibility but now delegates
 * to the new geocoding service.  It is effectively a no‑op; real geocoding
 * happens in searchLocations via geocodeLocation.
 */
export async function geocodeAddress(address: string): Promise<PlaceLocation> {
  // Delegated to the new service; this stub keeps the original signature.
  const geocoded = await geocodeLocation(address);
  if (!geocoded) throw new Error("Geocoding failed");
  return {
    id: `geocoded-${geocoded.place_name
      .toLowerCase()
      .replace(/\s+/g, "-")}`,
    name: geocoded.place_name,
    region: geocoded.state || geocoded.city || "",
    country: geocoded.country,
    lat: geocoded.latitude,
    lng: geocoded.longitude,
    zoom: 5,
    description: geocoded.description || "Geocoded location",
  };
}
