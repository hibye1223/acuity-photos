const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
};

/**
 * Turns GPS coordinates into a short place name ("Los Angeles, California")
 * via OpenStreetMap's free Nominatim API — no API key needed. Best-effort:
 * returns null on any failure rather than throwing, since this only ever
 * runs as a background enrichment step after a photo upload.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("lat", latitude.toString());
    url.searchParams.set("lon", longitude.toString());
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        // Required by Nominatim's usage policy — identifies the app, not a user.
        "User-Agent": "AcuityPhotos/1.0 (private photo album app)",
      },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { address?: NominatimAddress };
    const address = data.address;
    if (!address) return null;

    const place =
      address.city ?? address.town ?? address.village ?? address.county;
    const region = address.state ?? address.country;
    const label = [place, region].filter(Boolean).join(", ");
    return label || null;
  } catch {
    return null;
  }
}
