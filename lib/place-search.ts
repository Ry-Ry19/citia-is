// lib/place-search.ts
//
// WHAT: Looks up barangays, streets and landmarks in Iligan City with
//   OpenStreetMap's Nominatim service, so the reporter can move the map
//   near the tree before marking it.
//
// USAGE POLICY (https://operations.osmfoundation.org/policies/nominatim/):
//   - No search-as-you-type: a search runs only when the reporter
//     presses Search.
//   - At most one request per second, and repeated searches are answered
//     from a small in-memory cache.
//   - Results are attributed to OpenStreetMap on the form.
//
// PRIVACY: only the typed search text is sent. A result moves the map;
//   it never becomes the reported tree location by itself.

export interface PlaceResult {
  name: string;
  latitude: number;
  longitude: number;
}

export type PlaceSearchOutcome =
  | { ok: true; places: PlaceResult[] }
  | { ok: false; message: string };

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Roughly Iligan City: west, north, east, south.
const ILIGAN_VIEWBOX = "124.10,8.45,124.50,8.00";

const MIN_INTERVAL_MS = 1100;
const TIMEOUT_MS = 10_000;

const cache = new Map<string, PlaceResult[]>();
let lastRequestAt = 0;

export async function searchPlaces(query: string): Promise<PlaceSearchOutcome> {
  const text = query.trim();
  if (text.length < 3) {
    return { ok: false, message: "Type at least 3 characters to search." };
  }

  const key = text.toLowerCase();
  const cached = cache.get(key);
  if (cached) return { ok: true, places: cached };

  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q: text,
    format: "jsonv2",
    countrycodes: "ph",
    viewbox: ILIGAN_VIEWBOX,
    bounded: "1",
    limit: "5",
    "accept-language": "en",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?${params}`, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, message: "Place search is unavailable right now. You can still pan the map." };
    }

    const body: unknown = await response.json();
    const places: PlaceResult[] = Array.isArray(body)
      ? body.flatMap((item) => {
          if (typeof item !== "object" || item === null) return [];
          const { display_name, lat, lon } = item as Record<string, unknown>;
          const latitude = Number(lat);
          const longitude = Number(lon);
          if (typeof display_name !== "string" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return [];
          }
          return [{ name: display_name, latitude, longitude }];
        })
      : [];

    cache.set(key, places);
    return { ok: true, places };
  } catch {
    return { ok: false, message: "Place search is unavailable right now. You can still pan the map." };
  } finally {
    clearTimeout(timer);
  }
}
