// Load books with search and filters
async function loadBooks(searchQuery = '', filters = {}) {
    const loading = document.getElementById('loading');
    loading.classList.remove('hidden');

    try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.append('search', searchQuery);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.condition) queryParams.append('condition', filters.condition);
        if (filters.price) queryParams.append('price', filters.price);

        const response = await fetch(`/api/books?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to load books');
        }

        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
        showToast('Error loading books', 'error');
    } finally {
        loading.classList.add('hidden');
    }
}

// Display books in grid
function displayBooks(books) {
    const booksGrid = document.getElementById('books-grid');
    if (!books || books.length === 0) {
        booksGrid.innerHTML = '<p class="no-books-message">No books found</p>';
        return;
    }

    // Clear existing content
    booksGrid.innerHTML = '';
    
    // Create and append book cards
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.innerHTML = `
            <div class="book-image-container">
                <img src="${book.front_image || book.image_url || '/uploads/default-book.jpg'}" 
                     alt="${book.title}" 
                     class="book-image"
                     onerror="this.src='/uploads/default-book.jpg'">
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="author">by ${book.author}</p>
                <p class="description">${book.description || ''}</p>
                <p class="book-price">₹${Number(book.price).toFixed(2)}</p>
                <div class="book-actions">
                    <button class="btn btn-primary add-to-cart" data-id="${book.id}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="btn btn-secondary" onclick="viewBookDetails(${book.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener to add to cart button
        const addToCartBtn = bookCard.querySelector('.add-to-cart');
        addToCartBtn.addEventListener('click', async () => {
            await addToCart(book.id);
        });
        
        booksGrid.appendChild(bookCard);
    });
}

// Add book to cart
async function addToCart(bookId) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bookId })
        });

        if (!response.ok) {
            throw new Error('Failed to add book to cart');
        }

        showToast('Book added to cart', 'success');
    } catch (error) {
        console.error('Error adding book to cart:', error);
        showToast('Error adding book to cart', 'error');
    }
}

// Handle search form submission
document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const searchQuery = document.getElementById('search-input').value;
    const filters = {
        category: document.getElementById('category-filter').value,
        condition: document.getElementById('condition-filter').value,
        price: document.getElementById('price-filter').value
    };
    loadBooks(searchQuery, filters);
});

// Handle filter changes
document.querySelectorAll('.filters select').forEach(select => {
    select.addEventListener('change', () => {
        const searchQuery = document.getElementById('search-input').value;
        const filters = {
            category: document.getElementById('category-filter').value,
            condition: document.getElementById('condition-filter').value,
            price: document.getElementById('price-filter').value
        };
        loadBooks(searchQuery, filters);
    });
});

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

// Load books when page loads
document.addEventListener('DOMContentLoaded', () => loadBooks()); 