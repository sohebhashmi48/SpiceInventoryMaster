// Test script to check the product creation API directly with MySQL
import mysql from 'mysql2/promise';

async function testProductCreation() {
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

    // Check if there are any products in the database
    const [existingProducts] = await connection.execute('SELECT * FROM products');
    console.log(`Found ${existingProducts.length} existing products in the database`);

    // Insert a new product
    console.log('Inserting a new product...');
    const [result] = await connection.execute(`
      INSERT INTO products (name, category_id, origin, description, price, unit, stocks_qty, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'API Test Product ' + Date.now(),
      1, // Using category ID 1
      'API Test',
      'Product created via direct MySQL test',
      29.99,
      'kg',
      75,
      true
    ]);

    console.log('Product inserted successfully:', result);

    // Retrieve the newly inserted product
    const [products] = await connection.execute('SELECT * FROM products WHERE id = ?', [result.insertId]);
    console.log('Retrieved new product:', products[0]);

    // List all products again to confirm
    const [allProducts] = await connection.execute('SELECT * FROM products');
    console.log(`Now there are ${allProducts.length} products in the database`);

    // List all products with their details
    console.log('All products in the database:');
    allProducts.forEach(product => {
      console.log(`ID: ${product.id}, Name: ${product.name}, Category: ${product.category_id}, Price: ${product.price}`);
    });
  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

testProductCreation();
