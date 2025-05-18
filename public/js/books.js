// State management
let currentBooks = [];
let currentPage = 1;
const booksPerPage = 12;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const category = urlParams.get('category');

    // Set initial filter values
    if (category) {
        document.getElementById('categoryFilter').value = category;
    }
    if (searchQuery) {
        document.getElementById('searchInput').value = searchQuery;
    }

    // Setup event listeners
    setupEventListeners();

    // Load books with initial filters
    loadBooks();
});

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    searchBtn.addEventListener('click', () => {
        currentPage = 1;
        loadBooks();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            loadBooks();
        }
    });

    // Filters
    document.getElementById('categoryFilter').addEventListener('change', () => {
        currentPage = 1;
        loadBooks();
    });

    document.getElementById('conditionFilter').addEventListener('change', () => {
        currentPage = 1;
        loadBooks();
    });

    document.getElementById('sortFilter').addEventListener('change', () => {
        currentPage = 1;
        loadBooks();
    });
}

// Load books with filters
async function loadBooks() {
    try {
        showLoadingSpinner();

        // Get filter values
        const search = document.getElementById('searchInput').value.trim();
        const category = document.getElementById('categoryFilter').value;
        const condition = document.getElementById('conditionFilter').value;
        const sort = document.getElementById('sortFilter').value;

        // Build query string
        let queryString = '?status=approved';
        if (search) queryString += `&search=${encodeURIComponent(search)}`;
        if (category) queryString += `&category=${encodeURIComponent(category)}`;
        if (condition) queryString += `&condition=${encodeURIComponent(condition)}`;

        // Fetch books
        const response = await fetch(`/api/books${queryString}`);
        let books = await response.json();

        // Sort books
        books = sortBooks(books, sort);

        // Update state
        currentBooks = books;

        // Display books and pagination
        displayBooks();
        displayPagination();
    } catch (err) {
        console.error('Error loading books:', err);
        showToast('Error loading books', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Sort books based on selected option
function sortBooks(books, sortOption) {
    switch (sortOption) {
        case 'price_low':
            return books.sort((a, b) => a.price - b.price);
        case 'price_high':
            return books.sort((a, b) => b.price - a.price);
        case 'newest':
        default:
            return books.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

// Display books for current page
function displayBooks() {
    const booksGrid = document.getElementById('booksGrid');
    
    if (currentBooks.length === 0) {
        booksGrid.innerHTML = `
            <div class="no-books">
                <p>No books found matching your criteria.</p>
            </div>
        `;
        return;
    }
    
    booksGrid.innerHTML = currentBooks.map(book => {
        // Use front_image as primary, fallback to image_url, then default
        const imagePath = book.front_image || book.image_url || '/images/default-book.png';
        return `
            <div class="book-card" onclick="viewBookDetails(${book.id})">
                <div class="book-image">
                    <img src="${imagePath}" alt="${book.title}" onerror="this.src='/images/default-book.png'">
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">by ${book.author}</p>
                    <p class="book-price">₹${book.price.toFixed(2)}</p>
                    <p class="book-condition">${formatCondition(book.condition)}</p>
                </div>
            </div>
        `;
    }).join('');
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

// View book details
function viewBookDetails(bookId) {
    window.location.href = `/book-details.html?id=${bookId}`;
}

// Helper function to format condition
function formatCondition(condition) {
    return condition.replace('_', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
} 