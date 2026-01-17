# WasteLess Dynamic Pricing System - Setup Instructions

## 🚀 Quick Start Guide for Claude Code

This guide will help you set up and run the WasteLess Dynamic Pricing system in your IDE using Claude Code.

---

## 📋 Prerequisites

Before starting, ensure you have:
- **Node.js** (version 16 or higher) installed
- **npm** (comes with Node.js)
- A code editor (VS Code, Cursor, etc.)
- Claude Code CLI tool installed

---

## 🛠️ Step-by-Step Setup Instructions

### Step 1: Navigate to the Project Directory

```bash
cd wasteless-pricing
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `better-sqlite3` - SQLite database driver
- `axios` - HTTP client for NoviSign API
- `dotenv` - Environment variable management
- `node-cron` - Scheduled task runner
- `cors` - Cross-origin resource sharing

**Expected output:**
```
added 156 packages in 15s
```

### Step 3: Create Environment File

Create a `.env` file in the root directory:

```bash
# Copy the example env file
cp .env.example .env
```

Then edit `.env` with your NoviSign credentials:

```env
# Server Configuration
PORT=3000

# NoviSign Configuration
NOVISIGN_URL=https://app.novisign.com/catalog/{YOUR-ACCOUNT-KEY}/items/product-pricing
NOVISIGN_API_KEY=your_api_key_here

# Database
DB_PATH=./backend/database/wasteless.db

# Pricing Configuration (in minutes)
PRICE_UPDATE_INTERVAL=5
```

**⚠️ IMPORTANT**: Replace `{YOUR-ACCOUNT-KEY}` with your actual NoviSign Account Key.

To find your Account Key:
1. Go to NoviSign → Settings → Account Settings
2. Copy the "Account Key" value
3. Paste it in the `.env` file

### Step 4: Initialize the Database

```bash
npm run init-db
```

**Expected output:**
```
🗄️  Initializing WasteLess Database...
✅ Database initialized successfully!
📍 Database location: /path/to/backend/database/wasteless.db
📊 Tables created: products, pricing_rules, price_history, novisign_events
⚙️  Default pricing rules added for all produce categories
```

This creates:
- Database file at `backend/database/wasteless.db`
- All necessary tables
- Default pricing rules for produce categories

### Step 5: Seed Sample Data

```bash
npm run seed
```

**Expected output:**
```
🌱 Seeding database with sample products...
✅ Successfully inserted 10 sample products
📦 Products include: vegetables, fruits, herbs, and salads
🇮🇱 All products have Hebrew names and categories
📅 Products have varying expiration dates for testing
```

This adds 10 sample Hebrew produce items with:
- Tomatoes (עגבניות) - expires in 2 days
- Cucumbers (מלפפונים) - expires in 1 day
- Bell Peppers (פלפלים) - expires in 3 days
- Lettuce (חסה) - expires in 2 days
- Apples (תפוחים) - expires in 5 days
- Bananas (בננות) - expires in 1 day
- Oranges (תפוזים) - expires in 4 days
- Parsley (פטרוזיליה) - expires in 1 day
- Cilantro (כוסברה) - expires in 2 days
- Strawberries (תותים) - expires today (max discount!)

### Step 6: Start the Server

```bash
npm start
```

**Expected output:**
```
╔════════════════════════════════════════════════════════╗
║         🛒 WasteLess Dynamic Pricing System            ║
╚════════════════════════════════════════════════════════╝

🚀 Server running at http://localhost:3000
📊 Database: backend/database/wasteless.db
📺 NoviSign URL: https://app.novisign.com/catalog/...
⏰ Auto-update interval: 5 minutes

API Endpoints:
  GET    /api/health                    - Health check
  GET    /api/products                  - List all products
  POST   /api/products                  - Create product
  PUT    /api/products/:id              - Update product
  DELETE /api/products/:id              - Delete product
  GET    /api/pricing/summary           - Pricing analytics
  POST   /api/pricing/calculate         - Recalculate all prices
  POST   /api/novisign/bulk-update      - Update NoviSign displays
  GET    /api/novisign/preview          - Preview display data

Press Ctrl+C to stop the server
════════════════════════════════════════════════════════
🔄 Running automatic price update...
✅ Updated 6 products
📺 NoviSign displays updated
```

### Step 7: Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the WasteLess dashboard with:
- 📊 **Dashboard Tab** - Statistics and analytics
- 📦 **Inventory Tab** - Product management
- 📺 **NoviSign Tab** - Display control and preview

---

## 🎯 Testing the System

### Test 1: View Dashboard
1. Click on "לוח בקרה" (Dashboard) tab
2. You should see:
   - Total products: 10
   - Discounted products: 6 (items expiring soon)
   - Products expiring soon: 7
   - Total savings for customers

### Test 2: View Products
1. Click on "מלאי" (Inventory) tab
2. You'll see a table with all 10 products
3. Notice the color-coded expiry badges:
   - 🔴 Red = expires today or tomorrow (urgent)
   - 🟡 Yellow = expires in 2-3 days (warning)
   - 🟢 Green = expires in 4+ days (good)

### Test 3: Add a New Product
1. Click "הוסף מוצר" (Add Product) button
2. Fill in the form:
   - **שם המוצר (עברית)**: גזר
   - **שם באנגלית**: Carrots
   - **קטגוריה**: vegetables (ירקות auto-fills)
   - **מחיר בסיס**: 8.90
   - **כמות**: 30
   - **יחידת מידה**: ק"ג
   - **תאריך תפוגה**: (select tomorrow's date)
   - **מספר אצווה**: VEG-2024-011
3. Click "שמור" (Save)
4. The product appears in the table with automatic discount applied!

### Test 4: NoviSign Integration
1. Click on "NoviSign" tab
2. Click "עדכן את כל התצוגות" (Update All Displays)
3. The preview section shows how products will appear on digital displays:
   - Product name in Hebrew
   - Discount percentage (big red badge)
   - Original price (crossed out)
   - New discounted price (green, large)
   - Expiry information
4. Check the Event Log to see successful API calls

### Test 5: Search and Filter
1. Go to "מלאי" (Inventory) tab
2. Try searching: Type "עגבניות" in search box
3. Filter by category: Select "ירקות" from dropdown
4. Filter by expiry: Select "פג תוקף תוך יום"

---

## 🔍 Understanding the Pricing Algorithm

The system automatically calculates discounts based on days until expiry:

### Default Pricing Rules:

| Days to Expiry | Discount |
|---------------|----------|
| 5+ days       | 0%       |
| 3-4 days      | 15%      |
| 2 days        | 30%      |
| 1 day         | 50%      |
| Same day      | 70%      |

### Example Calculation:

**Tomatoes (עגבניות)**
- Base Price: ₪12.90
- Expires in: 2 days
- Discount Applied: 30%
- New Price: ₪9.03

**Strawberries (תותים)**
- Base Price: ₪19.90
- Expires: Today
- Discount Applied: 70%
- New Price: ₪5.97

---

## 📺 NoviSign Setup (Important!)

To complete the integration, you need to set up NoviSign:

### Step 1: Import the Creative File
1. In NoviSign, go to **Creatives**
2. Click **Import**
3. Upload `flight-event.nvc` (included in your uploaded files)
4. Rename it to `product-pricing`

### Step 2: Fix the Account Key (Expected Errors)
After importing, you'll see error indicators. This is normal!

1. Open the creative in **Edit mode**
2. Go to: **Load Preview Parameters**
3. Click `Click to change`
4. Edit the **API URL** field
5. Replace `{YOUR-ACCOUNT-KEY}` with your actual Account Key
6. Save changes

### Step 3: Create a Screen Event
1. Go to **Screens** tab
2. Select your screen → Click **Edit** (pencil icon)
3. Click **Events** button
4. Click **New Event**
5. Set up:
   - **Event Name**: product-pricing
   - **Event Duration**: 10 seconds
   - **Trigger**: Select your trigger (e.g., "Just number 1")
   - **Layout**: Full screen
   - **Transition**: Your choice
6. Click **Finish** → **Update**

### Step 4: Create Configuration
1. Click your account name → **Advanced Settings** → **Configurations**
2. Click **+ New Configuration**
3. **Config Name**: wasteless-pricing
4. Enable **API Integration** → Click "Click to change"
5. Click **Add**:
   - **Name**: pricing
   - **API URL**: `https://app.novisign.com/catalog/{YOUR-ACCOUNT-KEY}/items/product-pricing`
   - **Property key**: productUpdate
   - **Enable**: Send event on change `RFID:1`
6. Click **Save** → **OK** → **Update**

### Step 5: Link Configuration to Screen
1. Go to **Screens**
2. Find your screen → Click **three dots** → **Set Configuration**
3. Select `wasteless-pricing`
4. Click **OK**

---

## 🧪 Manual Testing Scenarios

### Scenario 1: Price Updates
1. Add a product expiring in 5 days (no discount)
2. Wait 5 minutes (or trigger manually via API)
3. Check that discount is still 0%
4. Change expiration date to 2 days from now
5. Discount should change to 30%

### Scenario 2: Batch Tracking
1. Add multiple products with same batch number
2. Track them in the inventory table
3. Filter or search by batch number

### Scenario 3: Real-time Display Updates
1. Add a new product with high discount (expires today)
2. Click "עדכן את כל התצוגות"
3. Check NoviSign display - product should appear
4. Delete the product
5. Update displays again - product disappears

---

## 🐛 Troubleshooting

### Problem: "Cannot find module 'better-sqlite3'"
**Solution:**
```bash
npm install
```

### Problem: Database not found
**Solution:**
```bash
npm run init-db
npm run seed
```

### Problem: Port 3000 already in use
**Solution:**
Edit `.env` file:
```env
PORT=3001
```
Then restart the server.

### Problem: NoviSign API returns 401 Unauthorized
**Solution:**
1. Check your `.env` file
2. Verify `NOVISIGN_API_KEY` is correct
3. Verify `NOVISIGN_URL` has your correct Account Key

### Problem: Products not showing discounts
**Solution:**
Manually trigger price calculation:
```bash
# Using curl or Postman
POST http://localhost:3000/api/pricing/calculate
```

Or click "רענן" (Refresh) in the UI.

---

## 📂 Project Structure

```
wasteless-pricing/
├── backend/
│   ├── database/
│   │   ├── db.js              # Database connection
│   │   ├── init-db.js         # Schema creation
│   │   ├── seed.js            # Sample data
│   │   └── wasteless.db       # SQLite database (created on init)
│   ├── routes/
│   │   ├── products.js        # Product CRUD endpoints
│   │   ├── pricing.js         # Pricing engine endpoints
│   │   └── novisign.js        # NoviSign integration endpoints
│   ├── services/
│   │   ├── pricingEngine.js   # Core pricing logic
│   │   └── novisignService.js # NoviSign API client
│   ├── utils/
│   │   └── cronJobs.js        # Scheduled tasks
│   └── server.js              # Main Express server
├── frontend/
│   ├── index.html             # Main UI (Hebrew, RTL)
│   ├── styles.css             # Custom styling
│   └── app.js                 # Frontend JavaScript
├── .env                       # Environment variables
├── .env.example               # Template for .env
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

---

## 🎬 Demo Preparation Checklist

For your hackathon demo, prepare:

- [ ] Server running (`npm start`)
- [ ] Browser open to `http://localhost:3000`
- [ ] Sample products loaded with varying expiration dates
- [ ] NoviSign configured and connected
- [ ] Story prepared: "SuperSave Grocery has 50 items expiring soon"

### Demo Script (5 minutes):

**Minute 1-2: The Problem**
- Show dashboard with expiring products
- Explain food waste costs
- Show potential savings

**Minute 2-3: The Solution**
- Navigate to inventory
- Show automatic discounts based on expiry
- Explain the pricing algorithm

**Minute 3-4: Add New Product**
- Click "Add Product"
- Add "גזר" (Carrots) expiring tomorrow
- Show instant discount calculation (50% off!)

**Minute 4-5: NoviSign Integration**
- Show display preview
- Click "Update All Displays"
- Explain how customers see real-time prices in-store

---

## 🔄 Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

**Output:**
```
⏹️  SIGINT received, shutting down gracefully...
⏹️  All cron jobs stopped
```

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify all dependencies are installed
4. Ensure `.env` file is configured correctly

---

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Server starts without errors
- ✅ Dashboard shows statistics
- ✅ Products table displays 10 items
- ✅ Discounts are applied based on expiry dates
- ✅ NoviSign preview shows formatted products
- ✅ Can add/edit/delete products via UI
- ✅ Price changes are logged in history

---

## 🚀 Next Steps

After basic setup:
1. Customize pricing rules for different categories
2. Add more products via the UI
3. Test with different expiration scenarios
4. Configure NoviSign display layouts
5. Practice your demo presentation

Good luck with your hackathon! 🎊
