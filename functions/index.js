const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { getStorage } = require("firebase-admin/storage");

admin.initializeApp();
const bucket = getStorage().bucket();

/**
 * 🔁 Convert Google Drive view link → direct download link
 */
function normalizeDriveUrl(url) {
  if (!url) return null;

  // Google Drive file view link
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/([^/]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  return url;
}

/**
 * ⬇️ Download image from URL and upload to Firebase Storage
 * ❌ NO signed URLs
 * ❌ NO signBlob
 */
async function uploadImageFromUrl(imageUrl, destinationPath) {
  if (!imageUrl) return null;

  const finalUrl = normalizeDriveUrl(imageUrl);

  const response = await fetch(finalUrl);
  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }

  const buffer = await response.buffer();
  const file = bucket.file(destinationPath);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: response.headers.get("content-type") || "image/jpeg",
    },
  });

  // ✅ PUBLIC FIREBASE STORAGE URL
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    destinationPath
  )}?alt=media`;
}

/**
 * 🔥 PROCESS PRODUCT IMAGES (MAIN + GALLERY)
 */
exports.processProductImages = onDocumentCreated(
  "products/{productId}",
  async (event) => {
    const snap = event.data;
    const product = snap.data();

    if (!product?.sourceImages?.main) {
      await snap.ref.update({
        imageStatus: "failed",
        failureReason: "No main image URL",
      });
      return;
    }

    try {
      const sku = product.sku || snap.id;

      // =========================
      // 🔹 MAIN IMAGE
      // =========================
      const mainImageUrl = await uploadImageFromUrl(
        product.sourceImages.main,
        `product-images/${sku}/main.jpg`
      );

      // =========================
      // 🔹 GALLERY IMAGES
      // =========================
      const galleryUrls = [];

      if (Array.isArray(product.sourceImages.gallery)) {
        for (let i = 0; i < product.sourceImages.gallery.length; i++) {
          const imgUrl = product.sourceImages.gallery[i];

          if (!imgUrl || imgUrl.trim() === "") continue;

          const galleryUrl = await uploadImageFromUrl(
            imgUrl,
            `product-images/${sku}/gallery_${i}.jpg`
          );

          if (galleryUrl) galleryUrls.push(galleryUrl);
        }
      }

      // =========================
      // 🔹 UPDATE FIRESTORE
      // =========================
      await snap.ref.update({
        mainImageUrl,
        imageUrls: galleryUrls,
        imageStatus: "completed",
      });

    } catch (error) {
      console.error("Image processing failed:", error);

      await snap.ref.update({
        imageStatus: "failed",
        failureReason: error.message,
      });
    }
  }
);
