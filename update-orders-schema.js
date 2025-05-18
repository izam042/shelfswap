/**
 * Script to update the orders table schema
 * Run with: node update-orders-schema.js
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

async function updateSchema() {
  // Create the connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Starting orders table schema update...');
    
    // Start a transaction
    await pool.query('START TRANSACTION');
    
    // 1. Update the orders table with new columns
    console.log('\nUpdating orders table...');
    try {
      await pool.query(`
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
          ADD COLUMN order_notes TEXT NULL
      `);
      console.log('Added new columns to orders table');
    } catch (error) {
      console.error('Error adding columns:', error.message);
      // Continue even if some columns already exist
    }
    
    // 2. Modify existing columns
    console.log('\nModifying existing columns...');
    try {
      await pool.query(`
        ALTER TABLE orders
          MODIFY COLUMN status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') DEFAULT 'pending',
          MODIFY COLUMN book_id INT NULL,
          MODIFY COLUMN seller_id INT NULL,
          MODIFY COLUMN price DECIMAL(10, 2) NULL
      `);
      console.log('Modified existing columns in orders table');
    } catch (error) {
      console.error('Error modifying columns:', error.message);
      // Continue even if errors occur
    }
    
    // 3. Make sure order_items table exists
    console.log('\nChecking order_items table...');
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          order_id INT NOT NULL,
          book_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          price DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (book_id) REFERENCES books(id)
        )
      `);
      console.log('Created or verified order_items table');
    } catch (error) {
      console.error('Error creating order_items table:', error.message);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log('\nSchema update completed successfully!');
    
    // Verify updated structure
    console.log('\nVerifying updated orders table structure:');
    const [orderColumns] = await pool.query(`SHOW COLUMNS FROM orders`);
    orderColumns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    // Rollback on error
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error updating schema:', error);
  } finally {
    await pool.end();
    console.log('\nUpdate complete.');
  }
}

// Run the update
updateSchema(); 