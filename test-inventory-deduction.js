// Test script for automatic inventory deduction
import mysql from 'mysql2/promise';

async function testInventoryDeduction() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sudo',
    database: 'spice_inventory'
  });

  try {
    console.log('=== Testing Automatic Inventory Deduction ===\n');

    // 1. Check existing orders
    console.log('1. Checking existing orders...');
    const [orders] = await connection.execute(`
      SELECT id, order_number, customer_name, status, total_amount 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('Existing orders:', orders);

    // 2. Check existing products
    console.log('\n2. Checking existing products...');
    const [products] = await connection.execute(`
      SELECT id, name, unit, stocks_qty, is_active 
      FROM products 
      WHERE is_active = 1 
      LIMIT 10
    `);
    console.log('Existing products:', products);

    // 3. Check existing inventory
    console.log('\n3. Checking existing inventory...');
    const [inventory] = await connection.execute(`
      SELECT i.id, i.product_id, p.name as product_name, i.batch_number, 
             i.quantity, i.unit_price, i.status
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.id
      WHERE i.status = 'active' AND i.quantity > 0
      ORDER BY i.expiry_date ASC
      LIMIT 10
    `);
    console.log('Existing inventory:', inventory);

    // 4. Create a test order if none exist
    if (orders.length === 0) {
      console.log('\n4. Creating test order...');
      const orderNumber = `TEST-${Date.now()}`;
      
      const [orderResult] = await connection.execute(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, delivery_address,
          subtotal, delivery_fee, total_amount, status, order_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNumber, 'Test Customer', '9999999999', 'Test Address',
        100.00, 0.00, 100.00, 'confirmed', 'showcase'
      ]);

      const orderId = orderResult.insertId;
      console.log(`Created test order with ID: ${orderId}`);

      // Add test order items
      await connection.execute(`
        INSERT INTO order_items (
          order_id, product_name, quantity, unit, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [orderId, 'Red Chili Powder', 0.5, 'kg', 200.00, 100.00]);

      console.log('Added test order item: Red Chili Powder (0.5 kg)');
    }

    console.log('\n=== Test Setup Complete ===');
    console.log('You can now test the automatic inventory deduction by:');
    console.log('1. Starting the server: npm run dev');
    console.log('2. Going to the Orders page in the admin panel');
    console.log('3. Marking an order as "delivered"');
    console.log('4. Checking the inventory to see if quantities were deducted');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testInventoryDeduction();
