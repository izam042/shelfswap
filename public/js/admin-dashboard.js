// Check if user is logged in and is an admin
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Check if tab elements exist
    console.log('Checking tabs structure:');
    console.log('- #sellers-tab exists:', !!document.getElementById('sellers-tab'));
    console.log('- #books-tab exists:', !!document.getElementById('books-tab'));
    console.log('- #orders-tab exists:', !!document.getElementById('orders-tab'));
    
    // Load all data
    loadDashboardStats();
    loadPendingSellers();
    loadPendingBooks();
    loadOrders();
    
    // Initialize event listeners for modals
    initModalControls();
    
    // Handle order filter buttons
    document.getElementById('apply-order-filters').addEventListener('click', loadOrders);
    document.getElementById('reset-order-filters').addEventListener('click', resetOrderFilters);
});

// Initialize modal controls
function initModalControls() {
    // Close preview modals
    document.querySelectorAll('.close-preview').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.image-preview-modal, .order-details-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load dashboard stats');
        }

        const stats = await response.json();
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('total-books').textContent = stats.totalBooks;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('pending-sellers').textContent = stats.pendingSellers;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Error loading dashboard statistics', 'error');
    }
}

// Load pending seller applications
async function loadPendingSellers() {
    try {
        const response = await fetch('/api/admin/seller-applications', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load seller applications');
        }

        const applications = await response.json();
        const tbody = document.querySelector('#pending-sellers-table tbody');
        
        if (!applications || applications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No pending applications</td></tr>';
            return;
        }

        tbody.innerHTML = applications.map(app => `
            <tr>
                <td>${app.name}</td>
                <td>${app.email}</td>
                <td>${app.phone}</td>
                <td>${app.city}, ${app.state}</td>
                <td>${new Date(app.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="approveSeller(${app.id})">Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectSeller(${app.id})">Reject</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading seller applications:', error);
        showToast('Error loading seller applications', 'error');
        document.querySelector('#pending-sellers-table tbody').innerHTML = 
            '<tr><td colspan="6">Error loading applications</td></tr>';
    }
}

// Show image preview modal
function showImagePreview(book) {
    const modal = document.getElementById('image-preview-modal');
    const previewGrid = modal.querySelector('.image-preview-grid');
    
    // Add all available images
    const images = [
        { url: book.front_image, title: 'Front Cover' },
        { url: book.back_image, title: 'Back Cover' },
        { url: book.inside_image, title: 'Inside Pages' }
    ].filter(img => img.url); // Filter out empty image URLs

    previewGrid.innerHTML = images.map(img => `
        <div class="preview-image-container">
            <img src="${img.url}" alt="${img.title}" class="preview-image">
            <p>${img.title}</p>
        </div>
    `).join('');

    // Show modal
    modal.style.display = 'flex';
}

// Load pending book listings
async function loadPendingBooks() {
    try {
        const response = await fetch('/api/admin/pending-books', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load pending books');
        }

        const books = await response.json();
        const tbody = document.querySelector('#pending-books tbody');
        
        if (!books || books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No pending books</td></tr>';
            return;
        }

        tbody.innerHTML = books.map(book => `
            <tr>
                <td>
                    <img src="${book.front_image || book.image_url || '/uploads/default-book.jpg'}" 
                         alt="${book.title}"
                         class="book-thumbnail"
                         onclick="showImagePreview(${JSON.stringify(book).replace(/"/g, '&quot;')})"
                         onerror="this.src='/uploads/default-book.jpg'">
                </td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.seller_name}</td>
                <td>₹${Number(book.price).toFixed(2)}</td>
                <td>${book.condition.replace('_', ' ')}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="approveBook(${book.id})">Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectBook(${book.id})">Reject</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading pending books:', error);
        showToast('Error loading pending books', 'error');
        document.querySelector('#pending-books tbody').innerHTML = 
            '<tr><td colspan="7">Error loading books</td></tr>';
    }
}

// Load orders with optional filtering
async function loadOrders() {
    try {
        const statusFilter = document.getElementById('order-status-filter').value;
        const searchQuery = document.getElementById('order-search').value;
        
        let url = '/api/admin/orders';
        const params = new URLSearchParams();
        
        if (statusFilter) {
            params.append('status', statusFilter);
        }
        
        if (searchQuery) {
            params.append('search', searchQuery);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        showToast('Loading orders...', 'info');
        console.log('Fetching orders from:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const orders = await response.json();
        console.log('Orders loaded:', orders.length);
        
        const tbody = document.querySelector('#orders-table tbody');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No orders found</td></tr>';
            showToast('No orders found', 'info');
            return;
        }

        tbody.innerHTML = orders.map(order => {
            // Format the status badge
            const statusClass = `status-${order.status.toLowerCase()}`;
            const formattedStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            
            // Format the date
            const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Determine what to display for items
            let itemsDisplay;
            if (order.book_titles) {
                // Use the concatenated titles from the query
                itemsDisplay = order.book_titles;
                if (order.item_count > 2) {
                    itemsDisplay += ` (+ ${order.item_count - 2} more)`;
                }
            } else if (order.book_title) {
                // Single item order (old format)
                itemsDisplay = order.book_title;
            } else if (order.item_count && order.item_count > 0) {
                // Multi-item order without titles
                itemsDisplay = `${order.item_count} items`;
            } else {
                // Fallback
                itemsDisplay = 'Items pending';
            }
            
            return `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.order_reference || '-'}</td>
                    <td>${orderDate}</td>
                    <td>${order.full_name || order.buyer_name || 'Unknown'}</td>
                    <td>${itemsDisplay}</td>
                    <td>₹${Number(order.order_total || order.price).toFixed(2)}</td>
                    <td>
                        <span class="order-status-badge ${statusClass}">
                            ${formattedStatus}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="viewOrderDetails(${order.id})">
                            View
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="updateOrderStatus(${order.id})">
                            Update
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        showToast(`${orders.length} orders loaded`, 'success');
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error loading orders: ' + error.message, 'error');
        document.querySelector('#orders-table tbody').innerHTML = 
            '<tr><td colspan="8">Error loading orders</td></tr>';
    }
}

// Reset order filters
function resetOrderFilters() {
    document.getElementById('order-status-filter').value = '';
    document.getElementById('order-search').value = '';
    loadOrders();
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load order details');
        }

        const order = await response.json();
        
        // Get order items
        let itemsHtml = '<p>No items found</p>';
        
        if (order.items && order.items.length > 0) {
            itemsHtml = `
                <table class="order-items-table">
                    <thead>
                        <tr>
                            <th>Book</th>
                            <th>Seller</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map((item, index) => `
                            <tr>
                                <td>${item.book_title}</td>
                                <td>
                                    <a href="#" onclick="showSellerDetails(event, ${JSON.stringify({
                                        name: item.seller_name || 'Unknown',
                                        email: item.seller_email || 'N/A',
                                        phone: item.seller_phone || 'N/A',
                                        address: item.seller_address || 'N/A',
                                        city: item.seller_city || 'N/A',
                                        state: item.seller_state || 'N/A',
                                        postal_code: item.seller_postal_code || 'N/A'
                                    }).replace(/"/g, '&quot;')})">
                                        ${item.seller_name || 'Unknown'}
                                    </a>
                                </td>
                                <td>₹${Number(item.price).toFixed(2)}</td>
                                <td>${item.quantity}</td>
                                <td>₹${Number(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else if (order.book_title) {
            // Single item order (old format)
            itemsHtml = `
                <table class="order-items-table">
                    <thead>
                        <tr>
                            <th>Book</th>
                            <th>Seller</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${order.book_title}</td>
                            <td>${order.seller_name || 'Unknown'}</td>
                            <td>₹${Number(order.price).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }
        
        // Create seller info HTML
        let sellerInfoHtml = '';
        
        // For single-item order
        if (order.seller_name && !order.items) {
            sellerInfoHtml = `
                <div class="seller-info-section">
                    <h4>Seller Information</h4>
                    <p><strong>Name:</strong> ${order.seller_name}</p>
                    <p><strong>Email:</strong> ${order.seller_email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${order.seller_phone || 'N/A'}</p>
                    <h5>Pickup Address:</h5>
                    <p>${order.seller_address || 'N/A'}</p>
                    <p>${order.seller_city || 'N/A'}, ${order.seller_state || 'N/A'} ${order.seller_postal_code || 'N/A'}</p>
                </div>
            `;
        }
        // For multi-item orders, we'll show seller info in the items table
        
        // Create the order details HTML
        const orderDetailsHtml = `
            <div class="order-details-grid">
                <div class="order-info-section">
                    <h4>Order Information</h4>
                    <p><strong>Order ID:</strong> ${order.id}</p>
                    <p><strong>Reference:</strong> ${order.order_reference || 'N/A'}</p>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                    <p><strong>Status:</strong> 
                        <span class="order-status-badge status-${order.status.toLowerCase()}">
                            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                    </p>
                    <p><strong>Payment Method:</strong> ${order.payment_method || 'Cash on Delivery'}</p>
                </div>
                
                <div class="customer-info-section">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${order.full_name || order.buyer_name}</p>
                    <p><strong>Email:</strong> ${order.buyer_email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${order.phone_number || 'N/A'}</p>
                </div>
                
                ${sellerInfoHtml}
                
                <div class="shipping-info-section">
                    <h4>Shipping Address</h4>
                    <p>${order.full_name || order.buyer_name}</p>
                    <p>${order.address_line1 || 'N/A'}</p>
                    ${order.address_line2 ? `<p>${order.address_line2}</p>` : ''}
                    <p>${order.city ? `${order.city}, ` : ''}${order.state || 'N/A'} ${order.postal_code || ''}</p>
                    <p>${order.country || 'India'}</p>
                </div>
                
                <div class="order-items-section">
                    <h4>Order Items</h4>
                    ${itemsHtml}
                </div>
                
                <div class="order-totals-section">
                    <h4>Order Totals</h4>
                    <table class="order-totals-table">
                        <tr>
                            <td>Subtotal:</td>
                            <td>₹${Number(order.price || order.order_total || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Shipping Fee:</td>
                            <td>₹${Number(order.shipping_fee || 49).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Platform Fee:</td>
                            <td>₹${Number(order.platform_fee || 19).toFixed(2)}</td>
                        </tr>
                        <tr class="order-total-row">
                            <td><strong>Total:</strong></td>
                            <td><strong>₹${Number(
                                (order.order_total || order.price || 0) + 
                                (order.shipping_fee || 49) + 
                                (order.platform_fee || 19)
                            ).toFixed(2)}</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div class="order-actions-section">
                    <h4>Actions</h4>
                    <div class="order-action-buttons">
                        <select id="status-select-${order.id}" class="form-control">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="returned" ${order.status === 'returned' ? 'selected' : ''}>Returned</option>
                        </select>
                        <button class="btn btn-primary" onclick="updateOrderStatus(${order.id}, document.getElementById('status-select-${order.id}').value)">
                            Update Status
                        </button>
                    </div>
                </div>
                
                ${order.order_notes ? `
                    <div class="order-notes-section">
                        <h4>Order Notes</h4>
                        <p>${order.order_notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Display the order details
        document.getElementById('order-details-container').innerHTML = orderDetailsHtml;
        document.getElementById('order-details-modal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading order details:', error);
        showToast('Error loading order details', 'error');
    }
}

// Show seller details in a popup
function showSellerDetails(event, seller) {
    event.preventDefault();
    
    // Create a small popup with seller details
    const popup = document.createElement('div');
    popup.className = 'seller-popup';
    popup.innerHTML = `
        <div class="seller-popup-content">
            <h4>Seller Information</h4>
            <p><strong>Name:</strong> ${seller.name}</p>
            <p><strong>Email:</strong> ${seller.email}</p>
            <p><strong>Phone:</strong> ${seller.phone}</p>
            <h5>Pickup Address:</h5>
            <p>${seller.address || 'N/A'}</p>
            <p>${seller.city || 'N/A'}, ${seller.state || 'N/A'} ${seller.postal_code || 'N/A'}</p>
            <button class="btn btn-sm btn-primary" onclick="this.parentNode.parentNode.remove()">Close</button>
        </div>
    `;
    
    // Position popup near the click
    popup.style.position = 'absolute';
    popup.style.top = `${event.clientY}px`;
    popup.style.left = `${event.clientX}px`;
    
    // Add to document
    document.body.appendChild(popup);
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    // If called from the orders table, open a prompt to select status
    if (!newStatus) {
        const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
        const selectedStatus = prompt(
            'Enter new status:\n' + statusOptions.map(s => `- ${s}`).join('\n')
        );
        
        if (!selectedStatus || !statusOptions.includes(selectedStatus.toLowerCase())) {
            showToast('Invalid status selected', 'error');
            return;
        }
        
        newStatus = selectedStatus.toLowerCase();
    }
    
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error('Failed to update order status');
        }

        showToast('Order status updated successfully', 'success');
        
        // Reload orders to reflect changes
        loadOrders();
        
        // Close the order details modal if it's open
        const orderDetailsModal = document.getElementById('order-details-modal');
        if (orderDetailsModal && orderDetailsModal.style.display === 'flex') {
            // Refresh the order details instead of closing
            viewOrderDetails(orderId);
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Error updating order status', 'error');
    }
}

// Approve seller application
async function approveSeller(id) {
    try {
        const response = await fetch(`/api/admin/seller-applications/${id}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to approve seller application');
        }

        showToast('Seller application approved', 'success');
        loadPendingSellers();
        loadDashboardStats();
    } catch (error) {
        console.error('Error approving seller application:', error);
        showToast('Error approving seller application', 'error');
    }
}

// Reject seller application
async function rejectSeller(id) {
    try {
        const response = await fetch(`/api/admin/seller-applications/${id}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to reject seller application');
        }

        showToast('Seller application rejected', 'success');
        loadPendingSellers();
        loadDashboardStats();
    } catch (error) {
        console.error('Error rejecting seller application:', error);
        showToast('Error rejecting seller application', 'error');
    }
}

// Approve book listing
async function approveBook(id) {
    try {
        const response = await fetch(`/api/admin/books/${id}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to approve book listing');
        }

        showToast('Book listing approved', 'success');
        loadPendingBooks();
        loadDashboardStats();
    } catch (error) {
        console.error('Error approving book listing:', error);
        showToast('Error approving book listing', 'error');
    }
}

// Reject book listing
async function rejectBook(id) {
    try {
        const response = await fetch(`/api/admin/books/${id}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to reject book listing');
        }

        showToast('Book listing rejected', 'success');
        loadPendingBooks();
        loadDashboardStats();
    } catch (error) {
        console.error('Error rejecting book listing:', error);
        showToast('Error rejecting book listing', 'error');
    }
}

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
} 