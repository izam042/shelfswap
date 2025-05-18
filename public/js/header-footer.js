document.addEventListener('DOMContentLoaded', function() {
    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = `
            <header class="header">
                <div class="header-content">
                    <div class="logo">
                        <a href="/">
                            <i class="fas fa-book"></i>
                            <span>ShelfSwap</span>
                        </a>
                    </div>
                    
                    <nav class="nav-links" style="display: flex !important;">
                        <a href="/" class="nav-link">Home</a>
                        <div class="dropdown">
                            <a href="#" class="dropdown-toggle nav-link">Policies <i class="fas fa-chevron-down"></i></a>
                            <div class="dropdown-content">
                                <a href="/terms.html">Terms & Conditions</a>
                                <a href="/shipping.html">Shipping Policy</a>
                                <a href="/refunds.html">Refunds & Cancellations</a>
                            </div>
                        </div>
                    </nav>
                </div>
            </header>
        `;
    }

    // Update header based on auth state
    updateHeaderAuth();
});

// Function to update header based on authentication state
function updateHeaderAuth() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userEmail = document.getElementById('userEmail');
    const isLoggedIn = localStorage.getItem('token') !== null;

    if (isLoggedIn) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userEmail.textContent = localStorage.getItem('userEmail') || 'User';
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }

    // Update cart count
    updateCartCount();
}

// Function to update cart count
function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (!cartCount) return;

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
} 