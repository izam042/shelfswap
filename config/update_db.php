<?php
/**
 * Database Update Script
 * Run this script to apply the database updates
 */

// Database configuration
$host = 'localhost';
$dbname = 'shelfswap';
$username = 'root';
$password = '';

try {
    // Connect to the database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to database successfully.\n";
    
    // Read and execute the SQL file
    $sqlFile = file_get_contents(__DIR__ . '/orders_update.sql');
    $statements = explode(';', $sqlFile);
    
    $successCount = 0;
    $errorCount = 0;
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            try {
                $pdo->exec($statement);
                $successCount++;
                echo "Executed statement successfully.\n";
            } catch (PDOException $e) {
                $errorCount++;
                echo "Error executing statement: " . $e->getMessage() . "\n";
                echo "Statement: " . $statement . "\n\n";
            }
        }
    }
    
    echo "\nDatabase update completed.\n";
    echo "Successful statements: $successCount\n";
    echo "Failed statements: $errorCount\n";
    
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}
?> 