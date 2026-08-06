import exifr from "exifr";

/**
 * Reads the capture date from a photo's EXIF data, if present. Must run on
 * the original file before compression, since re-encoding can strip EXIF.
 */
export async function extractCapturedAt(file: File): Promise<Date | null> {
  try {
    const exif = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const capturedAt = exif?.DateTimeOriginal ?? exif?.CreateDate;
    return capturedAt instanceof Date ? capturedAt : null;
  } catch {
    return null;
  }
}
