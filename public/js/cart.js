document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        localStorage.setItem('redirectAfterLogin', '/cart.html');
        return;
    }

    // Load cart items
    loadCartItems();

    // Setup checkout button
    document.getElementById('checkout-btn').addEventListener('click', checkout);
});

/**
 * Load cart items from localStorage and display them
 */
function loadCartItems() {
    const cartItems = getCartItems();
    const cartItemsContainer = document.querySelector('.cart-items');
    
    // Clear existing content
    cartItemsContainer.innerHTML = '';
    
    // Calculate total
    let subtotal = 0;
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="no-results">
                <p>Your cart is empty. <a href="/books.html">Continue shopping</a>.</p>
            </div>
        `;
        document.getElementById('checkout-btn').disabled = true;
        updateOrderSummary(0);
        return;
    }
    
    // Enable checkout button
    document.getElementById('checkout-btn').disabled = false;
    
    // Create cart item elements
    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const cartItemElement = createCartItemElement(item);
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    updateOrderSummary(subtotal);
}

/**
 * Create a cart item element
 */
function createCartItemElement(item) {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.dataset.id = item.id;

    // Handle image path
    let imagePath;
    if (item.front_image) {
        imagePath = item.front_image.startsWith('/') ? item.front_image : `/uploads/${item.front_image}`;
    } else if (item.image) {
        imagePath = item.image.startsWith('/') ? item.image : `/uploads/${item.image}`;
    } else {
        imagePath = '/uploads/default-book.jpg';
    }
    
    cartItem.innerHTML = `
        <img src="${imagePath}" 
             alt="${item.title}" 
             class="cart-item-image" 
             onerror="this.onerror=null; this.src='/uploads/default-book.jpg';">
        <div class="cart-item-details">
            <h3>${item.title}</h3>
            <p>${item.author}</p>
            <p>Price: ₹${formatPrice(item.price)}</p>
            <div class="quantity-control">
                <button class="btn-decrease" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="btn-increase">+</button>
                <button class="btn-remove">Remove</button>
            </div>
        </div>
        <div class="cart-item-price">₹${formatPrice(item.price * item.quantity)}</div>
    `;
    
    // Setup quantity buttons
    cartItem.querySelector('.btn-decrease').addEventListener('click', () => updateQuantity(item.id, -1));
    cartItem.querySelector('.btn-increase').addEventListener('click', () => updateQuantity(item.id, 1));
    cartItem.querySelector('.btn-remove').addEventListener('click', () => removeFromCart(item.id));
    
    return cartItem;
}

/**
 * Update quantity of an item in the cart
 */
function updateQuantity(itemId, change) {
    const cartItems = getCartItems();
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) return;
    
    cartItems[itemIndex].quantity += change;
    
    // Remove if quantity is 0
    if (cartItems[itemIndex].quantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    // Update localStorage
    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    // Reload cart
    loadCartItems();
    
    // Update cart count in header
    updateCartCount();
}

/**
 * Remove an item from the cart
 */
function removeFromCart(itemId) {
    const cartItems = getCartItems().filter(item => item.id !== itemId);
    localStorage.setItem('cart', JSON.stringify(cartItems));
    loadCartItems();
    updateCartCount();
    
    // Show toast
    showToast('Item removed from cart', 'success');
}

/**
 * Update the order summary
 */
function updateOrderSummary(subtotal) {
    // Update subtotal
    document.getElementById('subtotal').textContent = `₹${formatPrice(subtotal)}`;
    
    // Get the fee elements
    const deliveryChargeElement = document.getElementById('delivery-charge');
    const platformFeeElement = document.getElementById('platform-fee');
    const totalElement = document.getElementById('total');
    
    if (subtotal === 0) {
        // If cart is empty, hide fees and set total to 0
        deliveryChargeElement.textContent = '₹0.00';
        platformFeeElement.textContent = '₹0.00';
        totalElement.textContent = '₹0.00';
        return;
    }
    
    // Fixed delivery charge
    const deliveryCharge = 49.00;
    deliveryChargeElement.textContent = `₹${formatPrice(deliveryCharge)}`;
    
    // Platform fee based on order value
    const platformFee = subtotal >= 500 ? 29.00 : 19.00;
    platformFeeElement.textContent = `₹${formatPrice(platformFee)}`;
    
    // Calculate total
    const total = subtotal + deliveryCharge + platformFee;
    totalElement.textContent = `₹${formatPrice(total)}`;
}

/**
 * Get cart items from localStorage
 */
function getCartItems() {
    const cartData = localStorage.getItem('cart');
    return cartData ? JSON.parse(cartData) : [];
}

/**
 * Format price to Indian Rupees with 2 decimal places
 */
function formatPrice(price) {
    return Number(price).toFixed(2);
}

/**
 * Checkout process
 */
function checkout() {
    const cartItems = getCartItems();
    
    if (cartItems.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    // Redirect to checkout page
    window.location.href = '/checkout.html';
}

/**
 * Show toast message
 */
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

// Update cart count when page loads
updateCartCount(); 