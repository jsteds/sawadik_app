export async function compressImage(
  file: File,
  maxWidthOrHeight: number = 1024,
  quality: number = 0.7
): Promise<File> {
  return new Promise((resolve, reject) => {
    // 1. Baca file sebagai Image
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // 2. Hitung dimensi baru
        let width = img.width;
        let height = img.height;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        // 3. Gambar di canvas dengan ukuran baru
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Tidak dapat membuat canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 4. Ubah menjadi file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Gagal kompresi foto"));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}
