// WasteLess Frontend Application

const API_BASE = '/api';

// Bootstrap components
let productModal;
let categoryModal;
let toast;

// Data cache
let categoriesCache = [];
let aiAvailable = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
  toast = new bootstrap.Toast(document.getElementById('toast'));

  // Load initial data
  loadCategories();
  loadDashboard();
  loadProducts();
  loadNovisignStatus();
  loadPreview();
  loadEvents();
  checkAIAvailability();

  // Set up event listeners
  document.getElementById('searchInput').addEventListener('input', debounce(filterProducts, 300));
  document.getElementById('categoryFilter').addEventListener('change', filterProducts);
  document.getElementById('expiryFilter').addEventListener('change', filterProducts);

  // Image preview
  document.getElementById('productImage').addEventListener('change', previewImage);

  // Refresh data when tabs are shown
  document.getElementById('dashboard-tab').addEventListener('shown.bs.tab', loadDashboard);
  document.getElementById('inventory-tab').addEventListener('shown.bs.tab', loadProducts);
  document.getElementById('categories-tab').addEventListener('shown.bs.tab', loadCategoriesTable);
  document.getElementById('novisign-tab').addEventListener('shown.bs.tab', () => {
    loadNovisignStatus();
    loadPreview();
    loadEvents();
  });
});

// Utility Functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showToast(title, message, type = 'success') {
  const toastEl = document.getElementById('toast');
  toastEl.classList.remove('toast-success', 'toast-error');
  toastEl.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastBody').textContent = message;
  toast.show();
}

function formatCurrency(amount) {
  return '₪' + parseFloat(amount).toFixed(2);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('he-IL');
}

function getExpiryBadgeClass(daysToExpiry) {
  if (daysToExpiry <= 0) return 'badge-expiry-critical';
  if (daysToExpiry === 1) return 'badge-expiry-urgent';
  if (daysToExpiry <= 3) return 'badge-expiry-warning';
  return 'badge-expiry-normal';
}

function getExpiryText(daysToExpiry) {
  if (daysToExpiry <= 0) return 'פג תוקף היום!';
  if (daysToExpiry === 1) return 'מחר';
  return `${daysToExpiry} ימים`;
}

function getCategoryHebrew(category) {
  const cat = categoriesCache.find(c => c.name_en === category);
  return cat ? cat.name_he : category;
}

// Categories Functions
async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories?active=true`);
    const result = await response.json();
    categoriesCache = result.data || result;

    // Update category dropdowns
    updateCategoryDropdowns();
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function updateCategoryDropdowns() {
  const productCategorySelect = document.getElementById('productCategory');
  const categoryFilter = document.getElementById('categoryFilter');

  // Update product modal dropdown
  productCategorySelect.innerHTML = categoriesCache.map(cat =>
    `<option value="${cat.name_en}">${cat.name_he}</option>`
  ).join('');

  // Update filter dropdown
  categoryFilter.innerHTML = '<option value="">כל הקטגוריות</option>' +
    categoriesCache.map(cat =>
      `<option value="${cat.name_en}">${cat.name_he}</option>`
    ).join('');
}

async function loadCategoriesTable() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    const result = await response.json();
    const categories = result.data || result;

    const tbody = document.getElementById('categoriesTable');
    tbody.innerHTML = categories.map(cat => `
      <tr class="${!cat.is_active ? 'table-secondary' : ''}">
        <td><i class="${cat.icon || 'bi-box'} fs-4"></i></td>
        <td><strong>${cat.name_he}</strong></td>
        <td><code>${cat.name_en}</code></td>
        <td>${cat.sort_order}</td>
        <td>
          ${cat.is_active
            ? '<span class="badge bg-success">פעיל</span>'
            : '<span class="badge bg-secondary">לא פעיל</span>'
          }
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${cat.id})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${cat.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function showAddCategoryModal() {
  document.getElementById('categoryModalTitle').textContent = 'הוסף קטגוריה';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  categoryModal.show();
}

async function editCategory(id) {
  try {
    const response = await fetch(`${API_BASE}/categories/${id}`);
    const result = await response.json();
    const category = result.data || result;

    document.getElementById('categoryModalTitle').textContent = 'עריכת קטגוריה';
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryNameHe').value = category.name_he;
    document.getElementById('categoryNameEn').value = category.name_en;
    document.getElementById('categoryIcon').value = category.icon || '';
    document.getElementById('categorySortOrder').value = category.sort_order;

    categoryModal.show();
  } catch (error) {
    console.error('Error loading category:', error);
    showToast('שגיאה', 'לא ניתן לטעון את הקטגוריה', 'error');
  }
}

async function saveCategory() {
  const id = document.getElementById('categoryId').value;

  const categoryData = {
    name_he: document.getElementById('categoryNameHe').value,
    name_en: document.getElementById('categoryNameEn').value,
    icon: document.getElementById('categoryIcon').value || null,
    sort_order: parseInt(document.getElementById('categorySortOrder').value) || 0
  };

  try {
    const url = id ? `${API_BASE}/categories/${id}` : `${API_BASE}/categories`;
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });

    if (response.ok) {
      categoryModal.hide();
      loadCategories();
      loadCategoriesTable();
      showToast('הצלחה', id ? 'הקטגוריה עודכנה' : 'הקטגוריה נוספה', 'success');
    } else {
      const error = await response.json();
      showToast('שגיאה', error.error?.message || 'לא ניתן לשמור', 'error');
    }
  } catch (error) {
    console.error('Error saving category:', error);
    showToast('שגיאה', 'לא ניתן לשמור את הקטגוריה', 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('האם אתה בטוח שברצונך למחוק את הקטגוריה?')) return;

  try {
    const response = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });

    if (response.ok) {
      loadCategories();
      loadCategoriesTable();
      showToast('הצלחה', 'הקטגוריה נמחקה', 'success');
    } else {
      showToast('שגיאה', 'לא ניתן למחוק', 'error');
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    showToast('שגיאה', 'לא ניתן למחוק את הקטגוריה', 'error');
  }
}

// Dashboard Functions
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/pricing/summary`);
    const data = await response.json();

    document.getElementById('totalProducts').textContent = data.totalProducts;
    document.getElementById('discountedProducts').textContent = data.discountedProducts;
    document.getElementById('expiringProducts').textContent = data.expiringProducts;
    document.getElementById('totalSavings').textContent = data.totalSavings.toFixed(2);

    // Category breakdown
    const tbody = document.getElementById('categoryBreakdown');
    if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      tbody.innerHTML = data.categoryBreakdown.map(cat => `
        <tr>
          <td><strong>${cat.category_he || getCategoryHebrew(cat.category)}</strong></td>
          <td>${cat.count}</td>
          <td>${Math.round(cat.avg_discount)}%</td>
          <td>${formatCurrency(cat.potential_savings || 0)}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">אין נתונים</td></tr>';
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('שגיאה', 'לא ניתן לטעון את לוח הבקרה', 'error');
  }
}

// Products Functions
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    const result = await response.json();
    const products = result.data || result;
    renderProducts(products);
  } catch (error) {
    console.error('Error loading products:', error);
    showToast('שגיאה', 'לא ניתן לטעון את המוצרים', 'error');
  }
}

function renderProducts(products) {
  const tbody = document.getElementById('productsTable');

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-state">
          <i class="bi bi-inbox"></i>
          <p>לא נמצאו מוצרים</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr>
      <td>
        ${product.image_path
          ? `<img src="/uploads/products/${product.image_path}" class="product-thumbnail" alt="${product.name_he}">`
          : '<div class="product-thumbnail-placeholder"><i class="bi bi-image"></i></div>'
        }
      </td>
      <td>
        <strong>${product.name_he}</strong>
        <br><small class="text-muted">${product.name_en}</small>
      </td>
      <td>${product.category_he}</td>
      <td><code class="sku-badge">${product.catalog_number || '-'}</code></td>
      <td>${formatCurrency(product.base_price)}</td>
      <td>
        ${product.discount_percent > 0
          ? `<span class="badge bg-danger discount-badge">${product.discount_percent}%</span>`
          : '<span class="badge bg-secondary">-</span>'
        }
      </td>
      <td>
        ${product.discount_percent > 0
          ? `<span class="price-original">${formatCurrency(product.base_price)}</span>
             <span class="price-discounted">${formatCurrency(product.current_price)}</span>`
          : formatCurrency(product.current_price)
        }
      </td>
      <td>${product.quantity} ${product.unit}</td>
      <td>
        <span class="badge ${getExpiryBadgeClass(product.days_to_expiry)}">
          ${getExpiryText(product.days_to_expiry)}
        </span>
        <br><small class="text-muted">${formatDate(product.expiry_date)}</small>
      </td>
      <td><small>${product.batch_number || '-'}</small></td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="editProduct(${product.id})" title="ערוך">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-info" onclick="uploadImageForProduct(${product.id})" title="העלה תמונה">
            <i class="bi bi-image"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteProduct(${product.id})" title="מחק">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function filterProducts() {
  const search = document.getElementById('searchInput').value;
  const category = document.getElementById('categoryFilter').value;
  const expiry = document.getElementById('expiryFilter').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (expiry) params.append('expiry', expiry);

  try {
    const response = await fetch(`${API_BASE}/products?${params}`);
    const result = await response.json();
    const products = result.data || result;
    renderProducts(products);
  } catch (error) {
    console.error('Error filtering products:', error);
  }
}

function refreshProducts() {
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('expiryFilter').value = '';
  loadProducts();
  showToast('עודכן', 'רשימת המוצרים רועננה', 'success');
}

function showAddProductModal() {
  document.getElementById('productModalTitle').textContent = 'הוסף מוצר חדש';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('catalogNumber').value = '';
  document.getElementById('productImagePreview').innerHTML = '<i class="bi bi-image text-muted"></i>';

  // Set default expiry date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('expiryDate').value = tomorrow.toISOString().split('T')[0];

  // Update AI button visibility
  document.getElementById('aiImageBtn').style.display = aiAvailable ? 'inline-block' : 'none';

  productModal.show();
}

async function editProduct(id) {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`);
    const result = await response.json();
    const product = result.data || result;

    document.getElementById('productModalTitle').textContent = 'עריכת מוצר';
    document.getElementById('productId').value = product.id;
    document.getElementById('nameHe').value = product.name_he;
    document.getElementById('nameEn').value = product.name_en;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('basePrice').value = product.base_price;
    document.getElementById('quantity').value = product.quantity;
    document.getElementById('unit').value = product.unit;
    document.getElementById('expiryDate').value = product.expiry_date;
    document.getElementById('catalogNumber').value = product.catalog_number || '';

    // Show image preview
    const preview = document.getElementById('productImagePreview');
    if (product.image_path) {
      preview.innerHTML = `<img src="/uploads/products/${product.image_path}" alt="${product.name_he}">`;
    } else {
      preview.innerHTML = '<i class="bi bi-image text-muted"></i>';
    }

    // Update AI button visibility
    document.getElementById('aiImageBtn').style.display = aiAvailable ? 'inline-block' : 'none';

    productModal.show();
  } catch (error) {
    console.error('Error loading product:', error);
    showToast('שגיאה', 'לא ניתן לטעון את פרטי המוצר', 'error');
  }
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const category = document.getElementById('productCategory').value;

  const productData = {
    name_he: document.getElementById('nameHe').value,
    name_en: document.getElementById('nameEn').value,
    category: category,
    category_he: getCategoryHebrew(category),
    base_price: parseFloat(document.getElementById('basePrice').value),
    quantity: parseInt(document.getElementById('quantity').value),
    unit: document.getElementById('unit').value,
    expiry_date: document.getElementById('expiryDate').value,
    catalog_number: document.getElementById('catalogNumber').value || null
  };

  try {
    const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const result = await response.json();

    if (response.ok) {
      const savedProduct = result.data || result;

      // Upload image if selected
      const imageFile = document.getElementById('productImage').files[0];
      if (imageFile) {
        await uploadImage(savedProduct.id, imageFile);
      }

      productModal.hide();
      loadProducts();
      loadDashboard();
      showToast('הצלחה', id ? 'המוצר עודכן בהצלחה' : 'המוצר נוסף בהצלחה', 'success');
    } else {
      showToast('שגיאה', result.error?.message || 'לא ניתן לשמור את המוצר', 'error');
    }
  } catch (error) {
    console.error('Error saving product:', error);
    showToast('שגיאה', 'לא ניתן לשמור את המוצר', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('האם אתה בטוח שברצונך למחוק את המוצר?')) return;

  try {
    const response = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });

    if (response.ok) {
      loadProducts();
      loadDashboard();
      showToast('הצלחה', 'המוצר נמחק בהצלחה', 'success');
    } else {
      showToast('שגיאה', 'לא ניתן למחוק את המוצר', 'error');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    showToast('שגיאה', 'לא ניתן למחוק את המוצר', 'error');
  }
}

// Image Functions
function previewImage(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('productImagePreview');

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  }
}

async function uploadImage(productId, file) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    await fetch(`${API_BASE}/products/${productId}/image`, {
      method: 'POST',
      body: formData
    });
  } catch (error) {
    console.error('Error uploading image:', error);
  }
}

function uploadImageForProduct(productId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadImage(productId, file);
      loadProducts();
      showToast('הצלחה', 'התמונה הועלתה בהצלחה', 'success');
    }
  };
  input.click();
}

async function checkAIAvailability() {
  try {
    const response = await fetch(`${API_BASE}/products/ai/status`);
    const result = await response.json();
    aiAvailable = result.data?.available || false;
  } catch (error) {
    aiAvailable = false;
  }
}

async function generateAIImage() {
  const id = document.getElementById('productId').value;
  if (!id) {
    showToast('הערה', 'יש לשמור את המוצר קודם', 'error');
    return;
  }

  const btn = document.getElementById('aiImageBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> מייצר...';

  try {
    const response = await fetch(`${API_BASE}/products/${id}/generate-image`, { method: 'POST' });
    const result = await response.json();

    if (response.ok) {
      const product = result.data;
      document.getElementById('productImagePreview').innerHTML =
        `<img src="/uploads/products/${product.image_path}" alt="${product.name_he}">`;
      showToast('הצלחה', 'התמונה נוצרה בהצלחה', 'success');
    } else {
      showToast('שגיאה', result.error?.message || 'לא ניתן ליצור תמונה', 'error');
    }
  } catch (error) {
    console.error('Error generating AI image:', error);
    showToast('שגיאה', 'לא ניתן ליצור תמונה', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-magic me-1"></i>צור תמונה עם AI';
  }
}

// NoviSign Functions
async function loadNovisignStatus() {
  try {
    const response = await fetch(`${API_BASE}/novisign/status`);
    const status = await response.json();

    const statusDiv = document.getElementById('novisignStatus');
    if (status.configured) {
      statusDiv.className = 'alert alert-success';
      statusDiv.innerHTML = '<i class="bi bi-check-circle me-2"></i>NoviSign מחובר ומוגדר';
    } else {
      statusDiv.className = 'alert alert-warning';
      statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${status.message}`;
    }
  } catch (error) {
    console.error('Error loading NoviSign status:', error);
    const statusDiv = document.getElementById('novisignStatus');
    statusDiv.className = 'alert alert-danger';
    statusDiv.innerHTML = '<i class="bi bi-x-circle me-2"></i>לא ניתן לבדוק את החיבור';
  }
}

function refreshNovisignStatus() {
  loadNovisignStatus();
  showToast('בודק...', 'בודק את החיבור ל-NoviSign', 'success');
}

async function updateNovisignDisplays() {
  try {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> מעדכן...';

    const response = await fetch(`${API_BASE}/novisign/bulk-update`, { method: 'POST' });
    const result = await response.json();

    if (result.success) {
      showToast('הצלחה', result.message, 'success');
    } else {
      showToast('שגיאה', result.message, 'error');
    }

    loadEvents();
    loadPreview();
  } catch (error) {
    console.error('Error updating displays:', error);
    showToast('שגיאה', 'לא ניתן לעדכן את התצוגות', 'error');
  } finally {
    const btn = document.querySelector('[onclick="updateNovisignDisplays()"]');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>עדכן את כל התצוגות';
  }
}

async function loadPreview() {
  try {
    const response = await fetch(`${API_BASE}/novisign/preview`);
    const data = await response.json();

    const container = document.getElementById('displayPreview');

    if (data.products.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center text-muted">
          <i class="bi bi-display" style="font-size: 3rem;"></i>
          <p>אין מוצרים להצגה (רק מוצרים עם הנחה מוצגים)</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.products.map(product => `
      <div class="col-md-4 col-lg-3">
        <div class="display-card ${product.urgencyLevel}">
          ${product.imageUrl
            ? `<img src="${product.imageUrl}" class="display-card-image" alt="${product.name}">`
            : ''
          }
          <div class="product-name">${product.name}</div>
          <div class="text-muted small">${product.category}</div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <div>
              <div class="original-price">${formatCurrency(product.originalPrice)}</div>
              <div class="new-price">${formatCurrency(product.discountedPrice)}</div>
            </div>
            <div class="discount-percent">-${product.discountPercent}%</div>
          </div>
          ${product.urgencyText ? `
            <div class="urgency-text text-danger mt-2">
              <i class="bi bi-clock me-1"></i>${product.urgencyText}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading preview:', error);
  }
}

function refreshPreview() {
  loadPreview();
}

async function loadEvents() {
  try {
    const response = await fetch(`${API_BASE}/novisign/events?limit=5`);
    const events = await response.json();

    const container = document.getElementById('eventsLog');

    if (events.length === 0) {
      container.innerHTML = '<p class="text-muted">אין אירועים אחרונים</p>';
      return;
    }

    container.innerHTML = events.map(event => {
      const isSuccess = event.response_status === 200 || event.response_status === 201;
      const date = new Date(event.created_at);
      return `
        <div class="event-item ${isSuccess ? 'success' : 'error'}">
          <i class="bi bi-${isSuccess ? 'check-circle' : 'x-circle'} me-2"></i>
          <strong>${event.event_type}</strong>
          <span class="text-muted ms-2">${date.toLocaleTimeString('he-IL')}</span>
          ${!isSuccess && event.response_body ? `<br><small class="text-danger">${typeof event.response_body === 'string' ? event.response_body : JSON.stringify(event.response_body)}</small>` : ''}
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading events:', error);
  }
}
