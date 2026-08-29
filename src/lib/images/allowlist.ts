const JPEG = { mime: "image/jpeg", ext: "jpg" };
const PNG = { mime: "image/png", ext: "png" };
const GIF = { mime: "image/gif", ext: "gif" };
const WEBP = { mime: "image/webp", ext: "webp" };

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function sniffAllowedImage(bytes: Uint8Array, declaredType: string) {
  const type = declaredType.toLowerCase();
  if (startsWith(bytes, [0xff, 0xd8, 0xff]) && (type === JPEG.mime || type === "image/jpg")) {
    return JPEG;
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]) && type === PNG.mime) {
    return PNG;
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && type === GIF.mime) {
    return GIF;
  }
  if (
    type === WEBP.mime &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return WEBP;
  }
  return null;
}
