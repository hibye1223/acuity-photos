import exifr from "exifr";

export type PhotoExifData = {
  capturedAt: Date | null;
  gps: { latitude: number; longitude: number } | null;
};

/**
 * Reads the capture date and GPS coordinates from a photo's EXIF data, if
 * present. Must run on the original file before compression, since
 * re-encoding can strip EXIF.
 */
export async function extractPhotoExif(file: File): Promise<PhotoExifData> {
  const [dateResult, gpsResult] = await Promise.allSettled([
    exifr.parse(file, ["DateTimeOriginal", "CreateDate"]),
    exifr.gps(file),
  ]);

  const capturedAtRaw =
    dateResult.status === "fulfilled"
      ? (dateResult.value?.DateTimeOriginal ?? dateResult.value?.CreateDate)
      : null;

  const gps = gpsResult.status === "fulfilled" ? gpsResult.value : null;

  return {
    capturedAt: capturedAtRaw instanceof Date ? capturedAtRaw : null,
    gps: gps ? { latitude: gps.latitude, longitude: gps.longitude } : null,
  };
}
