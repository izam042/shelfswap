// State management
let currentBooks = [];
let currentPage = 1;
const booksPerPage = 12;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in and is a seller
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    const user = getCurrentUser();
    if (user.role !== 'seller') {
        window.location.href = '/';
        showToast('Only sellers can access this page', 'error');
        return;
    }

    // Setup event listeners
    setupEventListeners();

    // Load initial books
    loadBooks();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('statusFilter').addEventListener('change', () => {
        currentPage = 1;
        loadBooks();
    });
}

// Load books
async function loadBooks() {
    try {
        showLoadingSpinner();
        const status = document.getElementById('statusFilter').value;
        
        // Build query string
        let queryString = `?seller_id=${getCurrentUser().id}`;
        if (status) queryString += `&status=${status}`;

        const response = await fetch(`/api/books${queryString}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load books');
        }

        const books = await response.json();
        currentBooks = books;

        displayBooks();
        displayPagination();
    } catch (err) {
        console.error('Error loading books:', err);
        showToast('Error loading books', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Display books
function displayBooks() {
    const booksGrid = document.getElementById('booksGrid');
    const startIndex = (currentPage - 1) * booksPerPage;
    const endIndex = startIndex + booksPerPage;
    const booksToDisplay = currentBooks.slice(startIndex, endIndex);

    if (booksToDisplay.length === 0) {
        booksGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-book-open"></i>
                <p>No books found</p>
                <button class="btn btn-primary" onclick="window.location.href='/add-book.html'">
                    Add Your First Book
                </button>
            </div>
        `;
        return;
    }

    booksGrid.innerHTML = booksToDisplay.map(book => `
        <div class="book-card">
            <div class="book-image">
                <img src="${book.front_image || book.image_url || '/images/default-book.png'}" alt="${book.title}">
                <div class="status-badge status-${book.status}">
                    ${formatStatus(book.status)}
                </div>
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="author">by ${book.author}</p>
                <p class="price">₹${book.price}</p>
                <div class="book-meta">
                    <span class="category">${book.category}</span>
                    <span class="condition">${formatCondition(book.condition)}</span>
                </div>
                <div class="book-actions">
                    <button onclick="viewBookDetails(${book.id})" class="btn btn-secondary">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button onclick="editBook(${book.id})" class="btn btn-primary" 
                            ${book.status === 'sold' ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteBook(${book.id})" class="btn btn-danger"
                            ${book.status === 'sold' ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Display pagination
function displayPagination() {
    const totalPages = Math.ceil(currentBooks.length / booksPerPage);
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
    if (page < 1 || page > Math.ceil(currentBooks.length / booksPerPage)) return;
    currentPage = page;
    displayBooks();
    displayPagination();
    window.scrollTo(0, 0);
}

// Navigation functions
function viewBookDetails(bookId) {
    window.location.href = `/book-details.html?id=${bookId}`;
}

function editBook(bookId) {
    window.location.href = `/edit-book.html?id=${bookId}`;
}

// Delete book
async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) {
        return;
    }

    try {
        showLoadingSpinner();
        const response = await fetch(`/api/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (response.ok) {
            showToast('Book deleted successfully', 'success');
            loadBooks(); // Reload the books list
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to delete book', 'error');
        }
    } catch (err) {
        console.error('Error deleting book:', err);
        showToast('Error deleting book', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Helper functions
function formatCondition(condition) {
    return condition.replace('_', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
} 