/** Kompresja zdjęcia zasobu do data URL (webp/jpeg) przed zapisem w formularzu. */
export async function compressVehiclePhotoToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  const img = document.createElement("img");
  const blobUrl = URL.createObjectURL(file);
  img.src = blobUrl;
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("load"));
    });
    const canvas = document.createElement("canvas");
    const maxDim = 960;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w <= 0 || h <= 0) return null;
    if (w > h && w > maxDim) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else if (h > maxDim) {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const webp = canvas.toDataURL("image/webp", 0.82);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
