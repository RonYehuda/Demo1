# 🚀 WasteLess - Quick Start for Claude Code

## One-Line Setup (Copy & Paste)

```bash
cd wasteless-pricing && npm install && npm run init-db && npm run seed && npm start
```

## Individual Commands

### 1. Install Dependencies
```bash
cd wasteless-pricing
npm install
```

### 2. Setup Environment
```bash
# Copy template
cp .env.example .env

# Edit with your NoviSign credentials
# Replace {YOUR-ACCOUNT-KEY} and your_api_key_here
```

### 3. Initialize Database
```bash
npm run init-db
```

### 4. Add Sample Data
```bash
npm run seed
```

### 5. Start Server
```bash
npm start
```

### 6. Open Browser
```
http://localhost:3000
```

---

## 🎯 Testing Checklist

- [ ] Dashboard shows 10 products
- [ ] 6 products have discounts
- [ ] Strawberries have 70% discount (expire today)
- [ ] Can add new product via "הוסף מוצר"
- [ ] NoviSign preview shows formatted products
- [ ] Search and filters work

---

## 📝 Quick Notes

**Default Port:** 3000 (change in .env if needed)

**Auto-update:** Every 5 minutes (configurable in .env)

**Sample Products:** 10 Hebrew produce items with varying expiration dates

**Database Location:** `backend/database/wasteless.db`

---

## 🐛 Quick Fixes

**Port in use?**
```bash
# Edit .env, change PORT=3000 to PORT=3001
```

**Database issues?**
```bash
rm backend/database/wasteless.db
npm run init-db
npm run seed
```

**Missing dependencies?**
```bash
npm install
```

---

## 📺 NoviSign Quick Setup

1. Get Account Key from: Settings → Account Settings
2. Update `.env` with your Account Key
3. Import `flight-event.nvc` to NoviSign
4. Create configuration "wasteless-pricing"
5. Link to your screen

---

## 🎬 Demo Flow (5 min)

1. Show Dashboard (stats)
2. Show Inventory (automatic discounts)
3. Add product "גזר" expiring tomorrow → 50% discount!
4. Update NoviSign displays
5. Show real-time preview

---

## 🛑 Stop Server

```bash
Ctrl + C
```

---

**Good Luck! 🍀**
