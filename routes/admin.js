const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Admin middleware to check if user is admin
const admin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Apply admin middleware to all routes
router.use(auth, admin);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const [users] = await db.query('SELECT COUNT(*) as count FROM users WHERE role != "admin"');
        const [books] = await db.query('SELECT COUNT(*) as count FROM books');
        const [orders] = await db.query('SELECT COUNT(*) as count FROM orders');
        const [pendingSellers] = await db.query('SELECT COUNT(*) as count FROM seller_info WHERE approved = false');

        res.json({
            totalUsers: users[0].count,
            totalBooks: books[0].count,
            totalOrders: orders[0].count,
            pendingSellers: pendingSellers[0].count
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Error getting dashboard statistics' });
    }
});

// User management
router.get('/users', async (req, res) => {
    try {
        const search = req.query.search || '';
        const [users] = await db.query(
            `SELECT id, name, email, role, status 
             FROM users 
             WHERE name LIKE ? OR email LIKE ?
             ORDER BY id DESC`,
            [`%${search}%`, `%${search}%`]
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

router.get('/users/:id', async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, role, status FROM users WHERE id = ?',
            [req.params.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
});

router.post('/users', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate input
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if email exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );

        res.status(201).json({
            id: result.insertId,
            name,
            email,
            role
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const { name, email, password, role, status } = req.body;
        const userId = req.params.id;

        // Check if user exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
        if (existingUsers.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Build update query
        let query = 'UPDATE users SET name = ?, email = ?, role = ?';
        let params = [name, email, role];

        if (status) {
            query += ', status = ?';
            params.push(status);
        }

        if (password) {
            query += ', password = ?';
            const hashedPassword = await bcrypt.hash(password, 10);
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(userId);

        await db.query(query, params);
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// Book management
router.get('/books', async (req, res) => {
    try {
        const { status = 'pending' } = req.query;
        const [books] = await db.query(`
            SELECT b.*, u.name as seller_name, u.email as seller_email 
            FROM books b 
            JOIN users u ON b.seller_id = u.id 
            WHERE b.status = ?
        `, [status]);
        res.json(books);
    } catch (error) {
        console.error('Error getting books:', error);
        res.status(500).json({ message: 'Error getting books' });
    }
});

router.delete('/books/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting book' });
    }
});

// Add a test route to get database information
router.get('/test-db', async (req, res) => {
    try {
        // Get table information
        const [orderColumns] = await db.query(`SHOW COLUMNS FROM orders`);
        const [orderItemsColumns] = await db.query(`SHOW COLUMNS FROM order_items`);
        const [recentOrders] = await db.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`);

        res.json({
            orderColumns,
            orderItemsColumns,
            recentOrders
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({ message: 'Error testing database', error: error.message });
    }
});

// Fix the orders query to handle both single-item and multi-item orders
router.get('/orders', async (req, res) => {
    try {
        const { search, status } = req.query;
        
        console.log('Admin fetching orders with params:', { search, status });
        
        // Updated query to handle both single-item and multi-item orders correctly
        let query = `
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
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (
                buyer.name LIKE ? OR 
                o.full_name LIKE ? OR
                o.order_reference LIKE ? OR
                o.phone_number LIKE ? OR
                o.id = ? OR
                EXISTS (
                    SELECT 1 
                    FROM order_items oi 
                    JOIN books b ON oi.book_id = b.id 
                    WHERE oi.order_id = o.id AND b.title LIKE ?
                ) OR
                EXISTS (
                    SELECT 1 
                    FROM books b 
                    WHERE b.id = o.book_id AND b.title LIKE ?
                )
            )`;
            const searchPattern = `%${search}%`;
            const searchId = isNaN(parseInt(search)) ? 0 : parseInt(search);
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchId, searchPattern, searchPattern);
        }

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC LIMIT 50';

        console.log('Executing admin orders query');
        const [orders] = await db.query(query, params);
        console.log('Found', orders.length, 'orders');
        
        // Debug the first few orders if any are found
        if (orders.length > 0) {
            console.log('Sample order:', {
                id: orders[0].id,
                buyer: orders[0].buyer_name,
                items: orders[0].book_titles,
                itemCount: orders[0].item_count,
                status: orders[0].status
            });
        }
        
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
});

router.get('/orders/:id', async (req, res) => {
    try {
        // Get the main order details
        const [orders] = await db.query(
            `SELECT o.* 
             FROM orders o
             WHERE o.id = ?`,
            [req.params.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];

        // Get buyer details
        const [buyers] = await db.query(
            `SELECT name, email FROM users WHERE id = ?`,
            [order.buyer_id]
        );
        
        if (buyers.length > 0) {
            order.buyer_name = buyers[0].name;
            order.buyer_email = buyers[0].email;
        }

        // Check if this is a single-item order (old format)
        if (order.book_id) {
            const [books] = await db.query(
                `SELECT b.*, 
                    seller.name as seller_name, 
                    seller.email as seller_email, 
                    si.phone as seller_phone,
                    si.address as seller_address,
                    si.city as seller_city,
                    si.state as seller_state,
                    si.pincode as seller_postal_code
                 FROM books b
                 JOIN users seller ON b.seller_id = seller.id
                 LEFT JOIN seller_info si ON seller.id = si.user_id
                 WHERE b.id = ?`,
                [order.book_id]
            );
            
            if (books.length > 0) {
                order.book_title = books[0].title;
                order.book_author = books[0].author;
                order.book_price = books[0].price;
                order.seller_name = books[0].seller_name;
                order.seller_email = books[0].seller_email;
                order.seller_phone = books[0].seller_phone;
                order.seller_address = books[0].seller_address;
                order.seller_city = books[0].seller_city;
                order.seller_state = books[0].seller_state;
                order.seller_postal_code = books[0].seller_postal_code;
            }
        }

        // Get order items for multi-item orders
        const [items] = await db.query(
            `SELECT oi.*, 
                    b.title as book_title, 
                    b.author as book_author, 
                    b.front_image, 
                    b.image_url,
                    u.name as seller_name,
                    u.email as seller_email,
                    si.phone as seller_phone,
                    si.address as seller_address,
                    si.city as seller_city,
                    si.state as seller_state,
                    si.pincode as seller_postal_code
             FROM order_items oi
             JOIN books b ON oi.book_id = b.id
             JOIN users u ON b.seller_id = u.id
             LEFT JOIN seller_info si ON u.id = si.user_id
             WHERE oi.order_id = ?`,
            [order.id]
        );

        if (items.length > 0) {
            order.items = items;
            // Calculate total from items if order_total is not set
            if (!order.order_total) {
                order.order_total = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
            }
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: 'Error fetching order details', error: error.message });
    }
});

router.put('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        // Validate the status
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Check if order exists
        const [existingOrders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (existingOrders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const oldStatus = existingOrders[0].status;

        // Update the order status
        await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

        // If status changed to cancelled or returned, handle book status changes
        if ((status === 'cancelled' || status === 'returned') && oldStatus !== 'cancelled' && oldStatus !== 'returned') {
            // For direct book orders (old format)
            if (existingOrders[0].book_id) {
                await db.query('UPDATE books SET status = ? WHERE id = ?', ['approved', existingOrders[0].book_id]);
            }
            
            // For multi-item orders, get all books and update their status
            const [orderItems] = await db.query('SELECT book_id FROM order_items WHERE order_id = ?', [orderId]);
            for (const item of orderItems) {
                await db.query('UPDATE books SET status = ? WHERE id = ?', ['approved', item.book_id]);
            }
        }

        res.json({ message: 'Order status updated successfully', status });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
});

// @route   GET /api/admin/pending-sellers
// @desc    Get pending seller applications
// @access  Private/Admin
router.get('/pending-sellers', async (req, res) => {
    try {
        const [sellers] = await db.query(`
            SELECT u.id, u.name, u.email, si.phone, si.city, si.state
            FROM users u
            JOIN seller_info si ON u.id = si.user_id
            WHERE si.approved = false
            ORDER BY si.created_at DESC
        `);

        res.json(sellers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/pending-books
// @desc    Get pending book listings
// @access  Private/Admin
router.get('/pending-books', async (req, res) => {
    try {
        const [books] = await db.query(`
            SELECT b.*, u.name as seller_name
            FROM books b
            JOIN users u ON b.seller_id = u.id
            WHERE b.status = 'pending'
            ORDER BY b.created_at DESC
        `);

        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/sellers/:id/approve
// @desc    Approve a seller application
// @access  Private/Admin
router.put('/sellers/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query('UPDATE seller_info SET approved = true WHERE user_id = ?', [id]);
        await db.query('UPDATE users SET role = ? WHERE id = ?', ['seller', id]);

        res.json({ message: 'Seller approved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/sellers/:id/reject
// @desc    Reject a seller application
// @access  Private/Admin
router.put('/sellers/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query('DELETE FROM seller_info WHERE user_id = ?', [id]);
        await db.query('UPDATE users SET role = ? WHERE id = ?', ['buyer', id]);

        res.json({ message: 'Seller rejected successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/books/:id/approve
// @desc    Approve a book listing
// @access  Private/Admin
router.post('/books/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            'UPDATE books SET status = "approved" WHERE id = ?',
            [id]
        );
        res.json({ message: 'Book listing approved' });
    } catch (error) {
        console.error('Error approving book listing:', error);
        res.status(500).json({ message: 'Error approving book listing' });
    }
});

// @route   PUT /api/admin/books/:id/reject
// @desc    Reject a book listing
// @access  Private/Admin
router.post('/books/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            'UPDATE books SET status = "rejected" WHERE id = ?',
            [id]
        );
        res.json({ message: 'Book listing rejected' });
    } catch (error) {
        console.error('Error rejecting book listing:', error);
        res.status(500).json({ message: 'Error rejecting book listing' });
    }
});

// Get seller applications
router.get('/seller-applications', async (req, res) => {
    try {
        const [applications] = await db.query(`
            SELECT si.*, u.name, u.email 
            FROM seller_info si 
            JOIN users u ON si.user_id = u.id 
            WHERE si.approved = false
        `);
        res.json(applications);
    } catch (error) {
        console.error('Error getting seller applications:', error);
        res.status(500).json({ message: 'Error getting seller applications' });
    }
});

// Approve seller application
router.post('/seller-applications/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Start transaction
        await db.query('START TRANSACTION');

        // Update seller_info
        await db.query(
            'UPDATE seller_info SET approved = true WHERE id = ?',
            [id]
        );

        // Get user_id from seller_info
        const [sellerInfo] = await db.query(
            'SELECT user_id FROM seller_info WHERE id = ?',
            [id]
        );

        // Update user role
        await db.query(
            'UPDATE users SET role = "seller" WHERE id = ?',
            [sellerInfo[0].user_id]
        );

        await db.query('COMMIT');
        res.json({ message: 'Seller application approved' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error approving seller application:', error);
        res.status(500).json({ message: 'Error approving seller application' });
    }
});

// Reject seller application
router.post('/seller-applications/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Start transaction
        await db.query('START TRANSACTION');

        // Get user_id from seller_info
        const [sellerInfo] = await db.query(
            'SELECT user_id FROM seller_info WHERE id = ?',
            [id]
        );

        // Delete seller_info
        await db.query(
            'DELETE FROM seller_info WHERE id = ?',
            [id]
        );

        // Update user role back to buyer
        await db.query(
            'UPDATE users SET role = "buyer" WHERE id = ?',
            [sellerInfo[0].user_id]
        );

        await db.query('COMMIT');
        res.json({ message: 'Seller application rejected' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error rejecting seller application:', error);
        res.status(500).json({ message: 'Error rejecting seller application' });
    }
});

module.exports = router; 