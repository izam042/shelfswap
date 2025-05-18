// State management
let currentBook = null;
let currentImageIndex = 0;
let bookImages = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (!bookId) {
        window.location.href = '/books.html';
        return;
    }

    loadBookDetails(bookId);
});

// Load book details
async function loadBookDetails(bookId) {
    try {
        showLoadingSpinner();
        const response = await fetch(`/api/books/${bookId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showToast('Book not found', 'error');
                window.location.href = '/books.html';
                return;
            }
            throw new Error('Failed to load book details');
        }

        const book = await response.json();
        currentBook = book;
        
        // Collect all available images
        bookImages = [];
        if (book.front_image) bookImages.push({ src: book.front_image, alt: 'Front Cover' });
        if (book.back_image) bookImages.push({ src: book.back_image, alt: 'Back Cover' });
        if (book.inside_image) bookImages.push({ src: book.inside_image, alt: 'Inside Pages' });
        
        // Fallback to old image field if no new images are available
        if (bookImages.length === 0 && book.image_url) {
            bookImages.push({ src: book.image_url, alt: 'Book Cover' });
        }
        
        // Add default image if no images available
        if (bookImages.length === 0) {
            bookImages.push({ src: '/images/default-book.png', alt: 'Default Book Cover' });
        }

        displayBookDetails(book);
        loadRelatedBooks(book.category);
    } catch (err) {
        console.error('Error loading book details:', err);
        showToast('Error loading book details', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Display book details
function displayBookDetails(book) {
    const bookDetailsContainer = document.getElementById('bookDetails');
    
    // Create gallery HTML
    const galleryHtml = `
        <div class="book-gallery">
            <img src="${bookImages[0].src}" alt="${bookImages[0].alt}" class="gallery-main-image" id="mainImage">
            
            ${bookImages.length > 1 ? `
                <div class="gallery-nav prev" onclick="changeImage(-1)">
                    <i class="fas fa-chevron-left"></i>
                </div>
                <div class="gallery-nav next" onclick="changeImage(1)">
                    <i class="fas fa-chevron-right"></i>
                </div>
            ` : ''}
            
            ${bookImages.length > 1 ? `
                <div class="gallery-thumbnails">
                    ${bookImages.map((img, index) => `
                        <img src="${img.src}" alt="${img.alt}" 
                            class="gallery-thumbnail ${index === 0 ? 'active' : ''}" 
                            onclick="setImage(${index})">
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    const isAvailable = book.status === 'approved';
    const isSold = book.status === 'sold';
    
    bookDetailsContainer.innerHTML = `
        <div class="book-details-container">
            <div class="book-gallery-container">
                ${galleryHtml}
            </div>
            
            <div class="mobile-cart-section">
                ${isAuthenticated() ? `
                    <div class="mobile-action-buttons">
                        ${isAvailable ? `
                            <button id="buyNowBtnMobile" class="btn btn-primary mobile-cart-btn" onclick="initiateBookPurchase(${book.id})">
                                <i class="fas fa-bolt"></i> Buy Now - ₹${formatPrice(book.price)}
                            </button>
                            <button id="addToCartBtn" class="btn btn-secondary mobile-cart-btn" onclick="addToCart()">
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                        ` : isSold ? `
                            <button class="btn btn-disabled mobile-cart-btn" disabled>
                                <i class="fas fa-times-circle"></i> Sold Out
                            </button>
                        ` : `
                            <button class="btn btn-disabled mobile-cart-btn" disabled>
                                <i class="fas fa-clock"></i> ${formatStatus(book.status)}
                            </button>
                        `}
                    </div>
                ` : `
                    <a href="/login.html" class="btn btn-primary mobile-cart-btn">
                        Login to Purchase - ₹${formatPrice(book.price)}
                    </a>
                `}
            </div>

            <div class="book-info">
                <h1>${book.title}</h1>
                <p class="author">by ${book.author}</p>
                <p class="price desktop-price">₹${formatPrice(book.price)}</p>
                
                <table class="details-table">
                    <tr>
                        <th>Condition</th>
                        <td>${formatCondition(book.condition)}</td>
                    </tr>
                    <tr>
                        <th>Category</th>
                        <td>${book.category}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td>
                            <span class="status-badge status-${book.status.toLowerCase()}">
                                ${formatStatus(book.status)}
                            </span>
                        </td>
                    </tr>
                </table>
                
                <p class="description">${book.description}</p>
                
                <div class="seller-info">
                    <p><strong>Seller:</strong> ${book.seller_name || 'ShelfSwap Seller'}</p>
                </div>
                
                <div class="desktop-cart-section">
                    ${isAuthenticated() ? `
                        <div class="desktop-action-buttons">
                            ${isAvailable ? `
                                <button id="buyNowBtnDesktop" class="btn btn-primary" onclick="initiateBookPurchase(${book.id})">
                                    <i class="fas fa-bolt"></i> Buy Now
                                </button>
                                <button id="addToCartBtnDesktop" class="btn btn-secondary" onclick="addToCart()">
                                    <i class="fas fa-shopping-cart"></i> Add to Cart
                                </button>
                            ` : isSold ? `
                                <button class="btn btn-disabled" disabled>
                                    <i class="fas fa-times-circle"></i> Sold Out
                                </button>
                            ` : `
                                <button class="btn btn-disabled" disabled>
                                    <i class="fas fa-clock"></i> ${formatStatus(book.status)}
                                </button>
                            `}
                        </div>
                    ` : `
                        <a href="/login.html" class="btn btn-primary">
                            Login to Purchase
                        </a>
                    `}
                </div>
            </div>
        </div>
    `;

    document.title = `${book.title} - ShelfSwap`;
}

// Change image in gallery
function changeImage(step) {
    currentImageIndex = (currentImageIndex + step + bookImages.length) % bookImages.length;
    updateGalleryImage();
}

// Set specific image in gallery
function setImage(index) {
    currentImageIndex = index;
    updateGalleryImage();
}

// Update gallery image display
function updateGalleryImage() {
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.gallery-thumbnail');
    
    if (mainImage) {
        mainImage.src = bookImages[currentImageIndex].src;
        mainImage.alt = bookImages[currentImageIndex].alt;
    }
    
    thumbnails.forEach((thumb, index) => {
        if (index === currentImageIndex) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// Add to cart function
async function addToCart() {
    if (!isAuthenticated()) {
        showToast('Please login to add items to cart', 'error');
        return;
    }

    const bookId = new URLSearchParams(window.location.search).get('id');
    if (!bookId) {
        showToast('Invalid book ID', 'error');
        return;
    }

    try {
        // Get existing cart or initialize new one
        const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
        
        // Check if book is already in cart
        const existingItem = cartItems.find(item => item.id === bookId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            // Get current book details
            const book = currentBook;
            
            // Handle image path
            let imagePath;
            if (book.front_image) {
                imagePath = book.front_image.startsWith('/') ? book.front_image : `/uploads/${book.front_image}`;
            } else if (book.image) {
                imagePath = book.image.startsWith('/') ? book.image : `/uploads/${book.image}`;
            } else {
                imagePath = '/uploads/default-book.jpg';
            }

            cartItems.push({
                id: bookId,
                title: book.title,
                author: book.author,
                price: parseFloat(book.price),
                image: imagePath,
                quantity: 1
            });
        }

        // Save updated cart
        localStorage.setItem('cart', JSON.stringify(cartItems));
        
        // Show success message
        showToast('Book added to cart successfully', 'success');
        
        // Update cart count in header
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Failed to add book to cart', 'error');
    }
}

function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (!cartCountElement) return;

    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElement.textContent = totalItems;
    cartCountElement.style.display = totalItems > 0 ? 'inline-block' : 'none';
}

// Load related books
async function loadRelatedBooks(category) {
    try {
        const response = await fetch(`/api/books?category=${category}&status=approved`);
        const books = await response.json();
        
        const relatedBooksContainer = document.getElementById('relatedBooks');
        if (!relatedBooksContainer) return;

        // Filter out current book and limit to 4 books
        const relatedBooks = books
            .filter(book => book.id !== currentBook.id)
            .slice(0, 4);
        
        if (relatedBooks.length === 0) {
            document.querySelector('.related-books').style.display = 'none';
            return;
        }
        
        relatedBooksContainer.innerHTML = relatedBooks.map(book => {
            // Use front image if available
            const imageUrl = book.front_image || book.image_url || '/images/default-book.png';
            
            return `
                <div class="featured-book-card" onclick="window.location.href='/book-details.html?id=${book.id}'">
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
        console.error('Error loading related books:', error);
        document.querySelector('.related-books').style.display = 'none';
    }
}

// Format price to Indian Rupees
function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }).format(price);
}

// Format condition
function formatCondition(condition) {
    if (!condition) return 'Unknown';
    return condition.replace(/_/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Format status
function formatStatus(status) {
    switch (status.toLowerCase()) {
        case 'approved':
            return 'Available';
        case 'pending':
            return 'Pending Approval';
        case 'sold':
            return 'Sold Out';
        case 'rejected':
            return 'Rejected';
        default:
            return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

// Helper functions for loading spinner and toast messages
function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.remove('hidden');
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Initiate book purchase
async function initiateBookPurchase(bookId) {
    if (!isAuthenticated()) {
        showToast('Please login to purchase books', 'error');
        return;
    }

    if (getCurrentUser().role === 'seller') {
        showToast('Sellers cannot purchase books. Please use a buyer account.', 'error');
        return;
    }

    try {
        showLoadingSpinner();
        
        // Create a temporary cart with just this book
        const singleItemCart = [{
            id: currentBook.id,
            title: currentBook.title,
            author: currentBook.author,
            price: currentBook.price,
            image_url: currentBook.front_image || currentBook.image_url || '/images/default-book.png',
            quantity: 1
        }];
        
        // Save to localStorage with a special flag indicating it's a direct purchase
        localStorage.setItem('cart', JSON.stringify(singleItemCart));
        localStorage.setItem('direct_purchase', 'true');
        
        // Generate order reference to track this specific purchase
        const orderReference = generateOrderReference();
        localStorage.setItem('order_reference', orderReference);
        
        // Show success message
        showToast('Redirecting to checkout...', 'success');
        
        // Update cart count
        updateCartCount();
        
        // Redirect to checkout page
        window.location.href = '/checkout.html';
    } catch (err) {
        console.error('Error initiating book purchase:', err);
        showToast('Error initiating checkout', 'error');
        hideLoadingSpinner();
    }
}

// Generate a unique order reference
function generateOrderReference() {
    const timestamp = new Date().getTime().toString().slice(-8);
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SW-${timestamp}-${randomPart}`;
}

// Edit book
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
            window.location.href = '/my-books.html';
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