# WasteLess API Documentation

## Base URL
```
http://localhost:3000/api
```

---

## 📦 Products Endpoints

### Get All Products
```http
GET /api/products
```

**Query Parameters:**
- `category` (optional) - Filter by category: vegetables, fruits, herbs, salads
- `search` (optional) - Search in product names (Hebrew or English)
- `expiring` (optional) - Filter by days until expiry (e.g., 1, 2, 3, 7)

**Example:**
```bash
GET /api/products?category=vegetables&expiring=2
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "products": [
    {
      "id": 1,
      "name": "Tomatoes",
      "name_hebrew": "עגבניות",
      "category": "vegetables",
      "category_hebrew": "ירקות",
      "base_price": 12.90,
      "current_price": 9.03,
      "discount_percentage": 30,
      "quantity": 50,
      "unit": "ק\"ג",
      "expiration_date": "2025-01-19",
      "batch_number": "VEG-2024-001",
      "barcode": "7290000001",
      "days_until_expiry": 2,
      "created_at": "2025-01-17 10:00:00",
      "updated_at": "2025-01-17 10:05:00"
    }
  ]
}
```

---

### Get Single Product
```http
GET /api/products/:id
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": 1,
    "name_hebrew": "עגבניות",
    "base_price": 12.90,
    "current_price": 9.03,
    "discount_percentage": 30,
    "days_until_expiry": 2,
    "price_history": [
      {
        "id": 1,
        "old_price": 12.90,
        "new_price": 9.03,
        "discount_percentage": 30,
        "reason": "Auto-update: 2 days until expiry",
        "changed_at": "2025-01-17 10:05:00"
      }
    ]
  }
}
```

---

### Create Product
```http
POST /api/products
```

**Request Body:**
```json
{
  "name": "Carrots",
  "name_hebrew": "גזר",
  "category": "vegetables",
  "category_hebrew": "ירקות",
  "base_price": 8.90,
  "quantity": 30,
  "unit": "ק\"ג",
  "expiration_date": "2025-01-18",
  "batch_number": "VEG-2024-011",
  "barcode": "7290000011"
}
```

**Required Fields:**
- `name_hebrew`
- `category`
- `base_price`
- `expiration_date`

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "id": 11,
    "name_hebrew": "גזר",
    "current_price": 4.45,
    "discount_percentage": 50
  }
}
```

---

### Update Product
```http
PUT /api/products/:id
```

**Request Body:** (all fields optional)
```json
{
  "name_hebrew": "גזר מתוק",
  "base_price": 9.90,
  "quantity": 25,
  "expiration_date": "2025-01-19"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "product": {
    "id": 11,
    "name_hebrew": "גזר מתוק",
    "current_price": 6.93,
    "discount_percentage": 30
  }
}
```

---

### Delete Product
```http
DELETE /api/products/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

### Get Product Statistics
```http
GET /api/products/stats/summary
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 10,
    "on_discount": 6,
    "expiring_soon": 7,
    "total_quantity": 355,
    "categories": [
      { "category_hebrew": "ירקות", "count": 3 },
      { "category_hebrew": "פירות", "count": 4 },
      { "category_hebrew": "תבלינים", "count": 2 },
      { "category_hebrew": "עלים", "count": 1 }
    ]
  }
}
```

---

## 💰 Pricing Endpoints

### Get Pricing Rules
```http
GET /api/pricing/rules
```

**Query Parameters:**
- `category` (optional) - Filter by category

**Response:**
```json
{
  "success": true,
  "count": 20,
  "rules": [
    {
      "id": 1,
      "category": "vegetables",
      "days_until_expiry": 5,
      "discount_percentage": 0,
      "is_active": 1
    },
    {
      "id": 2,
      "category": "vegetables",
      "days_until_expiry": 3,
      "discount_percentage": 15,
      "is_active": 1
    }
  ]
}
```

---

### Create Pricing Rule
```http
POST /api/pricing/rules
```

**Request Body:**
```json
{
  "category": "vegetables",
  "days_until_expiry": 4,
  "discount_percentage": 20
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pricing rule created successfully",
  "rule": {
    "id": 21,
    "category": "vegetables",
    "days_until_expiry": 4,
    "discount_percentage": 20
  }
}
```

---

### Update Pricing Rule
```http
PUT /api/pricing/rules/:id
```

**Request Body:**
```json
{
  "discount_percentage": 25,
  "is_active": 1
}
```

---

### Delete Pricing Rule
```http
DELETE /api/pricing/rules/:id
```

---

### Recalculate All Prices
```http
POST /api/pricing/calculate
```

**Response:**
```json
{
  "success": true,
  "message": "Price calculation completed",
  "totalProcessed": 10,
  "totalUpdated": 6,
  "updates": [
    {
      "updated": true,
      "productId": 1,
      "oldPrice": 12.90,
      "newPrice": 9.03,
      "oldDiscount": 0,
      "newDiscount": 30,
      "daysUntilExpiry": 2
    }
  ]
}
```

---

### Recalculate Single Product Price
```http
POST /api/pricing/calculate/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Product pricing updated",
  "updated": true,
  "productId": 1,
  "newPrice": 9.03,
  "newDiscount": 30
}
```

---

### Get Pricing Summary
```http
GET /api/pricing/summary
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_products": 10,
    "discounted_products": 6,
    "avg_discount": 41.7,
    "total_base_value": 1257.00,
    "total_current_value": 891.45,
    "total_savings": 365.55,
    "by_category": [
      {
        "category_hebrew": "ירקות",
        "count": 2,
        "avg_discount": 40,
        "category_savings": 73.50
      }
    ],
    "expiring_today": 1,
    "expiring_tomorrow": 3
  }
}
```

---

### Get Price History
```http
GET /api/pricing/history/:productId
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "history": [
    {
      "id": 1,
      "product_id": 1,
      "old_price": 12.90,
      "new_price": 9.03,
      "discount_percentage": 30,
      "reason": "Auto-update: 2 days until expiry",
      "changed_at": "2025-01-17 10:05:00"
    }
  ]
}
```

---

## 📺 NoviSign Endpoints

### Trigger Single Product Update
```http
POST /api/novisign/trigger/:productId
```

**Response:**
```json
{
  "success": true,
  "message": "Product update sent to NoviSign",
  "product": {
    "name": "עגבניות",
    "category": "ירקות",
    "originalPrice": "₪12.90",
    "discountPrice": "₪9.03",
    "discount": "30%",
    "unit": "ק\"ג",
    "expiresIn": "פג תוקף בעוד 2 ימים",
    "quantity": 50,
    "urgent": false
  }
}
```

---

### Bulk Update (Multiple Products)
```http
POST /api/novisign/bulk-update
```

**Request Body:** (optional)
```json
{
  "productIds": [1, 2, 3]
}
```

If no productIds provided, sends all discounted products (max 10).

**Response:**
```json
{
  "success": true,
  "message": "Bulk update sent to NoviSign",
  "count": 6,
  "products": [
    {
      "name": "עגבניות",
      "discount": "30%",
      "originalPrice": "₪12.90",
      "discountPrice": "₪9.03"
    }
  ]
}
```

---

### Update All Discounted Products
```http
POST /api/novisign/update-discounted
```

Sends all products with active discounts to NoviSign.

**Response:**
```json
{
  "success": true,
  "message": "All discounted products sent to NoviSign",
  "count": 6
}
```

---

### Get NoviSign Event Log
```http
GET /api/novisign/events
```

**Query Parameters:**
- `limit` (optional) - Number of events to return (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 15,
  "events": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "עגבניות",
      "event_type": "product_update",
      "status": "success",
      "payload": "{...}",
      "sent_at": "2025-01-17 10:15:00"
    },
    {
      "id": 2,
      "event_type": "bulk_update",
      "status": "success",
      "sent_at": "2025-01-17 10:20:00"
    }
  ]
}
```

---

### Test NoviSign Connection
```http
POST /api/novisign/test
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

Or if failed:
```json
{
  "success": false,
  "error": "Request failed with status code 401"
}
```

---

### Preview Display Data
```http
GET /api/novisign/preview
```

Shows what will be sent to NoviSign displays without actually sending.

**Response:**
```json
{
  "success": true,
  "count": 6,
  "preview": [
    {
      "name": "תותים",
      "category": "פירות",
      "originalPrice": "₪19.90",
      "discountPrice": "₪5.97",
      "discount": "70%",
      "unit": "ק\"ג",
      "expiresIn": "פג תוקף היום!",
      "quantity": 30,
      "urgent": true
    }
  ]
}
```

---

## 🏥 Health Check

### Server Health
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "WasteLess Dynamic Pricing API is running",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## ⚠️ Error Responses

All endpoints follow consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📝 Notes

1. All prices are in Israeli Shekels (₪)
2. Dates are in ISO format: `YYYY-MM-DD`
3. Times are in ISO format: `YYYY-MM-DD HH:MM:SS`
4. The system automatically recalculates prices every 5 minutes
5. Hebrew text is UTF-8 encoded
6. All endpoints return JSON

---

## 🧪 Testing with cURL

### Get all products
```bash
curl http://localhost:3000/api/products
```

### Create a product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name_hebrew": "גזר",
    "category": "vegetables",
    "base_price": 8.90,
    "expiration_date": "2025-01-18",
    "quantity": 30
  }'
```

### Recalculate prices
```bash
curl -X POST http://localhost:3000/api/pricing/calculate
```

### Update NoviSign
```bash
curl -X POST http://localhost:3000/api/novisign/bulk-update
```

---

## 🔗 Integration Example (JavaScript)

```javascript
// Fetch all products
const products = await fetch('http://localhost:3000/api/products')
  .then(res => res.json());

// Add new product
const newProduct = await fetch('http://localhost:3000/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name_hebrew: 'גזר',
    category: 'vegetables',
    base_price: 8.90,
    expiration_date: '2025-01-18',
    quantity: 30
  })
}).then(res => res.json());

// Update NoviSign displays
const updated = await fetch('http://localhost:3000/api/novisign/bulk-update', {
  method: 'POST'
}).then(res => res.json());
```
