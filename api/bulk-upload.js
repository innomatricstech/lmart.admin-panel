// bulkUploadProducts.js
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

/**
 * IMPORTANT:
 * - Do NOT commit serviceAccountKey.json to source control.
 * - Prefer setting GOOGLE_APPLICATION_CREDENTIALS env var to the JSON file path:
 *     export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 *
 * If you still want to load from file for local testing, ensure it's in .gitignore.
 */

// Load credentials only if running locally; otherwise rely on env var/application default creds.
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (err) {
  // If not present, assume GOOGLE_APPLICATION_CREDENTIALS or default app credentials will be used.
  console.warn("serviceAccountKey.json not found. Relying on default credentials (GOOGLE_APPLICATION_CREDENTIALS).");
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.initializeApp(); // uses default credentials
}

const db = admin.firestore();

// --- Re-usable keyword generation logic (hardened) ---
const generateSearchKeywords = (product) => {
  const keywords = new Set();

  const safeStr = (v) => (v || '').toString().toLowerCase().trim();

  const addPrefixTokens = (str) => {
    if (!str) return;
    for (let i = 1; i <= Math.min(str.length, 50); i++) {
      keywords.add(str.substring(0, i));
    }
  };

  const lowerName = safeStr(product.name);
  addPrefixTokens(lowerName);

  // word-level tokens (split name & description)
  const nameWords = lowerName.split(/\s+/).filter(w => w.length > 1);
  nameWords.forEach(word => addPrefixTokens(word));

  // selected fields
  const fields = [product.brand, product.sku, product.hsnCode];
  fields.forEach(field => {
    const f = safeStr(field);
    if (!f) return;
    keywords.add(f);
    for (let i = 1; i <= Math.min(f.length, 5); i++) {
      keywords.add(f.substring(0, i));
    }
  });

  if (product.category && product.category.name) keywords.add(safeStr(product.category.name));
  if (product.subCategory && product.subCategory.name) keywords.add(safeStr(product.subCategory.name));

  // variant colors/sizes
  const variants = product.variants || [];
  const uniqueColors = new Set(variants.map(v => safeStr(v.color)).filter(Boolean));
  const uniqueSizes = new Set(variants.map(v => safeStr(v.size)).filter(Boolean));

  uniqueColors.forEach(c => keywords.add(c));
  uniqueSizes.forEach(s => keywords.add(s));

  if (product.productTag) keywords.add(safeStr(product.productTag));

  // Filter and cap size (to avoid huge arrays stored in Firestore)
  const final = Array.from(keywords)
    .filter(k => k.length > 0 && k.length <= 50);

  // cap to 200 keywords (adjust if needed)
  return final.slice(0, 200);
};

// Helper: chunk an array
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

async function bulkUploadProducts(filePath) {
  console.log(`Starting bulk upload from ${filePath}...`);
  const products = {};
  let rowCount = 0;

  // Read CSV and group by SKU
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;

        const skuKey = (row.SKU || '').toString().trim();
        if (!skuKey) {
          console.warn(`Skipping row ${rowCount}: SKU is missing.`);
          return;
        }

        if (!products[skuKey]) {
          products[skuKey] = {
            baseData: {
              name: row.Name || '',
              description: row.Description || '',
              sku: skuKey,
              hsnCode: row.HSNCode || '',
              brand: row.Brand || '',
              sellerId: row.SellerId || '',
              productTag: row.ProductTag || '',
              categoryID: row.CategoryID || '',
              subCategoryID: row.SubCategoryID || '',
              mainImageUrl: row.MainImageURL || '',
              videoUrl: row.VideoURL || '',
              galleryImages: row.GalleryImages || '', // raw string
              categoryName: row.CategoryName || 'Unknown',
              subCategoryName: row.SubCategoryName || 'Unknown',
            },
            variants: [],
          };
        }

        // Normalize variant fields
        const variantColor = (row['Variant_Color'] || '').toString().trim();
        const variantSizeRaw = (row['Variant_Size'] || '').toString().trim();
        const variantSize = variantSizeRaw ? variantSizeRaw.toUpperCase() : '';

        const priceRaw = (row['Variant_Price'] || '').toString().trim();
        const offerPriceRaw = (row['Variant_OfferPrice'] || '').toString().trim();
        const stockRaw = (row['Variant_Stock'] || '').toString().trim();

        const price = priceRaw ? parseFloat(priceRaw) : 0;
        const offerPrice = offerPriceRaw ? (isNaN(parseFloat(offerPriceRaw)) ? null : parseFloat(offerPriceRaw)) : null;
        const stock = stockRaw ? parseInt(stockRaw, 10) || 0 : 0;

        // Only add variant if there's some meaningful data
        if (variantColor || variantSize || priceRaw || stockRaw) {
          products[skuKey].variants.push({
            variantId: uuidv4(),
            color: variantColor || 'N/A',
            size: variantSize || 'N/A',
            price,
            offerPrice,
            stock,
          });
        }
      })
      .on('end', () => {
        console.log(`CSV read complete. Found ${Object.keys(products).length} unique products from ${rowCount} rows.`);
        resolve();
      })
      .on('error', (err) => reject(err));
  });

  // Prepare products for Firestore writes
  const productSKUs = Object.keys(products);
  if (productSKUs.length === 0) {
    console.log('No products found to upload. Exiting.');
    return;
  }

  // Create document payloads
  const docsToWrite = [];
  for (const sku of productSKUs) {
    const { baseData, variants } = products[sku];
    const base = baseData;

    // Prepare imageUrls array
    const imageUrls = [];
    if (base.mainImageUrl) {
      imageUrls.push({
        url: base.mainImageUrl,
        name: base.mainImageUrl.substring(base.mainImageUrl.lastIndexOf('/') + 1),
        type: 'url',
        isMain: true,
        color: '',
      });
    }

    if (base.galleryImages) {
      // Expecting something like: "https://.../img1.jpg:RED | https://.../img2.jpg:BLUE"
      const galleryItems = base.galleryImages.split('|').map(i => i.trim()).filter(Boolean);
      galleryItems.forEach(item => {
        const [urlPart, colorPart] = item.split(':').map(s => s && s.trim());
        const url = urlPart || '';
        const color = (colorPart && colorPart.toUpperCase() !== 'N/A') ? colorPart : '';
        if (url) {
          imageUrls.push({
            url,
            name: url.substring(url.lastIndexOf('/') + 1),
            type: 'url',
            isMain: false,
            color,
          });
        }
      });
    }

    const productToSave = {
      name: base.name,
      description: base.description,
      sku: base.sku,
      hsnCode: base.hsnCode,
      brand: base.brand,
      category: {
        id: base.categoryID || '',
        name: base.categoryName || 'Unknown',
      },
      subCategory: base.subCategoryID ? {
        id: base.subCategoryID,
        name: base.subCategoryName || 'Unknown',
      } : null,
      sellerId: base.sellerId || '',
      productTag: base.productTag || '',
      variants: variants.length > 0 ? variants : [],

      imageUrls,
      mainImageUrl: base.mainImageUrl || '',
      videoUrl: base.videoUrl || '',

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'Active',
    };

    productToSave.searchKeywords = generateSearchKeywords(productToSave);

    docsToWrite.push(productToSave);
  }

  // Firestore batch commit in chunks of <= 500 writes
  const BATCH_LIMIT = 450; // keep below 500 to be safe (reserve headroom)
  const chunks = chunkArray(docsToWrite, BATCH_LIMIT);

  let totalCommitted = 0;
  let totalFailed = 0;
  const productsCollection = db.collection('products');

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const batch = db.batch();

    chunk.forEach((doc) => {
      const docRef = productsCollection.doc(); // auto-id
      batch.set(docRef, doc);
    });

    console.log(`Committing batch ${i + 1}/${chunks.length} (${chunk.length} writes)...`);
    try {
      await batch.commit();
      totalCommitted += chunk.length;
      console.log(`Batch ${i + 1} committed successfully.`);
    } catch (err) {
      totalFailed += chunk.length;
      console.error(`Batch ${i + 1} failed to commit:`, err.message || err);
      // Optionally: implement retry logic here for transient errors
    }
  }

  console.log(`\nSummary: ${totalCommitted} products uploaded, ${totalFailed} failed (if any).`);
  if (totalFailed > 0) console.warn('Some batches failed — consider retrying failed items or enabling retry logic.');
}

// --- Run ---
const CSV_FILE_PATH = 'products_to_upload.csv';

bulkUploadProducts(CSV_FILE_PATH)
  .catch(err => {
    console.error('Unhandled error in bulk upload:', err);
    process.exitCode = 1;
  });
