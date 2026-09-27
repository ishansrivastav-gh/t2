import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// In-Memory Database for Serverless Execution
let db = {
  products: [
    { id: 'P101', name: 'Wireless Mouse', category: 'Electronics', price: 25.0, stock: 15, lowStockThreshold: 5 },
    { id: 'P102', name: 'Mechanical Keyboard', category: 'Electronics', price: 85.0, stock: 3, lowStockThreshold: 5 },
    { id: 'P103', name: 'Coffee Mug', category: 'Merchandise', price: 12.0, stock: 40, lowStockThreshold: 10 }
  ],
  sales: []
};

/* ---------------- API ENDPOINTS ---------------- */

app.get('/api/dashboard', (req, res) => {
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
});

app.post('/api/products', (req, res) => {
  const { name, category, price, stock, lowStockThreshold } = req.body;
  if (!name || price <= 0 || stock < 0) {
    return res.status(400).json({ error: 'Invalid product details' });
  }

  const newProduct = {
    id: 'P' + Math.floor(100 + Math.random() * 900),
    name,
    category: category || 'General',
    price: parseFloat(price),
    stock: parseInt(stock),
    lowStockThreshold: parseInt(lowStockThreshold) || 5
  };

  db.products.push(newProduct);
  res.status(201).json(newProduct);
});

app.patch('/api/products/:id/stock', (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  const product = db.products.find((p) => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  product.stock = parseInt(stock);
  res.json(product);
});

app.post('/api/sales', (req, res) => {
  const { productId, quantity } = req.body;
  const qty = parseInt(quantity);

  const product = db.products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock < qty) {
    return res.status(400).json({ error: `Insufficient stock! Only ${product.stock} available.` });
  }

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
  res.status(201).json({ sale: newSale, updatedProduct: product });
});

// Export Express app for Vercel Serverless
export default app;

// Listen locally when executed via Node directly
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}