// Check if user is admin
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user || user.role !== 'admin') {
        window.location.href = '/';
        return;
    }
    loadDashboardStats();
    loadPendingSellers();
    loadPendingBooks();
    setupEventListeners();
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalBooks').textContent = stats.totalBooks;
            document.getElementById('totalOrders').textContent = stats.totalOrders;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Error loading dashboard statistics', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
            loadTabContent(tab);
        });
    });

    // Search inputs
    document.getElementById('userSearch').addEventListener('input', debounce(() => loadUsers(), 300));
    document.getElementById('bookSearch').addEventListener('input', debounce(() => loadBooks(), 300));
    document.getElementById('orderSearch').addEventListener('input', debounce(() => loadOrders(), 300));

    // Filters
    document.getElementById('categoryFilter').addEventListener('change', () => loadBooks());
    document.getElementById('statusFilter').addEventListener('change', () => loadBooks());
    document.getElementById('orderStatusFilter').addEventListener('change', () => loadOrders());

    // User form
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
}

// Switch tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
}

// Load tab content
function loadTabContent(tab) {
    switch (tab) {
        case 'users':
            loadUsers();
            break;
        case 'books':
            loadBooks();
            break;
        case 'orders':
            loadOrders();
            break;
    }
}

// Load users
async function loadUsers() {
    const searchTerm = document.getElementById('userSearch').value;
    showLoading();
    try {
        const response = await fetch(`/api/admin/users?search=${searchTerm}`);
        const users = await response.json();
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.status}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showToast('Error loading users', 'error');
    } finally {
        hideLoading();
    }
}

// Load books
async function loadBooks() {
    const searchTerm = document.getElementById('bookSearch').value;
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;
    showLoading();
    try {
        const response = await fetch(`/api/admin/books?search=${searchTerm}&category=${category}&status=${status}`);
        const books = await response.json();
        const tbody = document.getElementById('booksTableBody');
        tbody.innerHTML = books.map(book => `
            <tr>
                <td>${book.id}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category}</td>
                <td>₹${book.price}</td>
                <td>
                    <span class="status-badge status-${book.status.toLowerCase()}">
                        ${book.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewBook(${book.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteBook(${book.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showToast('Error loading books', 'error');
    } finally {
        hideLoading();
    }
}

// Load orders
async function loadOrders() {
    const searchTerm = document.getElementById('orderSearch').value;
    const status = document.getElementById('orderStatusFilter').value;
    showLoading();
    try {
        const response = await fetch(`/api/admin/orders?search=${searchTerm}&status=${status}`);
        const orders = await response.json();
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.book.title}</td>
                <td>${order.buyer.name}</td>
                <td>${order.seller.name}</td>
                <td>₹${order.price}</td>
                <td>
                    <span class="status-badge status-${order.status.toLowerCase()}">
                        ${order.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewOrder(${order.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'PENDING' ? `
                        <button class="btn btn-primary btn-sm" onclick="updateOrderStatus(${order.id}, 'APPROVED')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="updateOrderStatus(${order.id}, 'CANCELLED')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showToast('Error loading orders', 'error');
    } finally {
        hideLoading();
    }
}

// User modal functions
function openAddUserModal() {
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userForm').reset();
    document.getElementById('userModal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

async function handleUserSubmit(event) {
    event.preventDefault();
    const formData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        password: document.getElementById('userPassword').value,
        role: document.getElementById('userRole').value
    };

    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showToast('User created successfully', 'success');
            closeUserModal();
            loadUsers();
        } else {
            const error = await response.json();
            showToast(error.message, 'error');
        }
    } catch (error) {
        showToast('Error creating user', 'error');
    }
}

// User management functions
async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`);
        const user = await response.json();
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userPassword').required = false;
        document.getElementById('userModal').classList.add('active');
    } catch (error) {
        showToast('Error loading user details', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('User deleted successfully', 'success');
            loadUsers();
        } else {
            const error = await response.json();
            showToast(error.message, 'error');
        }
    } catch (error) {
        showToast('Error deleting user', 'error');
    }
}

// Book management functions
async function viewBook(bookId) {
    window.location.href = `/book-details.html?id=${bookId}`;
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
        const response = await fetch(`/api/admin/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('Book deleted successfully', 'success');
            loadBooks();
        } else {
            const error = await response.json();
            showToast(error.message, 'error');
        }
    } catch (error) {
        showToast('Error deleting book', 'error');
    }
}

// Order management functions
async function viewOrder(orderId) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`);
        const order = await response.json();
        // Show order details in a modal (implementation needed)
    } catch (error) {
        showToast('Error loading order details', 'error');
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            showToast(`Order ${status.toLowerCase()} successfully`, 'success');
            loadOrders();
        } else {
            const error = await response.json();
            showToast(error.message, 'error');
        }
    } catch (error) {
        showToast('Error updating order status', 'error');
    }
}

// Utility functions
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadPendingSellers() {
    try {
        const response = await fetch('/api/admin/pending-sellers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const sellers = await response.json();
            const tbody = document.querySelector('#pendingSellersTable tbody');
            
            tbody.innerHTML = sellers.map(seller => `
                <tr>
                    <td>${seller.name}</td>
                    <td>${seller.email}</td>
                    <td>${seller.phone}</td>
                    <td>${seller.city}, ${seller.state}</td>
                    <td>
                        <button onclick="approveSeller(${seller.id})" class="btn btn-primary btn-sm">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button onclick="rejectSeller(${seller.id})" class="btn btn-danger btn-sm">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading pending sellers:', error);
        showToast('Error loading pending sellers', 'error');
    }
}

async function loadPendingBooks() {
    try {
        const response = await fetch('/api/admin/pending-books', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const books = await response.json();
            const tbody = document.querySelector('#pendingBooksTable tbody');
            
            tbody.innerHTML = books.map(book => `
                <tr>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.category}</td>
                    <td>₹${book.price}</td>
                    <td>${book.seller_name}</td>
                    <td>
                        <button onclick="approveBook(${book.id})" class="btn btn-primary btn-sm">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button onclick="rejectBook(${book.id})" class="btn btn-danger btn-sm">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading pending books:', error);
        showToast('Error loading pending books', 'error');
    }
}

async function approveSeller(sellerId) {
    try {
        const response = await fetch(`/api/admin/sellers/${sellerId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('Seller approved successfully', 'success');
            loadPendingSellers();
            loadDashboardStats();
        } else {
            const error = await response.json();
            showToast(error.message || 'Error approving seller', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error approving seller', 'error');
    }
}

async function rejectSeller(sellerId) {
    if (!confirm('Are you sure you want to reject this seller?')) return;

    try {
        const response = await fetch(`/api/admin/sellers/${sellerId}/reject`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('Seller rejected successfully', 'success');
            loadPendingSellers();
            loadDashboardStats();
        } else {
            const error = await response.json();
            showToast(error.message || 'Error rejecting seller', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error rejecting seller', 'error');
    }
}

async function approveBook(bookId) {
    try {
        const response = await fetch(`/api/admin/books/${bookId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('Book approved successfully', 'success');
            loadPendingBooks();
            loadDashboardStats();
        } else {
            const error = await response.json();
            showToast(error.message || 'Error approving book', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error approving book', 'error');
    }
}

async function rejectBook(bookId) {
    if (!confirm('Are you sure you want to reject this book?')) return;

    try {
        const response = await fetch(`/api/admin/books/${bookId}/reject`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('Book rejected successfully', 'success');
            loadPendingBooks();
            loadDashboardStats();
        } else {
            const error = await response.json();
            showToast(error.message || 'Error rejecting book', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error rejecting book', 'error');
    }
} 