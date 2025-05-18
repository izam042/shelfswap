/**
 * Test script to diagnose order issues
 * Run with: node test-orders.js
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Try to load environment variables, but use defaults if not available
dotenv.config();

// Database configuration with hardcoded credentials from .env
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'shelfswap',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function diagnoseOrders() {
  // Create the connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Diagnosing orders in database...');
    console.log('Using database configuration:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database
    });
    
    // Check orders table structure
    console.log('\n1. Checking orders table structure:');
    const [orderColumns] = await pool.query(`SHOW COLUMNS FROM orders`);
    console.log('Orders table columns:', orderColumns.map(col => `${col.Field} (${col.Type})`).join(', '));
    
    // Check order_items table structure
    console.log('\n2. Checking order_items table structure:');
    try {
      const [orderItemsColumns] = await pool.query(`SHOW COLUMNS FROM order_items`);
      console.log('Order_items table columns:', orderItemsColumns.map(col => `${col.Field} (${col.Type})`).join(', '));
    } catch (error) {
      console.error('Error: order_items table might not exist', error.message);
    }
    
    // Count orders in the system
    console.log('\n3. Counting orders:');
    const [orderCount] = await pool.query(`SELECT COUNT(*) as count FROM orders`);
    console.log(`Total orders: ${orderCount[0].count}`);
    
    // Get recent orders
    console.log('\n4. Recent orders:');
    const [recentOrders] = await pool.query(`
      SELECT o.id, o.buyer_id, o.book_id, o.seller_id, o.order_reference, 
             o.order_total, o.status, o.created_at,
             u.name as buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    
    if (recentOrders.length === 0) {
      console.log('No orders found in the database.');
    } else {
      console.log(`Found ${recentOrders.length} recent orders:`);
      recentOrders.forEach(order => {
        console.log(`- Order ID: ${order.id}, Reference: ${order.order_reference || 'N/A'}, Status: ${order.status}, Buyer: ${order.buyer_name}, Created: ${order.created_at}`);
      });
    }
    
    // Check order items
    if (recentOrders.length > 0) {
      console.log('\n5. Checking order items:');
      for (const order of recentOrders) {
        try {
          const [items] = await pool.query(`
            SELECT oi.*, b.title
            FROM order_items oi
            JOIN books b ON oi.book_id = b.id
            WHERE oi.order_id = ?
          `, [order.id]);
          
          if (items.length === 0) {
            if (order.book_id) {
              const [book] = await pool.query(`SELECT title FROM books WHERE id = ?`, [order.book_id]);
              console.log(`Order ${order.id}: Legacy format (single item), Book: ${book[0]?.title || 'Unknown'}, ID: ${order.book_id}`);
            } else {
              console.log(`Order ${order.id}: No order items found and no book_id`);
            }
          } else {
            console.log(`Order ${order.id}: ${items.length} items:`, items.map(item => `${item.title} (ID: ${item.book_id}, Qty: ${item.quantity})`).join(', '));
          }
        } catch (error) {
          console.error(`Error checking items for order ${order.id}:`, error.message);
        }
      }
    }
    
    // Try running the admin query
    console.log('\n6. Testing admin orders query:');
    const [adminOrders] = await pool.query(`
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
      LIMIT 5
    `);
    
    if (adminOrders.length === 0) {
      console.log('No orders found with admin query');
    } else {
      console.log(`Admin query found ${adminOrders.length} orders:`);
      adminOrders.forEach(order => {
        console.log(`- Order ID: ${order.id}, Buyer: ${order.buyer_name}, Items: ${order.book_titles || 'None'}, Item Count: ${order.item_count}`);
      });
    }
    
  } catch (error) {
    console.error('Error diagnosing orders:', error);
  } finally {
    await pool.end();
    console.log('\nDiagnosis complete. Check the results above for issues.');
  }
}

// Run the diagnosis
diagnoseOrders(); 