/**
 * Script to test the admin orders query
 * Run with: node test-admin-query.js
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

async function testAdminQuery() {
  // Create the connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Testing admin orders query...');
    
    // Run the same query that's used in the admin dashboard
    const [orders] = await pool.query(`
      SELECT 
          o.*,
          COALESCE(o.full_name, buyer.name) as buyer_name,
          buyer.email as buyer_email,
          (
              SELECT COUNT(*) 
              FROM order_items 
              WHERE order_id = o.id
          ) as item_count,
          (
              CASE 
                  WHEN o.book_id IS NOT NULL THEN 
                      (SELECT title FROM books WHERE id = o.book_id)
                  ELSE 
                      (
                          SELECT GROUP_CONCAT(b.title SEPARATOR ', ') 
                          FROM order_items oi 
                          JOIN books b ON oi.book_id = b.id 
                          WHERE oi.order_id = o.id
                          LIMIT 2
                      )
              END
          ) as book_titles
      FROM orders o
      JOIN users buyer ON o.buyer_id = buyer.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${orders.length} orders.`);
    
    // Display the results
    orders.forEach(order => {
      console.log(`\nOrder #${order.id}:`);
      console.log(`  Buyer: ${order.buyer_name} (${order.buyer_email})`);
      console.log(`  Reference: ${order.order_reference || 'N/A'}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Created: ${new Date(order.created_at).toLocaleString()}`);
      
      if (order.book_id) {
        console.log(`  Book: ${order.book_titles}`);
        console.log(`  Price: ₹${order.price}`);
      } else if (order.item_count > 0) {
        console.log(`  Items: ${order.item_count}`);
        console.log(`  Books: ${order.book_titles || 'N/A'}`);
        console.log(`  Total: ₹${order.order_total || 'N/A'}`);
      } else {
        console.log(`  No items found`);
      }
    });
    
  } catch (error) {
    console.error('Error testing admin query:', error);
  } finally {
    await pool.end();
    console.log('\nTest complete.');
  }
}

// Run the test
testAdminQuery(); 