/**
 * Script to create a test multi-item order
 * Run with: node create-test-order.js
 */

const mysql = require('mysql2/promise');

// Database configuration with hardcoded credentials
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'shelfswap',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function createTestOrder() {
  // Create the connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Creating a test multi-item order...');
    
    // Check if we have at least 2 approved books in the system
    const [books] = await pool.query(`
      SELECT id, title, price, seller_id FROM books WHERE status = 'approved' LIMIT 3
    `);
    
    if (books.length < 2) {
      console.error('Not enough approved books in the system. Need at least 2 books.');
      return;
    }
    
    console.log(`Found ${books.length} approved books to use in test order.`);
    
    // Choose a buyer
    const [buyers] = await pool.query(`
      SELECT id, name FROM users WHERE role = 'buyer' OR role = 'admin' LIMIT 1
    `);
    
    if (buyers.length === 0) {
      console.error('No buyers found in the system.');
      return;
    }
    
    const buyer = buyers[0];
    console.log(`Using buyer: ${buyer.name} (ID: ${buyer.id})`);
    
    // Start transaction
    await pool.query('START TRANSACTION');
    
    // Create order reference
    const orderReference = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calculate total from books
    const items = books.map(book => ({
      book_id: book.id,
      price: book.price,
      quantity: 1
    }));
    
    const orderTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const shippingFee = 49;
    const platformFee = 19;
    
    // Create the order
    const [orderResult] = await pool.query(`
      INSERT INTO orders (
        buyer_id,
        order_reference,
        order_total,
        shipping_fee,
        platform_fee,
        full_name,
        phone_number,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        payment_method,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      buyer.id,
      orderReference,
      orderTotal,
      shippingFee,
      platformFee,
      'Test Customer',
      '9876543210',
      '123 Test Street',
      'Apartment 456',
      'Test City',
      'Test State',
      '500001',
      'India',
      'cash on delivery',
      'pending'
    ]);
    
    const orderId = orderResult.insertId;
    console.log(`Created order with ID: ${orderId} and reference: ${orderReference}`);
    
    // Create order items
    for (const item of items) {
      await pool.query(`
        INSERT INTO order_items (order_id, book_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [
        orderId,
        item.book_id,
        item.quantity,
        item.price
      ]);
      
      // Update book status to sold
      await pool.query(`
        UPDATE books SET status = 'sold' WHERE id = ?
      `, [item.book_id]);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log(`Successfully created test order with ${items.length} items.`);
    console.log(`Total order value: ₹${orderTotal} + ₹${shippingFee} shipping + ₹${platformFee} platform fee`);
    
    // Verify the order
    const [orderDetails] = await pool.query(`
      SELECT o.*, u.name as buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      WHERE o.id = ?
    `, [orderId]);
    
    console.log('\nOrder details:');
    console.log(orderDetails[0]);
    
    // Get order items
    const [orderItems] = await pool.query(`
      SELECT oi.*, b.title
      FROM order_items oi
      JOIN books b ON oi.book_id = b.id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    console.log('\nOrder items:');
    orderItems.forEach(item => {
      console.log(`- ${item.title} (₹${item.price})`);
    });
    
  } catch (error) {
    // Rollback on error
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error creating test order:', error);
  } finally {
    await pool.end();
    console.log('\nTest complete.');
  }
}

// Run the test
createTestOrder(); 