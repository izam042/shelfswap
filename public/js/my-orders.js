// State management
let currentOrders = [];
let currentPage = 1;
const ordersPerPage = 10;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // Setup event listeners
    setupEventListeners();

    // Load initial orders
    loadOrders();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('statusFilter').addEventListener('change', () => {
        currentPage = 1;
        loadOrders();
    });
}

// Load orders
async function loadOrders() {
    try {
        showLoadingSpinner();
        const status = document.getElementById('statusFilter').value;
        
        // Build query string
        let queryString = '';
        if (status) queryString = `?status=${status}`;

        const response = await fetch(`/api/orders${queryString}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const orders = await response.json();
        currentOrders = orders;

        displayOrders();
        displayPagination();
    } catch (err) {
        console.error('Error loading orders:', err);
        showToast('Error loading orders', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Display orders
function displayOrders() {
    const ordersList = document.getElementById('ordersList');
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const ordersToDisplay = currentOrders.slice(startIndex, endIndex);

    if (ordersToDisplay.length === 0) {
        ordersList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-shopping-cart"></i>
                <p>No orders found</p>
                <button class="btn btn-primary" onclick="window.location.href='/books.html'">
                    Browse Books
                </button>
            </div>
        `;
        return;
    }

    ordersList.innerHTML = ordersToDisplay.map(order => {
        // Get book image URL
        const bookImage = order.book_front_image || order.book_image_url || '/images/default-book.png';
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <span class="order-id">Order #${order.id}</span>
                        <span class="order-date">${formatDate(order.created_at)}</span>
                    </div>
                    <div class="order-status status-${order.status}">
                        ${formatStatus(order.status)}
                    </div>
                </div>
                <div class="order-content">
                    <div class="book-image">
                        <img src="${bookImage}" 
                             alt="${order.book_title}"
                             onerror="this.src='/images/default-book.png'">
                    </div>
                    <div class="order-details">
                        <h3>${order.book_title}</h3>
                        <p class="author">by ${order.book_author}</p>
                        <p class="price">₹${order.price}</p>
                        <div class="book-meta">
                            <span class="category">${order.book_category || 'N/A'}</span>
                            <span class="condition">${formatCondition(order.book_condition)}</span>
                        </div>
                        <p class="seller">Seller: ${order.seller_name}</p>
                    </div>
                </div>
                <div class="order-actions">
                    <button onclick="viewBookDetails(${order.book_id})" class="btn btn-secondary">
                        View Book
                    </button>
                    ${order.status === 'pending' ? `
                        <button onclick="cancelOrder(${order.id})" class="btn btn-danger">
                            Cancel Order
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Display pagination
function displayPagination() {
    const totalPages = Math.ceil(currentOrders.length / ordersPerPage);
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button class="pagination-btn" 
                onclick="changePage(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || // First page
            i === totalPages || // Last page
            (i >= currentPage - 1 && i <= currentPage + 1) // Pages around current page
        ) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                        onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (
            i === currentPage - 2 ||
            i === currentPage + 2
        ) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }
    }

    // Next button
    paginationHTML += `
        <button class="pagination-btn"
                onclick="changePage(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1 || page > Math.ceil(currentOrders.length / ordersPerPage)) return;
    currentPage = page;
    displayOrders();
    displayPagination();
    window.scrollTo(0, 0);
}

// Cancel order
async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }

    try {
        showLoadingSpinner();
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                status: 'cancelled'
            })
        });

        if (response.ok) {
            showToast('Order cancelled successfully', 'success');
            loadOrders(); // Reload the orders list
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to cancel order', 'error');
        }
    } catch (err) {
        console.error('Error cancelling order:', err);
        showToast('Error cancelling order', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Navigation functions
function viewBookDetails(bookId) {
    window.location.href = `/book-details.html?id=${bookId}`;
}

// Helper functions
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatCondition(condition) {
    if (!condition) return 'N/A';
    return condition.replace('_', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
} 