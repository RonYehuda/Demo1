const { initDatabase, exec, run, get, closeDatabase, dbPath } = require('./db');

async function initialize() {
  console.log('🗄️  Initializing WasteLess Database...');

  await initDatabase();

  // Create tables
  exec(`
    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL UNIQUE,
      name_he TEXT NOT NULL,
      icon TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_he TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL,
      category_he TEXT NOT NULL,
      category_id INTEGER,
      catalog_number TEXT,
      base_price REAL NOT NULL,
      current_price REAL NOT NULL,
      discount_percent INTEGER DEFAULT 0,
      quantity INTEGER NOT NULL,
      unit TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      batch_number TEXT,
      image_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Create index for catalog_number lookups
    CREATE INDEX IF NOT EXISTS idx_catalog_number ON products(catalog_number);

    -- Pricing rules table
    CREATE TABLE IF NOT EXISTS pricing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      days_to_expiry INTEGER NOT NULL,
      discount_percent INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Price history table
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      old_price REAL NOT NULL,
      new_price REAL NOT NULL,
      old_discount INTEGER NOT NULL,
      new_discount INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- NoviSign events log
    CREATE TABLE IF NOT EXISTS novisign_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT,
      response_status INTEGER,
      response_body TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default categories if not exist
  const defaultCategories = [
    { name_en: 'vegetables', name_he: 'ירקות', icon: 'bi-carrot', sort_order: 1 },
    { name_en: 'fruits', name_he: 'פירות', icon: 'bi-apple', sort_order: 2 },
    { name_en: 'herbs', name_he: 'עשבי תיבול', icon: 'bi-flower1', sort_order: 3 },
    { name_en: 'salads', name_he: 'סלטים', icon: 'bi-basket', sort_order: 4 },
    { name_en: 'dairy', name_he: 'מוצרי חלב', icon: 'bi-droplet', sort_order: 5 },
    { name_en: 'bakery', name_he: 'מאפים', icon: 'bi-basket2', sort_order: 6 }
  ];

  for (const cat of defaultCategories) {
    const exists = get('SELECT id FROM categories WHERE name_en = ?', [cat.name_en]);
    if (!exists) {
      run(
        'INSERT INTO categories (name_en, name_he, icon, sort_order) VALUES (?, ?, ?, ?)',
        [cat.name_en, cat.name_he, cat.icon, cat.sort_order]
      );
    }
  }

  // Clear existing rules
  exec('DELETE FROM pricing_rules');

  // Insert default pricing rules
  const defaultRules = [
    { category: 'vegetables', days: 5, discount: 0 },
    { category: 'vegetables', days: 4, discount: 15 },
    { category: 'vegetables', days: 3, discount: 15 },
    { category: 'vegetables', days: 2, discount: 30 },
    { category: 'vegetables', days: 1, discount: 50 },
    { category: 'vegetables', days: 0, discount: 70 },
    { category: 'fruits', days: 5, discount: 0 },
    { category: 'fruits', days: 4, discount: 15 },
    { category: 'fruits', days: 3, discount: 15 },
    { category: 'fruits', days: 2, discount: 30 },
    { category: 'fruits', days: 1, discount: 50 },
    { category: 'fruits', days: 0, discount: 70 },
    { category: 'herbs', days: 3, discount: 0 },
    { category: 'herbs', days: 2, discount: 30 },
    { category: 'herbs', days: 1, discount: 50 },
    { category: 'herbs', days: 0, discount: 70 },
    { category: 'salads', days: 3, discount: 0 },
    { category: 'salads', days: 2, discount: 30 },
    { category: 'salads', days: 1, discount: 50 },
    { category: 'salads', days: 0, discount: 70 },
  ];

  for (const rule of defaultRules) {
    run(
      'INSERT INTO pricing_rules (category, days_to_expiry, discount_percent) VALUES (?, ?, ?)',
      [rule.category, rule.days, rule.discount]
    );
  }

  closeDatabase();

  console.log('✅ Database initialized successfully!');
  console.log(`📍 Database location: ${dbPath}`);
  console.log('📊 Tables created: categories, products, pricing_rules, price_history, novisign_events');
  console.log('⚙️  Default categories and pricing rules added');
}

initialize().catch(err => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
