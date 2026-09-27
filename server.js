import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Default database structure with sample hackathon data
const initialData = {
  products: [
    { id: 'P101', name: 'Wireless Mouse', category: 'Electronics', price: 25.0, stock: 15, lowStockThreshold: 5 },
    { id: 'P102', name: 'Mechanical Keyboard', category: 'Electronics', price: 85.0, stock: 3, lowStockThreshold: 5 },
    { id: 'P103', name: 'Coffee Mug', category: 'Merchandise', price: 12.0, stock: 40, lowStockThreshold: 10 }
  ],
  sales: []
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeJsonSync(DB_FILE, initialData, { spaces: 2 });
}

const readDB = () => fs.readJsonSync(DB_FILE);
const writeDB = (data) => fs.writeJsonSync(DB_FILE, data, { spaces: 2 });

/* ---------------- API ENDPOINTS ---------------- */

// 1. Get Dashboard Analytics & Products
app.get('/api/dashboard', (req, res) => {
  try {
    const db = readDB();
    const products = db.products || [];
    const sales = db.sales || [];

    const totalStockValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);
    const lowStockItems = products.filter((p) => p.stock <= p.lowStockThreshold);
    const totalSalesAmount = sales.reduce((acc, s) => acc + s.total, 0);

    res.json({
      summary: {
        totalProducts: products.length,
        totalStockValue,
        totalSalesAmount,
        lowStockCount: lowStockItems.length
      },
      products,
      sales,
      lowStockItems
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

// 2. Add New Product (with Validation)
app.post('/api/products', (req, res) => {
  try {
    const { name, category, price, stock, lowStockThreshold } = req.body;
    if (!name || price <= 0 || stock < 0) {
      return res.status(400).json({ error: 'Invalid product details provided' });
    }

    const db = readDB();
    const newProduct = {
      id: 'P' + Math.floor(100 + Math.random() * 900),
      name,
      category: category || 'General',
      price: parseFloat(price),
      stock: parseInt(stock),
      lowStockThreshold: parseInt(lowStockThreshold) || 5
    };

    db.products.push(newProduct);
    writeDB(db);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// 3. Update Product Stock directly
app.patch('/api/products/:id/stock', (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const db = readDB();
    const product = db.products.find((p) => p.id === id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    product.stock = parseInt(stock);
    writeDB(db);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// 4. Record Sale (Automatic Stock Reduction & Validation)
app.post('/api/sales', (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity);

    const db = readDB();
    const product = db.products.find((p) => p.id === productId);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < qty) {
      return res.status(400).json({ error: `Insufficient stock! Only ${product.stock} available.` });
    }

    // Deduct Stock
    product.stock -= qty;

    const newSale = {
      id: 'S' + Math.floor(1000 + Math.random() * 9000),
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice: product.price,
      total: product.price * qty,
      date: new Date().toISOString().split('T')[0]
    };

    db.sales.push(newSale);
    writeDB(db);

    res.status(201).json({ sale: newSale, updatedProduct: product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record sale' });
  }
});

app.listen(PORT, () => {
  console.log(`Smart Inventory Backend running at http://localhost:${PORT}`);
});