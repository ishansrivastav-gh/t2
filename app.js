let state = { products: [], sales: [], summary: {} };

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const res = await fetch('/api/dashboard');
    state = await res.json();
    renderUI();
  } catch (err) {
    console.error('Failed to connect to server backend:', err);
  }
}

function renderUI() {
  // Update Metrics
  document.getElementById('total-products').innerText = state.summary.totalProducts;
  document.getElementById('total-stock-value').innerText = `$${state.summary.totalStockValue.toFixed(2)}`;
  document.getElementById('total-sales-amount').innerText = `$${state.summary.totalSalesAmount.toFixed(2)}`;
  document.getElementById('low-stock-count').innerText = state.summary.lowStockCount;

  // Populate Product Select Dropdown for Sales Form
  const select = document.getElementById('s-product');
  select.innerHTML = '<option value="">Select Product...</option>';
  state.products.forEach((p) => {
    select.innerHTML += `<option value="${p.id}">${p.name} ($${p.price.toFixed(2)} - ${p.stock} in stock)</option>`;
  });

  // Populate Category Filters
  const categories = ['ALL', ...new Set(state.products.map((p) => p.category))];
  const catFilter = document.getElementById('category-filter');
  catFilter.innerHTML = categories.map((c) => `<option value="${c}">${c}</option>`).join('');

  renderTable(state.products);
}

function renderTable(products) {
  const tbody = document.getElementById('inventory-table-body');
  tbody.innerHTML = '';

  products.forEach((p) => {
    const isLow = p.stock <= p.lowStockThreshold;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${p.stock}</td>
      <td><span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">${isLow ? 'LOW STOCK' : 'IN STOCK'}</span></td>
      <td><button class="btn-sm" onclick="quickStockAdd('${p.id}', ${p.stock})">+ Stock</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterProducts() {
  const query = document.getElementById('search-bar').value.toLowerCase();
  const category = document.getElementById('category-filter').value;

  const filtered = state.products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(query);
    const matchesCategory = category === 'ALL' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  renderTable(filtered);
}

async function handleAddProduct(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('p-name').value,
    category: document.getElementById('p-category').value,
    price: document.getElementById('p-price').value,
    stock: document.getElementById('p-stock').value
  };

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    document.getElementById('product-form').reset();
    loadDashboardData();
  }
}

async function handleRecordSale(e) {
  e.preventDefault();
  const payload = {
    productId: document.getElementById('s-product').value,
    quantity: document.getElementById('s-qty').value
  };

  const res = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    document.getElementById('sale-form').reset();
    loadDashboardData();
  } else {
    const err = await res.json();
    alert(err.error);
  }
}

async function quickStockAdd(id, currentStock) {
  const newStock = currentStock + 5;
  await fetch(`/api/products/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock: newStock })
  });
  loadDashboardData();
}