/**
 * Script to check recent orders
 * Run with: node check-recent-orders.js
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

async function checkRecentOrders() {
  // Create the connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Checking recent orders...');
    
    // Get all orders
    console.log('\nAll orders:');
    const [orders] = await pool.query(`
      SELECT o.*, u.name as buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ORDER BY o.created_at DESC
    `);
    
    console.log(`Found ${orders.length} orders in total.`);
    
    // Display the 5 most recent orders
    console.log('\n5 most recent orders:');
    for (let i = 0; i < Math.min(5, orders.length); i++) {
      const order = orders[i];
      console.log(`Order #${order.id}:`);
      console.log(`  Buyer: ${order.buyer_name} (ID: ${order.buyer_id})`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Created: ${order.created_at}`);
      
      if (order.book_id) {
        // Legacy format order (single book)
        try {
          const [book] = await pool.query(`
            SELECT title, author, price FROM books WHERE id = ?
          `, [order.book_id]);
          
          if (book.length > 0) {
            console.log(`  Book: "${book[0].title}" by ${book[0].author} (ID: ${order.book_id})`);
            console.log(`  Price: ₹${order.price || book[0].price}`);
          } else {
            console.log(`  Book ID: ${order.book_id} (book not found)`);
          }
        } catch (error) {
          console.log(`  Error fetching book details: ${error.message}`);
        }
      } else {
        // Check for order items
        try {
          const [items] = await pool.query(`
            SELECT oi.*, b.title, b.author
            FROM order_items oi
            JOIN books b ON oi.book_id = b.id
            WHERE oi.order_id = ?
          `, [order.id]);
          
          if (items.length > 0) {
            console.log(`  Order Items (${items.length}):`);
            items.forEach((item, index) => {
              console.log(`    ${index + 1}. "${item.title}" by ${item.author} - ₹${item.price} x ${item.quantity}`);
            });
            console.log(`  Total: ₹${order.order_total || 'N/A'}`);
          } else {
            console.log(`  No items found for this order`);
          }
        } catch (error) {
          console.log(`  Error fetching order items: ${error.message}`);
        }
      }
      
      // Show shipping details if available
      if (order.full_name || order.address_line1) {
        console.log('  Shipping Details:');
        console.log(`    Name: ${order.full_name || 'N/A'}`);
        console.log(`    Address: ${order.address_line1 || 'N/A'}`);
        console.log(`    City: ${order.city || 'N/A'}, ${order.state || 'N/A'} ${order.postal_code || 'N/A'}`);
        console.log(`    Phone: ${order.phone_number || 'N/A'}`);
      }
      
      console.log(''); // Add an empty line between orders
    }
    
  } catch (error) {
    console.error('Error checking orders:', error);
  } finally {
    await pool.end();
    console.log('Check complete.');
  }
}

// Run the check
checkRecentOrders(); 