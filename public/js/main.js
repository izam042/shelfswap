// Constants for categories
const CATEGORIES = [
    { id: 'Engineering', name: 'Engineering', description: 'Books for engineering courses and entrance exams' },
    { id: 'Medical', name: 'Medical', description: 'Books for medical studies and entrance exams' },
    { id: 'Law', name: 'Law', description: 'Books for law studies and entrance exams' },
    { id: 'Business', name: 'Business', description: 'Books for business studies, MBA, and management' },
    { id: 'CompetitiveExams', name: 'Competitive Exams', description: 'Books for various competitive examinations' }
];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadFeaturedBooks();
    setupSearchHandler();
    setupBecomeSellerButton();
});

// Load categories
function loadCategories() {
    const categorySlider = document.getElementById('categorySlider');
    if (!categorySlider) return;

    categorySlider.innerHTML = CATEGORIES.map(category => `
        <div class="category-card" onclick="navigateToCategory('${category.id}')">
            <div class="category-icon">
                <i class="fas fa-book"></i>
            </div>
            <h3>${category.name}</h3>
            <p>${category.description}</p>
        </div>
    `).join('');
}

// Load featured books
async function loadFeaturedBooks() {
    try {
        const response = await fetch('/api/books?status=approved');
        const books = await response.json();
        
        const featuredBooksContainer = document.querySelector('.featured-books-grid');
        if (!featuredBooksContainer) return;

        // Display up to 6 featured books
        const featuredBooks = books.slice(0, 6);
        
        featuredBooksContainer.innerHTML = featuredBooks.map(book => {
            // Determine which image to use (front image preferred, fallback to any available image)
            const imageUrl = book.front_image || book.image_url || '/uploads/default-book.jpg';
            
            return `
                <div class="featured-book-card" onclick="viewBookDetails(${book.id})">
                    <div class="book-image">
                        <img src="${imageUrl}" alt="${book.title}">
                    </div>
                    <div class="book-info">
                        <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">${book.author}</p>
                        <p class="book-price">₹${formatPrice(book.price)}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading featured books:', error);
        showToast('Error loading featured books', 'error');
    }
}

// Setup search handler
function setupSearchHandler() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
        // Search on button click
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                navigateToSearch(query);
            }
        });

        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    navigateToSearch(query);
                }
            }
        });
    }
}

// Navigation functions
function navigateToCategory(categoryId) {
    window.location.href = `/books.html?category=${encodeURIComponent(categoryId)}`;
}

function navigateToSearch(query) {
    window.location.href = `/books.html?search=${encodeURIComponent(query)}`;
}

function viewBookDetails(bookId) {
    window.location.href = `/book-details.html?id=${bookId}`;
}

// Helper functions
function formatCondition(condition) {
    return condition.replace('_', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Format price to Indian Rupees
function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(price);
}

// Setup become seller button handler
function setupBecomeSellerButton() {
    const becomeSellerBtn = document.getElementById('becomeSeller');
    if (becomeSellerBtn) {
        becomeSellerBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Check if user is authenticated
            if (!isAuthenticated()) {
                showToast('Please login first to become a seller', 'warning');
                // Save the intended destination in localStorage
                localStorage.setItem('redirectAfterLogin', '/become-seller.html');
                // Redirect to login page
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1500);
                return;
            }
            
            // User is authenticated, check if already a seller
            const user = await getCurrentUser();
            if (user.role === 'seller') {
                showToast('You are already a seller!', 'info');
                setTimeout(() => {
                    window.location.href = '/my-books.html';
                }, 1500);
                return;
            }
            
            // Redirect to become-seller page
            window.location.href = '/become-seller.html';
        });
    }
} 