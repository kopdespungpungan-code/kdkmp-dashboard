/**
 * Kompres gambar di browser sebelum diunggah.
 * Hanya dipakai dari komponen client.
 */
export async function kompresGambar(
  file: File,
  opsi: { max?: number; quality?: number } = {},
): Promise<Blob> {
  const max = opsi.max ?? 1400;
  const quality = opsi.quality ?? 0.82;
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();

    const skala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * skala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * skala));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("Gagal memproses gambar.");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
