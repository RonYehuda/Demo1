const { initDatabase, exec, run, closeDatabase } = require('./db');

async function seed() {
  console.log('🌱 Seeding database with sample products...');

  await initDatabase();

  // Helper function to get date string
  function getDateString(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  // Calculate discount based on days to expiry
  function calculateDiscount(daysToExpiry) {
    if (daysToExpiry >= 5) return 0;
    if (daysToExpiry >= 3) return 15;
    if (daysToExpiry === 2) return 30;
    if (daysToExpiry === 1) return 50;
    return 70; // Same day
  }

  // Sample products
  const products = [
    {
      name_he: 'עגבניות',
      name_en: 'Tomatoes',
      category: 'vegetables',
      category_he: 'ירקות',
      base_price: 12.90,
      quantity: 50,
      unit: 'ק"ג',
      days_to_expiry: 2,
      batch_number: 'VEG-2024-001'
    },
    {
      name_he: 'מלפפונים',
      name_en: 'Cucumbers',
      category: 'vegetables',
      category_he: 'ירקות',
      base_price: 9.90,
      quantity: 40,
      unit: 'ק"ג',
      days_to_expiry: 1,
      batch_number: 'VEG-2024-002'
    },
    {
      name_he: 'פלפלים',
      name_en: 'Bell Peppers',
      category: 'vegetables',
      category_he: 'ירקות',
      base_price: 14.90,
      quantity: 35,
      unit: 'ק"ג',
      days_to_expiry: 3,
      batch_number: 'VEG-2024-003'
    },
    {
      name_he: 'חסה',
      name_en: 'Lettuce',
      category: 'salads',
      category_he: 'סלטים',
      base_price: 7.90,
      quantity: 25,
      unit: 'יחידה',
      days_to_expiry: 2,
      batch_number: 'SAL-2024-001'
    },
    {
      name_he: 'תפוחים',
      name_en: 'Apples',
      category: 'fruits',
      category_he: 'פירות',
      base_price: 11.90,
      quantity: 60,
      unit: 'ק"ג',
      days_to_expiry: 5,
      batch_number: 'FRU-2024-001'
    },
    {
      name_he: 'בננות',
      name_en: 'Bananas',
      category: 'fruits',
      category_he: 'פירות',
      base_price: 8.90,
      quantity: 45,
      unit: 'ק"ג',
      days_to_expiry: 1,
      batch_number: 'FRU-2024-002'
    },
    {
      name_he: 'תפוזים',
      name_en: 'Oranges',
      category: 'fruits',
      category_he: 'פירות',
      base_price: 10.90,
      quantity: 55,
      unit: 'ק"ג',
      days_to_expiry: 4,
      batch_number: 'FRU-2024-003'
    },
    {
      name_he: 'פטרוזיליה',
      name_en: 'Parsley',
      category: 'herbs',
      category_he: 'עשבי תיבול',
      base_price: 5.90,
      quantity: 20,
      unit: 'אגודה',
      days_to_expiry: 1,
      batch_number: 'HRB-2024-001'
    },
    {
      name_he: 'כוסברה',
      name_en: 'Cilantro',
      category: 'herbs',
      category_he: 'עשבי תיבול',
      base_price: 5.90,
      quantity: 15,
      unit: 'אגודה',
      days_to_expiry: 2,
      batch_number: 'HRB-2024-002'
    },
    {
      name_he: 'תותים',
      name_en: 'Strawberries',
      category: 'fruits',
      category_he: 'פירות',
      base_price: 19.90,
      quantity: 30,
      unit: 'קופסה',
      days_to_expiry: 0,
      batch_number: 'FRU-2024-004'
    }
  ];

  // Clear existing products
  exec('DELETE FROM products');
  exec('DELETE FROM price_history');

  // Insert products
  for (const product of products) {
    const discount = calculateDiscount(product.days_to_expiry);
    const currentPrice = Math.round(product.base_price * (1 - discount / 100) * 100) / 100;
    const expiryDate = getDateString(product.days_to_expiry);

    run(
      `INSERT INTO products (
        name_he, name_en, category, category_he, base_price, current_price,
        discount_percent, quantity, unit, expiry_date, batch_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.name_he,
        product.name_en,
        product.category,
        product.category_he,
        product.base_price,
        currentPrice,
        discount,
        product.quantity,
        product.unit,
        expiryDate,
        product.batch_number
      ]
    );
  }

  closeDatabase();

  console.log('✅ Successfully inserted 10 sample products');
  console.log('📦 Products include: vegetables, fruits, herbs, and salads');
  console.log('🇮🇱 All products have Hebrew names and categories');
  console.log('📅 Products have varying expiration dates for testing');
}

seed().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
