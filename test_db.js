// Test script to check database connectivity and product creation
import mysql from 'mysql2/promise';

async function testDatabase() {
  let connection;
  try {
    // Create a connection to the database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Sudo',
      database: 'spice_inventory'
    });

    console.log('Connected to MySQL database successfully');

    // Check if products table exists
    const [tables] = await connection.execute(`SHOW TABLES LIKE 'products'`);
    if (tables.length === 0) {
      console.log("Products table doesn't exist, creating it...");
      await connection.execute(`
        CREATE TABLE products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category_id INT NOT NULL,
          origin VARCHAR(255),
          description TEXT,
          price DECIMAL(10,2) DEFAULT 0,
          unit VARCHAR(50) DEFAULT 'kg',
          stocks_qty INT DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          image_path VARCHAR(255)
        )
      `);
      console.log("Products table created successfully");
    } else {
      console.log("Products table already exists");

      // Check table structure
      const [columns] = await connection.execute(`DESCRIBE products`);
      console.log("Current table structure:", columns);
    }

    // Check if categories table exists
    const [catTables] = await connection.execute(`SHOW TABLES LIKE 'categories'`);
    if (catTables.length === 0) {
      console.log("Categories table doesn't exist, creating it...");
      await connection.execute(`
        CREATE TABLE categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT
        )
      `);
      console.log("Categories table created successfully");

      // Insert a default category
      await connection.execute(`
        INSERT INTO categories (name, description)
        VALUES ('Default', 'Default category for products')
      `);
      console.log("Default category created");
    } else {
      console.log("Categories table already exists");

      // Check if there's at least one category
      const [categories] = await connection.execute(`SELECT * FROM categories LIMIT 1`);
      if (categories.length === 0) {
        await connection.execute(`
          INSERT INTO categories (name, description)
          VALUES ('Default', 'Default category for products')
        `);
        console.log("Default category created");
      }
    }

    // Try to insert a test product
    console.log("Attempting to insert a test product...");
    const [result] = await connection.execute(`
      INSERT INTO products (name, category_id, origin, description, price, unit, stocks_qty, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Test Product',
      1, // Using category ID 1
      'Test Origin',
      'Test Description',
      9.99,
      'kg',
      100,
      true
    ]);

    console.log("Product inserted successfully:", result);

    // Retrieve the product to verify
    const [products] = await connection.execute(`SELECT * FROM products WHERE id = ?`, [result.insertId]);
    console.log("Retrieved product:", products[0]);

    // List all products
    const [allProducts] = await connection.execute(`SELECT * FROM products`);
    console.log(`Total products in database: ${allProducts.length}`);

  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

testDatabase();
