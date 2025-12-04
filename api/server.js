const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const admin = require('firebase-admin');
const stream = require('stream');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// ✅ LOAD FIREBASE KEY
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });
const db = admin.firestore();

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

app.post('/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const products = {};
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream.pipe(csv())
    .on('data', row => {
      const sku = row.SKU;
      if (!sku) return;

      if (!products[sku]) {
        products[sku] = {
          name: row.Name,
          sku,
          variants: [],
          imageUrls: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "Active"
        };
      }

      products[sku].variants.push({
        variantId: uuidv4(),
        color: row.Variant_Color,
        size: row.Variant_Size,
        price: parseFloat(row.Variant_Price),
        stock: parseInt(row.Variant_Stock)
      });
    })
    .on('end', async () => {
      const list = Object.values(products);
      const batch = db.batch();

      list.forEach(p => {
        const ref = db.collection("products").doc();
        batch.set(ref, p);
      });

      await batch.commit();
      res.json({ uploaded: list.length });
    });
});

app.listen(5000, () => {
  console.log("✅ Backend running at http://localhost:5000");
});
