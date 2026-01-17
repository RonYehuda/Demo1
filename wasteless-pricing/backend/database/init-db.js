const { initDatabase, exec, run, closeDatabase, dbPath } = require('./db');

async function initialize() {
  console.log('🗄️  Initializing WasteLess Database...');

  await initDatabase();

  // Create tables
  exec(`
    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_he TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL,
      category_he TEXT NOT NULL,
      base_price REAL NOT NULL,
      current_price REAL NOT NULL,
      discount_percent INTEGER DEFAULT 0,
      quantity INTEGER NOT NULL,
      unit TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      batch_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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
  console.log('📊 Tables created: products, pricing_rules, price_history, novisign_events');
  console.log('⚙️  Default pricing rules added for all produce categories');
}

initialize().catch(err => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
