/**
 * Database initialization script
 * Run with: node initialize-db.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Try to load environment variables but use defaults if not available
dotenv.config();

// Database configuration without database name - hardcoded for reliability
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('Initializing database...');
    console.log('Using database configuration:', {
      host: dbConfig.host,
      user: dbConfig.user
    });
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'config', 'schema.sql');
    console.log(`Reading schema from ${schemaPath}`);
    
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split SQL commands by semicolon
    const commands = schema
      .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '') // Remove comments
      .split(';')
      .filter(command => command.trim() !== '');
    
    console.log(`Found ${commands.length} SQL commands to execute`);
    
    // Connect to MySQL
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server');
    
    // Execute each command
    for (const command of commands) {
      try {
        await connection.query(command);
        console.log('Executed:', command.substring(0, 50) + '...');
      } catch (error) {
        console.error(`Error executing: ${command.substring(0, 100)}`);
        console.error(`Error message: ${error.message}`);
      }
    }
    
    console.log('Database initialization complete!');
    
    // Verify tables
    try {
      // Connect to the database
      await connection.query('USE shelfswap');
      
      // Get tables
      const [tables] = await connection.query('SHOW TABLES');
      console.log('\nDatabase tables:');
      tables.forEach(table => {
        console.log(`- ${Object.values(table)[0]}`);
      });
    } catch (error) {
      console.error('Error verifying tables:', error.message);
    }
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the initialization
initializeDatabase(); 