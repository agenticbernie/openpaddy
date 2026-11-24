// FR-02: Lightweight EXIF/image integrity check for uploaded compliance photos
export interface ExifExtractionResult {
  hasExifHeader: boolean;
  fileSizeBytes: number;
  mimeType: string;
  integrityStatus: 'verified' | 'basic_image';
}

export function inspectPhotoExif(
  buffer: ArrayBuffer,
  mimeType: string,
): ExifExtractionResult {
  const bytes = new Uint8Array(buffer);
  // JPEG starts with 0xFF 0xD8; EXIF APP1 marker is 0xFF 0xE1
  let hasExifHeader = false;
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let i = 2; i < Math.min(bytes.length - 1, 64); i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xe1) {
        hasExifHeader = true;
        break;
      }
    }
  }

  return {
    hasExifHeader,
    fileSizeBytes: bytes.byteLength,
    mimeType,
    integrityStatus: hasExifHeader ? 'verified' : 'basic_image',
  };
}
