-- Update orders table to include shipping information
ALTER TABLE orders 
ADD COLUMN full_name VARCHAR(255) AFTER price,
ADD COLUMN phone_number VARCHAR(20) AFTER full_name,
ADD COLUMN address_line1 VARCHAR(255) AFTER phone_number,
ADD COLUMN address_line2 VARCHAR(255) AFTER address_line1,
ADD COLUMN city VARCHAR(100) AFTER address_line2,
ADD COLUMN state VARCHAR(100) AFTER city,
ADD COLUMN postal_code VARCHAR(20) AFTER state,
ADD COLUMN country VARCHAR(100) DEFAULT 'India' AFTER postal_code,
ADD COLUMN order_notes TEXT AFTER country;

-- Create a shipping_addresses table to store addresses for reuse
CREATE TABLE IF NOT EXISTS shipping_addresses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create order_items table to handle multiple items in a single order
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
);

-- Update orders table structure to support multiple items per order
ALTER TABLE orders
MODIFY COLUMN book_id INT NULL, -- Make nullable since we'll use order_items
ADD COLUMN order_total DECIMAL(10, 2) AFTER price,
ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash on delivery' AFTER order_notes,
ADD COLUMN tracking_number VARCHAR(100) AFTER payment_method,
ADD COLUMN shipping_fee DECIMAL(10, 2) DEFAULT 49.00 AFTER tracking_number,
ADD COLUMN platform_fee DECIMAL(10, 2) DEFAULT 19.00 AFTER shipping_fee,
MODIFY COLUMN status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') DEFAULT 'pending';

-- Add unique order reference field
ALTER TABLE orders
ADD COLUMN order_reference VARCHAR(50) AFTER id,
ADD UNIQUE KEY unique_order_reference (order_reference);

-- Add indexes for performance
ALTER TABLE orders ADD INDEX idx_status (status);
ALTER TABLE orders ADD INDEX idx_buyer_id (buyer_id);
ALTER TABLE orders ADD INDEX idx_created_at (created_at); 