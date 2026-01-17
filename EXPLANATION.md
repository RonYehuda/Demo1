# WasteLess System - Complete Code Explanation

## 🎯 Overview

This document explains every component of the WasteLess Dynamic Pricing System, how they work together, and why specific design decisions were made.

---

## 📐 Architecture Decisions

### Why This Stack?

**Node.js + Express:**
- Fast development for hackathons
- Single language (JavaScript) for frontend and backend
- Large ecosystem of packages
- Easy to deploy

**SQLite (better-sqlite3):**
- Zero configuration
- File-based (no server needed)
- Synchronous API (simpler code)
- Perfect for proof-of-concept
- Easy to reset/seed data

**Vanilla JavaScript Frontend:**
- No build step required
- Faster initial setup
- Lower learning curve
- Full control over UI
- Perfect for 48-hour hackathon

**Hebrew-First Design:**
- Target market is Israel
- RTL (right-to-left) layout
- Hebrew as primary language
- English as secondary

---

## 🗄️ Database Design

### Schema Overview

```sql
products
├── id (PRIMARY KEY)
├── name (English, optional)
├── name_hebrew (Hebrew, REQUIRED)
├── category (vegetables/fruits/herbs/salads)
├── category_hebrew
├── base_price (original price)
├── current_price (calculated price)
├── discount_percentage (0-100)
├── quantity
├── unit (ק"ג, יחידה, אגד, etc.)
├── expiration_date (DATE)
├── batch_number (for tracking)
├── barcode
├── created_at
└── updated_at

pricing_rules
├── id (PRIMARY KEY)
├── category
├── days_until_expiry
├── discount_percentage
└── is_active

price_history
├── id (PRIMARY KEY)
├── product_id (FOREIGN KEY)
├── old_price
├── new_price
├── discount_percentage
├── reason
└── changed_at

novisign_events
├── id (PRIMARY KEY)
├── product_id (FOREIGN KEY, nullable)
├── event_type (product_update/bulk_update)
├── payload (JSON)
├── status (success/failed)
├── error_message
└── sent_at
```

### Why This Schema?

**products table:**
- Stores both Hebrew and English names for flexibility
- `current_price` is denormalized (stored separately) for performance
- `discount_percentage` cached to avoid recalculation
- `batch_number` enables tracking multiple shipments
- Timestamps for audit trail

**pricing_rules table:**
- Flexible discount configuration per category
- Can be modified without code changes
- `is_active` allows temporary rule disabling
- Multiple rules per category for granular control

**price_history table:**
- Complete audit trail of all price changes
- Stores reason for change
- Essential for analytics and compliance
- Helps debug pricing issues

**novisign_events table:**
- Logs all API calls to external service
- Status tracking for monitoring
- Error messages for debugging
- Can replay failed events

---

## 🔧 Backend Components Explained

### 1. Database Layer (`backend/database/`)

#### **db.js**
```javascript
const Database = require('better-sqlite3');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');  // Enforce referential integrity
db.pragma('journal_mode = WAL');  // Write-Ahead Logging
```

**Purpose:**
- Creates singleton database connection
- Enables foreign key constraints
- Uses WAL mode for better concurrent access

**Why Singleton?**
- SQLite doesn't support multiple connections well
- Avoids "database is locked" errors
- Simpler connection management

#### **init-db.js**
```javascript
// Creates tables if they don't exist
db.exec(`CREATE TABLE IF NOT EXISTS products (...)`);

// Inserts default pricing rules
const insertMany = db.transaction((rules) => {
  for (const rule of rules) {
    insertRule.run(rule.category, rule.days, rule.discount);
  }
});
```

**Key Points:**
- Idempotent (safe to run multiple times)
- Uses transactions for bulk inserts (faster)
- Creates default rules for all produce categories

**Default Rules Rationale:**
| Days Left | Discount | Reason |
|-----------|----------|---------|
| 5+ | 0% | Still fresh |
| 3-4 | 15% | Sell faster |
| 2 | 30% | More aggressive |
| 1 | 50% | Must sell today |
| 0 | 70% | Last chance |

#### **seed.js**
```javascript
const sampleProducts = [
  {
    name_hebrew: 'עגבניות',
    expiration_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
  }
];
```

**Purpose:**
- Provides realistic test data
- Various expiration dates (0-5 days)
- Includes urgent items for visual testing
- Hebrew names with English translations

---

### 2. Services Layer (`backend/services/`)

#### **pricingEngine.js** - The Brain of the System

##### Method: `calculateDaysUntilExpiry()`
```javascript
static calculateDaysUntilExpiry(expirationDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // Midnight
  
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);  // Midnight
  
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}
```

**Why This Implementation?**
- Sets both dates to midnight to compare full days
- Uses `Math.ceil` so partial days round up
- Returns negative numbers for expired items
- Consistent with user expectations

**Example:**
- Today: Jan 17, 2025
- Expiry: Jan 19, 2025
- Result: 2 days (user sees "2 days left")

##### Method: `getDiscountForProduct()`
```javascript
static getDiscountForProduct(category, daysUntilExpiry) {
  const rules = db.prepare(`
    SELECT discount_percentage 
    FROM pricing_rules 
    WHERE category = ? 
      AND days_until_expiry <= ?
      AND is_active = 1
    ORDER BY days_until_expiry DESC
    LIMIT 1
  `).get(category, daysUntilExpiry);
  
  return rules ? rules.discount_percentage : 0;
}
```

**Logic:**
1. Find all rules for this category
2. Filter to rules where threshold ≤ days left
3. Sort by threshold descending (get highest applicable)
4. Take first match (most specific rule)

**Example:**
- Product: Tomatoes (vegetables)
- Days left: 2
- Rules available: 5→0%, 3→15%, 2→30%, 1→50%, 0→70%
- Query finds: 2→30%, 1→50%, 0→70%
- Returns: 30% (highest days_until_expiry that matches)

##### Method: `calculateDiscountedPrice()`
```javascript
static calculateDiscountedPrice(basePrice, discountPercentage) {
  const discount = basePrice * (discountPercentage / 100);
  const newPrice = basePrice - discount;
  return Math.max(0, Math.round(newPrice * 100) / 100);
}
```

**Details:**
- Calculates discount amount
- Subtracts from base price
- Rounds to 2 decimal places (₪0.01 precision)
- Ensures never negative

**Example:**
- Base: ₪12.90
- Discount: 30%
- Calculation: 12.90 × 0.30 = 3.87
- New Price: 12.90 - 3.87 = 9.03

##### Method: `updateProductPricing()`
```javascript
static updateProductPricing(productId) {
  // 1. Get current product data
  const product = db.prepare(`SELECT ...`).get(productId);
  
  // 2. Calculate new discount
  const daysUntilExpiry = this.calculateDaysUntilExpiry(product.expiration_date);
  const newDiscount = this.getDiscountForProduct(product.category, daysUntilExpiry);
  const newPrice = this.calculateDiscountedPrice(product.base_price, newDiscount);
  
  // 3. Only update if changed
  if (newPrice !== product.current_price) {
    db.prepare(`UPDATE products SET ...`).run(newPrice, newDiscount, productId);
    db.prepare(`INSERT INTO price_history ...`).run(...);
  }
}
```

**Why Check for Changes?**
- Avoids unnecessary database writes
- Reduces history log noise
- Improves performance
- Only logs meaningful changes

##### Method: `updateAllPricing()`
```javascript
static updateAllPricing() {
  const products = db.prepare('SELECT id FROM products').all();
  const results = [];
  
  for (const product of products) {
    const result = this.updateProductPricing(product.id);
    if (result.updated) results.push(result);
  }
  
  return { totalProcessed, totalUpdated, updates: results };
}
```

**Purpose:**
- Called by cron job every 5 minutes
- Updates all products at once
- Returns summary for logging
- Used for manual recalculation

---

#### **novisignService.js** - External Integration

##### Method: `formatProductData()`
```javascript
formatProductData(product) {
  return {
    name: product.name_hebrew,           // Hebrew name for display
    category: product.category_hebrew,   
    originalPrice: `₪${product.base_price.toFixed(2)}`,
    discountPrice: `₪${product.current_price.toFixed(2)}`,
    discount: `${product.discount_percentage}%`,
    unit: product.unit,
    expiresIn: this.formatExpiryMessage(product.expiration_date),
    quantity: product.quantity,
    urgent: product.discount_percentage >= 50  // Red flag for high discounts
  };
}
```

**Design Decisions:**
- Formats all data for display (NoviSign receives ready-to-show data)
- Hebrew text for target audience
- Shekel symbol (₪) included
- `urgent` flag for visual styling
- All strings pre-formatted (reduces display logic)

##### Method: `formatExpiryMessage()`
```javascript
formatExpiryMessage(expirationDate) {
  const diffDays = /* calculate days */;
  
  if (diffDays === 0) return 'פג תוקף היום!';
  if (diffDays === 1) return 'פג תוקף מחר';
  if (diffDays < 0) return 'פג תוקף';
  
  return `פג תוקף בעוד ${diffDays} ימים`;
}
```

**Hebrew Messages:**
- "פג תוקף היום!" = Expires today!
- "פג תוקף מחר" = Expires tomorrow
- "פג תוקף" = Expired
- "פג תוקף בעוד X ימים" = Expires in X days

##### Method: `sendProductUpdate()`
```javascript
async sendProductUpdate(productId) {
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);
  const formattedData = this.formatProductData(product);
  
  const response = await axios.post(
    this.apiUrl,
    { data: formattedData },
    { headers: { 'X-API-KEY': this.apiKey } }
  );
  
  // Log successful event
  db.prepare(`INSERT INTO novisign_events ...`).run(...);
}
```

**Error Handling:**
- Try-catch wraps API call
- Logs both success and failure
- Stores error message for debugging
- Doesn't crash if NoviSign is down

---

### 3. Routes Layer (`backend/routes/`)

#### **products.js** - CRUD Operations

**GET /api/products**
```javascript
router.get('/', (req, res) => {
  const { category, search, expiring } = req.query;
  
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  // ... more filters
});
```

**Why "WHERE 1=1"?**
- Makes adding filters easier
- All conditions use AND
- Cleaner code than if/else chains

**POST /api/products**
```javascript
router.post('/', (req, res) => {
  // 1. Validate required fields
  if (!name_hebrew || !category || !base_price || !expiration_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // 2. Insert product
  const result = db.prepare(`INSERT INTO products ...`).run(...);
  
  // 3. Calculate initial pricing
  PricingEngine.updateProductPricing(result.lastInsertRowid);
  
  // 4. Return created product
  const newProduct = db.prepare(`SELECT * FROM products WHERE id = ?`)
    .get(result.lastInsertRowid);
});
```

**Flow:**
1. Validate input
2. Insert with base price as current price
3. Run pricing engine (applies discount if needed)
4. Return product with correct discount

#### **pricing.js** - Pricing Management

**POST /api/pricing/calculate**
```javascript
router.post('/calculate', (req, res) => {
  const results = PricingEngine.updateAllPricing();
  res.json({ success: true, ...results });
});
```

**Use Cases:**
- Manual recalculation button in UI
- After changing pricing rules
- Testing/debugging
- Backup to cron job

#### **novisign.js** - Display Control

**POST /api/novisign/bulk-update**
```javascript
router.post('/bulk-update', async (req, res) => {
  const { productIds } = req.body;
  
  let products;
  if (productIds) {
    // Send specific products
    products = db.prepare(`SELECT * WHERE id IN (...)`).all(...productIds);
  } else {
    // Send all discounted products (limit 10)
    products = db.prepare(`
      SELECT * WHERE discount_percentage > 0 
      ORDER BY discount_percentage DESC 
      LIMIT 10
    `).all();
  }
  
  await novisignService.sendBulkUpdate(productIds);
});
```

**Smart Defaults:**
- No IDs → sends top 10 discounts
- Sorts by discount (highest first)
- Limit 10 to avoid overwhelming displays

---

### 4. Utilities (`backend/utils/`)

#### **cronJobs.js** - Scheduled Tasks

```javascript
const cronExpression = `*/${updateInterval} * * * *`;

cron.schedule(cronExpression, async () => {
  const results = PricingEngine.updateAllPricing();
  
  if (results.totalUpdated > 0) {
    const productIds = results.updates.map(u => u.productId);
    await novisignService.sendBulkUpdate(productIds);
  }
});
```

**Cron Expression:** `*/5 * * * *`
- `*/5` = every 5 minutes
- `*` = every hour
- `*` = every day
- `*` = every month
- `*` = every day of week

**Why Every 5 Minutes?**
- Frequent enough for real-time feel
- Not too aggressive (API rate limits)
- Battery/resource friendly
- Configurable via .env

**Automatic Flow:**
1. Every 5 minutes, calculate all prices
2. If any changed, get their IDs
3. Send bulk update to NoviSign
4. Display shows new prices within 5 minutes

---

### 5. Server (`backend/server.js`)

```javascript
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/products', productsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/novisign', novisignRoutes);

// Catch-all: serve frontend for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
```

**Routing Strategy:**
- `/api/*` → API endpoints
- Everything else → Frontend SPA
- Enables client-side routing
- Single page application behavior

---

## 🎨 Frontend Components Explained

### HTML Structure (`frontend/index.html`)

```html
<html lang="he" dir="rtl">
```

**RTL Layout:**
- `dir="rtl"` = Right-to-left text direction
- Hebrew naturally flows right-to-left
- Flips entire layout automatically
- Buttons, forms, everything mirrors

**Tab Structure:**
```html
<nav class="nav-tabs">
  <button data-tab="dashboard">לוח בקרה</button>
  <button data-tab="products">מלאי</button>
  <button data-tab="novisign">NoviSign</button>
</nav>

<div class="tab-content active" id="dashboard-tab">...</div>
<div class="tab-content" id="products-tab">...</div>
<div class="tab-content" id="novisign-tab">...</div>
```

**Why Tabs?**
- Single page application
- No page reloads
- Faster navigation
- Shared state
- Better UX for hackathon demo

### CSS Design (`frontend/styles.css`)

**Hebrew Font:**
```css
font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Why Heebo?**
- Google Font
- Designed for Hebrew
- Multiple weights
- Modern, clean appearance
- Free and web-optimized

**RTL Adjustments:**
```css
.modal-content {
  direction: rtl;
  text-align: right;
}
```

**Color System:**
```css
--primary-color: #2563eb;    /* Blue - trust, professional */
--success-color: #10b981;     /* Green - savings, good */
--warning-color: #f59e0b;     /* Orange - caution */
--danger-color: #ef4444;      /* Red - urgent, expiring */
```

**Visual Hierarchy:**
- Red = Urgent (expires today/tomorrow)
- Orange = Warning (2-3 days)
- Green = Good (4+ days)
- Blue = Action/primary buttons

### JavaScript Logic (`frontend/app.js`)

#### State Management
```javascript
let currentProducts = [];  // Cache products locally
let currentTab = 'dashboard';  // Track active tab
```

**Why Local State?**
- Avoid repeated API calls
- Faster filtering/searching
- Better UX (instant response)
- Reduces server load

#### Tab Switching
```javascript
function switchTab(tabName) {
  // Update UI
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Load data
  switch (tabName) {
    case 'dashboard': loadDashboard(); break;
    case 'products': loadProducts(); break;
    case 'novisign': loadNoviSignTab(); break;
  }
}
```

**Pattern:**
1. Update visual state (active tab)
2. Hide all content sections
3. Show selected section
4. Load fresh data for that section

#### Product Display
```javascript
function displayProducts(products) {
  tbody.innerHTML = products.map(product => `
    <tr>
      <td>${product.name_hebrew}</td>
      <td>₪${product.current_price.toFixed(2)}</td>
      <td>
        <span class="discount-badge ${getDiscountClass(product.discount_percentage)}">
          ${product.discount_percentage}%
        </span>
      </td>
    </tr>
  `).join('');
}
```

**Template Literals:**
- Clean HTML generation
- Data binding
- Conditional rendering
- No framework needed

#### Helper Functions
```javascript
function formatExpiryDays(days) {
  if (days < 0) return 'פג תוקף';
  if (days === 0) return 'פג תוקף היום';
  if (days === 1) return 'פג תוקף מחר';
  return `${days} ימים`;
}
```

**Purpose:**
- Consistent Hebrew formatting
- User-friendly messages
- DRY (Don't Repeat Yourself)
- Easy to modify

#### Toast Notifications
```javascript
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-message">${message}</div>`;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}
```

**UX Pattern:**
- Non-blocking feedback
- Auto-dismiss after 3 seconds
- Color-coded by type
- Stacks multiple toasts
- Slide-in animation

---

## 🔄 Complete Data Flow Example

### Scenario: Adding a New Product

1. **User Action:**
   - Clicks "הוסף מוצר" button
   - Fills form with "גזר" (Carrots)
   - Expiration: Tomorrow
   - Clicks "שמור"

2. **Frontend (`app.js`):**
   ```javascript
   async function handleProductSubmit(e) {
     e.preventDefault();
     const productData = { name_hebrew: 'גזר', expiration_date: '2025-01-18', ... };
     
     const response = await fetch(`${API_URL}/products`, {
       method: 'POST',
       body: JSON.stringify(productData)
     });
   }
   ```

3. **Backend Route (`products.js`):**
   ```javascript
   router.post('/', (req, res) => {
     // Insert product
     const result = db.prepare(`INSERT INTO products ...`).run(productData);
     
     // Calculate pricing
     PricingEngine.updateProductPricing(result.lastInsertRowid);
   });
   ```

4. **Pricing Engine (`pricingEngine.js`):**
   ```javascript
   static updateProductPricing(productId) {
     // Get product
     const product = db.prepare(`SELECT ...`).get(productId);
     
     // Calculate: Tomorrow = 1 day → 50% discount
     const daysUntilExpiry = 1;
     const discount = 50;
     const newPrice = 8.90 * 0.5 = 4.45;
     
     // Update
     db.prepare(`UPDATE products SET current_price = 4.45, discount_percentage = 50 ...`);
   }
   ```

5. **Response to Frontend:**
   ```json
   {
     "success": true,
     "product": {
       "id": 11,
       "name_hebrew": "גזר",
       "base_price": 8.90,
       "current_price": 4.45,
       "discount_percentage": 50
     }
   }
   ```

6. **UI Update:**
   ```javascript
   showToast('המוצר נוסף בהצלחה', 'success');
   await loadProducts();  // Refresh table
   ```

7. **Cron Job (Next Run):**
   ```javascript
   // In 5 minutes
   PricingEngine.updateAllPricing();  // Rechecks all products
   novisignService.sendBulkUpdate();  // Includes new carrot
   ```

8. **NoviSign Display:**
   - Receives update
   - Shows: גזר | 50% | ₪8.90 → ₪4.45
   - Red urgent badge (>50% discount)

---

## 🎓 Key Learning Points

### 1. Database Design
- **Denormalization for performance** (storing calculated prices)
- **Audit trails** (price_history table)
- **Soft deletes via status** (could add is_deleted column)

### 2. API Design
- **RESTful conventions** (GET/POST/PUT/DELETE)
- **Consistent response format** ({ success, data/error })
- **Query parameters for filtering** (flexible, cacheable)

### 3. Frontend Patterns
- **Tab-based navigation** (single page app)
- **Optimistic updates** (instant feedback)
- **Progressive enhancement** (works without JS for basics)

### 4. External Integration
- **Retry logic** (could add for failed NoviSign calls)
- **Event logging** (track all external calls)
- **Graceful degradation** (app works if NoviSign is down)

### 5. Internationalization
- **Hebrew-first design**
- **RTL layout support**
- **Currency formatting** (₪)
- **Date localization** (Israeli format)

---

## 🚀 Production Considerations

### What Would Need to Change?

1. **Database:**
   - PostgreSQL instead of SQLite
   - Connection pooling
   - Database migrations
   - Indexes on frequently queried columns

2. **Authentication:**
   - User login system
   - JWT tokens
   - Role-based access control
   - Audit logging

3. **Error Handling:**
   - Structured logging (Winston, Pino)
   - Error monitoring (Sentry)
   - Rate limiting
   - Input validation library (Joi, Zod)

4. **Performance:**
   - Caching layer (Redis)
   - CDN for static files
   - Database query optimization
   - Load balancing

5. **Testing:**
   - Unit tests (Jest)
   - Integration tests
   - E2E tests (Playwright)
   - Load testing

6. **Deployment:**
   - Docker containers
   - CI/CD pipeline
   - Environment management
   - Monitoring & alerts

---

## 📚 Further Reading

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [node-cron Examples](https://www.npmjs.com/package/node-cron)
- [Hebrew Web Typography](https://fonts.google.com/?subset=hebrew)
- [NoviSign API Docs](https://novisign.com)

---

**Built for WasteLess Hackathon 2025** 🚀
