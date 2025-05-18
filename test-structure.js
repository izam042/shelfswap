/**
 * Test script to check table structures
 * Run with: node test-structure.js
 */

const mysql = require('mysql2/promise');

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

async function checkTableStructure() {
  // Create the connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Checking database structure...');
    
    // Check orders table structure
    console.log('\nOrders table structure:');
    const [orderColumns] = await pool.query(`SHOW COLUMNS FROM orders`);
    orderColumns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})${col.Null === 'YES' ? ' NULL' : ' NOT NULL'}${col.Key ? ' ' + col.Key : ''}${col.Default ? ' DEFAULT ' + col.Default : ''}`);
    });
    
    // Check if order_items table exists
    try {
      console.log('\nOrder_items table structure:');
      const [orderItemsColumns] = await pool.query(`SHOW COLUMNS FROM order_items`);
      orderItemsColumns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type})${col.Null === 'YES' ? ' NULL' : ' NOT NULL'}${col.Key ? ' ' + col.Key : ''}${col.Default ? ' DEFAULT ' + col.Default : ''}`);
      });
    } catch (error) {
      console.error('\nOrder_items table does not exist:', error.message);
    }
    
    // Check if we need to actually run the ALTER TABLE commands
    console.log('\nChecking if orders table needs to be altered...');
    let needsStructureUpdate = false;
    
    try {
      await pool.query("SELECT order_reference FROM orders LIMIT 1");
      console.log("order_reference column exists");
    } catch (error) {
      console.log("order_reference column does not exist, needs to be added");
      needsStructureUpdate = true;
    }
    
    // If structure needs update, show ALTER TABLE statements
    if (needsStructureUpdate) {
      console.log("\nThe following SQL commands need to be executed to update the orders table:");
      console.log(`
ALTER TABLE orders
  ADD COLUMN order_reference VARCHAR(50) NULL,
  ADD COLUMN order_total DECIMAL(10, 2) NULL,
  ADD COLUMN shipping_fee DECIMAL(10, 2) NULL,
  ADD COLUMN platform_fee DECIMAL(10, 2) NULL,
  ADD COLUMN full_name VARCHAR(255) NULL,
  ADD COLUMN phone_number VARCHAR(20) NULL,
  ADD COLUMN address_line1 VARCHAR(255) NULL,
  ADD COLUMN address_line2 VARCHAR(255) NULL,
  ADD COLUMN city VARCHAR(100) NULL,
  ADD COLUMN state VARCHAR(100) NULL,
  ADD COLUMN postal_code VARCHAR(20) NULL,
  ADD COLUMN country VARCHAR(100) NULL DEFAULT 'India',
  ADD COLUMN payment_method VARCHAR(50) NULL DEFAULT 'cash on delivery',
  ADD COLUMN payment_id VARCHAR(100) NULL,
  ADD COLUMN payment_status VARCHAR(50) NULL DEFAULT 'pending',
  ADD COLUMN order_notes TEXT NULL,
  MODIFY COLUMN status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') DEFAULT 'pending',
  MODIFY COLUMN book_id INT NULL,
  MODIFY COLUMN seller_id INT NULL,
  MODIFY COLUMN price DECIMAL(10, 2) NULL;
      `);
      
      // Also check if order_items table needs to be created
      try {
        await pool.query("SELECT * FROM order_items LIMIT 1");
        console.log("order_items table exists");
      } catch (error) {
        console.log("order_items table does not exist, needs to be created");
        console.log(`
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  book_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id)
);
        `);
      }
      
      // Ask if user wants to execute these commands
      console.log("\nWould you like to execute these commands? (Type 'yes' in the terminal if you want to proceed)");
    } else {
      console.log("Database structure is up-to-date!");
    }
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  } finally {
    await pool.end();
    console.log('\nCheck complete.');
  }
}

// Run the check
checkTableStructure(); 