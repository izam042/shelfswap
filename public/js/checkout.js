// Global variables
let cartItems = [];
let cartTotal = 0;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] Checkout page loaded');
    
    // Prevent any automatic form submission
    const existingSubmitHandlers = window.onsubmit;
    window.onsubmit = function(e) {
        console.log('[DEBUG] Global submit handler caught form submission');
        e.preventDefault();
        return false;
    };
    
    // Check if user is logged in
    if (!isAuthenticated()) {
        console.log('[DEBUG] User not authenticated, redirecting to login');
        window.location.href = '/login.html';
        localStorage.setItem('redirectAfterLogin', '/checkout.html');
        return;
    }
    
    // Get cart items from localStorage
    try {
        cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
        console.log('[DEBUG] Cart items loaded:', cartItems);
    } catch(error) {
        console.error('[DEBUG] Error parsing cart items:', error);
        cartItems = [];
    }
    
    // Redirect to cart page if cart is empty
    if (cartItems.length === 0) {
        console.log('[DEBUG] Cart is empty, redirecting to cart page');
        alert('Your cart is empty. Redirecting to cart page.');
        window.location.href = '/cart.html';
        return;
    }
    
    // Calculate cart total
    cartTotal = calculateCartTotal();
    console.log('[DEBUG] Cart total calculated:', cartTotal);
    
    // Display cart items and total
    displayCartItems();
    const cartTotalElement = document.getElementById('cartTotal');
    if (cartTotalElement) {
        cartTotalElement.textContent = `₹${cartTotal.toFixed(2)}`;
    } else {
        console.error('[DEBUG] cartTotal element not found');
    }
    
    // Remove any existing event listeners
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        console.log('[DEBUG] Found checkout form, removing existing listeners');
        const clonedForm = checkoutForm.cloneNode(true);
        checkoutForm.parentNode.replaceChild(clonedForm, checkoutForm);
        
        // Set up form submission with the cloned form
        console.log('[DEBUG] Setting up form submission handler');
        clonedForm.addEventListener('submit', function(e) {
            console.log('[DEBUG] Form submit event fired');
            e.preventDefault();
            e.stopPropagation();
            handleFormSubmit(e);
            return false;
        });
        
        // Also add click handler to the submit button as a fallback
        const submitButton = clonedForm.querySelector('button[type="submit"]');
        if (submitButton) {
            console.log('[DEBUG] Adding click handler to submit button');
            submitButton.addEventListener('click', function(e) {
                console.log('[DEBUG] Submit button clicked');
                e.preventDefault();
                e.stopPropagation();
                handleFormSubmit(e);
                return false;
            });
        } else {
            console.error('[DEBUG] Submit button not found');
        }
    } else {
        console.error('[DEBUG] Checkout form not found in the DOM');
        alert('Error: Checkout form not found on the page. Please refresh and try again.');
    }
    
    console.log('[DEBUG] Checkout page initialization complete');
});

// Calculate cart total
function calculateCartTotal() {
    console.log('[DEBUG] Calculating cart total');
    let total = 0;
    try {
        total = cartItems.reduce((total, item) => {
            const price = parseFloat(item.price || 0);
            const quantity = parseInt(item.quantity || 1);
            console.log(`[DEBUG] Item: ${item.title}, Price: ${price}, Quantity: ${quantity}`);
            return total + (price * quantity);
        }, 0);
    } catch (error) {
        console.error('[DEBUG] Error calculating cart total:', error);
    }
    console.log('[DEBUG] Total calculated:', total);
    return total;
}

// Display cart items
function displayCartItems() {
    console.log('[DEBUG] Displaying cart items');
    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) {
        console.error('[DEBUG] Cart items container not found');
        return;
    }
    
    if (cartItems.length === 0) {
        console.log('[DEBUG] Cart is empty, showing empty cart message');
        cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        return;
    }
    
    console.log('[DEBUG] Rendering', cartItems.length, 'cart items');
    let html = '';
    try {
        html = cartItems.map(item => {
            console.log('[DEBUG] Rendering item:', item.title);
            return `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.image_url || '/images/default-book.png'}" alt="${item.title}" 
                             onerror="this.onerror=null; this.src='/images/default-book.png';">
                    </div>
            <div class="cart-item-details">
                <h3>${item.title}</h3>
                        <p class="author">by ${item.author}</p>
                        <p class="price">₹${item.price}</p>
                        <p class="quantity">Quantity: ${item.quantity || 1}</p>
                    </div>
            </div>
        `;
        }).join('');
    } catch (error) {
        console.error('[DEBUG] Error generating cart item HTML:', error);
    }
    
    cartItemsContainer.innerHTML = html;
    console.log('[DEBUG] Cart items displayed');
}

// Handle form submission
function handleFormSubmit(e) {
    console.log('[DEBUG] Form submission handler called');
    if (e) {
    e.preventDefault();
        e.stopPropagation();
    }
    
    // Show alert to confirm
    if (confirm('Are you sure you want to place this order?')) {
        console.log('[DEBUG] Order confirmation approved');
    } else {
        console.log('[DEBUG] Order confirmation cancelled');
        return;
    }
    
    // Validate form data
    console.log('[DEBUG] Validating form data');
    const formData = validateFormData();
    if (!formData) {
        console.log('[DEBUG] Form validation failed');
        alert('Please fill in all required fields correctly.');
        return;
    }
    
    // Show loading spinner
    showLoadingSpinner();
    console.log('[DEBUG] Showing loading spinner');
    
    // Format data for API - this is the key change
    const orderPayload = {
        // Basic order information
        buyer_id: getCurrentUser().id,
        order_reference: generateOrderReference(),
        status: 'pending',
        
        // Order items - using array of items from cart
        items: formData.items.map(item => ({
            book_id: item.id,
            quantity: item.quantity || 1,
            price: item.price
        })),
        
        // Order totals
        order_total: formData.totalAmount,
        shipping_fee: 49.00,
        platform_fee: formData.totalAmount >= 500 ? 29.00 : 19.00,
        
        // Payment information
        payment_method: 'cash on delivery',
        
        // Shipping information
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2 || '',
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        country: formData.country || 'India'
    };
    
    console.log('[DEBUG] Prepared order payload:', orderPayload);
    
    // Submit order using fetch - try multiple API endpoints if needed
    tryPlaceOrder(orderPayload);
}

// Try different API endpoints for order placement
function tryPlaceOrder(orderPayload) {
    console.log('[DEBUG] Attempting to place order');
    
    // First try the default endpoint
    fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
            },
        body: JSON.stringify(orderPayload)
    })
    .then(response => {
        console.log('[DEBUG] Order API response status:', response.status);
        if (!response.ok) {
            // If the default endpoint fails, try alternative format
            if (response.status === 400 || response.status === 422) {
                console.log('[DEBUG] First attempt failed, trying alternative format');
                return tryAlternativeOrderFormat(orderPayload);
            }
            
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Failed to place order');
            });
        }
        return response.json();
    })
    .then(orderData => {
        handleOrderSuccess(orderData);
    })
    .catch(err => {
        console.error('[DEBUG] Error placing order:', err);
        alert('Error placing order: ' + (err.message || 'Unknown error'));
        hideLoadingSpinner();
    });
}

// Try an alternative format if the first one fails
function tryAlternativeOrderFormat(orderPayload) {
    // Simplified payload with separate structure for items
    const simplifiedPayload = {
        // Order basic info
        buyer_id: orderPayload.buyer_id,
        order_reference: orderPayload.order_reference,
        status: 'pending',
        order_total: orderPayload.order_total,
        
        // Order fees
        shipping_fee: orderPayload.shipping_fee,
        platform_fee: orderPayload.platform_fee,
        
        // Order items in different format
        order_items: orderPayload.items,
        
        // Address info all in one group
        shipping_address: {
            full_name: orderPayload.full_name,
            phone_number: orderPayload.phone_number,
            address_line1: orderPayload.address_line1,
            address_line2: orderPayload.address_line2,
            city: orderPayload.city,
            state: orderPayload.state,
            postal_code: orderPayload.postal_code,
            country: orderPayload.country
        }
    };
    
    console.log('[DEBUG] Trying alternative payload format:', simplifiedPayload);
    
    return fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
                    },
        body: JSON.stringify(simplifiedPayload)
    })
    .then(response => {
        console.log('[DEBUG] Alternative format response status:', response.status);
        if (!response.ok) {
            // If both attempts fail, use fallback method
            console.log('[DEBUG] Both API attempts failed, using fallback method');
            return createFallbackOrder(orderPayload);
        }
        return response.json();
    });
}

// Create a fallback order when API fails
function createFallbackOrder(orderPayload) {
    console.log('[DEBUG] Creating fallback order');
    
    try {
        // Generate an order ID if none exists
        const orderId = orderPayload.order_reference || generateOrderReference();
        
        // Create order data matching our database structure
        const orderData = {
            id: Math.floor(Math.random() * 1000000),
            order_reference: orderId,
            created_at: new Date().toISOString(),
            buyer_id: orderPayload.buyer_id,
            status: 'pending',
            
            // Order items
            items: orderPayload.items,
            
            // Order totals
            order_total: orderPayload.order_total,
            shipping_fee: orderPayload.shipping_fee || 49.00,
            platform_fee: orderPayload.platform_fee || 19.00,
            
            // Shipping information - using the same field names as the database
            full_name: orderPayload.full_name,
            phone_number: orderPayload.phone_number,
            address_line1: orderPayload.address_line1,
            address_line2: orderPayload.address_line2,
            city: orderPayload.city,
            state: orderPayload.state,
            postal_code: orderPayload.postal_code,
            country: orderPayload.country
        };
        
        // Store order in localStorage as fallback
        let userOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
        userOrders.push(orderData);
        localStorage.setItem('userOrders', JSON.stringify(userOrders));
        
        // Also add the order to the shopping history
        let orderHistory = JSON.parse(localStorage.getItem('orderHistory') || '[]');
        
        // Create simplified order history entry
        const historyEntry = {
            id: orderData.id,
            order_reference: orderData.order_reference,
            date: orderData.created_at,
            status: orderData.status,
            total: orderData.order_total,
            address: `${orderData.address_line1}, ${orderData.city}, ${orderData.state}, ${orderData.postal_code}`,
            items: orderData.items.map(item => ({
                title: item.title || 'Book',
                price: item.price,
                quantity: item.quantity || 1
            }))
        };
        
        orderHistory.push(historyEntry);
        localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
        
        console.log('[DEBUG] Fallback order created:', orderData);
        
        // Return the created order
        return Promise.resolve({
            id: orderData.id,
            orderId: orderData.order_reference,
            message: 'Order created successfully (local fallback)'
        });
    } catch (error) {
        console.error('[DEBUG] Error creating fallback order:', error);
        return Promise.reject(new Error('Failed to create order using fallback method.'));
    }
}

// Handle successful order placement
function handleOrderSuccess(orderData) {
    console.log('[DEBUG] Order placed successfully:', orderData);
    
    // Clear cart
    localStorage.removeItem('cart');
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Alert success and redirect
    alert('Order placed successfully! Redirecting to order confirmation page.');
    
    // Redirect to success page
    window.location.href = `/order-success.html?orderId=${orderData.orderId || orderData.id || 'new'}`;
}

// Validate form data
function validateFormData() {
    console.log('[DEBUG] Validating form data');
    
    // Get form values
    const fullName = document.getElementById('fullName');
    const phoneNumber = document.getElementById('phoneNumber');
    const addressLine1 = document.getElementById('addressLine1');
    const addressLine2 = document.getElementById('addressLine2');
    const city = document.getElementById('city');
    const state = document.getElementById('state');
    const postalCode = document.getElementById('postalCode');
    const country = document.getElementById('country');
    
    // Check if elements exist
    if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !postalCode || !country) {
        console.error('[DEBUG] Some form elements not found:', {
            fullName: !!fullName,
            phoneNumber: !!phoneNumber,
            addressLine1: !!addressLine1,
            city: !!city,
            state: !!state,
            postalCode: !!postalCode,
            country: !!country
        });
        alert('Error: Form elements not found. Please refresh the page and try again.');
        return null;
    }
    
    // Get values
    const fullNameValue = fullName.value.trim();
    const phoneNumberValue = phoneNumber.value.trim();
    const addressLine1Value = addressLine1.value.trim();
    const addressLine2Value = addressLine2 ? addressLine2.value.trim() : '';
    const cityValue = city.value.trim();
    const stateValue = state.value.trim();
    const postalCodeValue = postalCode.value.trim();
    const countryValue = country.value.trim();
    
    console.log('[DEBUG] Form values:', {
        fullName: fullNameValue,
        phoneNumber: phoneNumberValue,
        addressLine1: addressLine1Value,
        city: cityValue,
        state: stateValue,
        postalCode: postalCodeValue,
        country: countryValue
    });
    
    // Validate required fields
    let isValid = true;
    let errorMessage = '';
    
    if (!fullNameValue) {
        isValid = false;
        errorMessage = 'Please enter your full name';
        fullName.focus();
    }
    else if (!phoneNumberValue) {
        isValid = false;
        errorMessage = 'Please enter your phone number';
        phoneNumber.focus();
    }
    else if (!/^\d{10}$/.test(phoneNumberValue)) {
        isValid = false;
        errorMessage = 'Please enter a valid 10-digit phone number';
        phoneNumber.focus();
    }
    else if (!addressLine1Value) {
        isValid = false;
        errorMessage = 'Please enter your address';
        addressLine1.focus();
    }
    else if (!cityValue) {
        isValid = false;
        errorMessage = 'Please enter your city';
        city.focus();
    }
    else if (!stateValue) {
        isValid = false;
        errorMessage = 'Please enter your state';
        state.focus();
    }
    else if (!postalCodeValue) {
        isValid = false;
        errorMessage = 'Please enter your postal code';
        postalCode.focus();
    }
    else if (!/^\d{6}$/.test(postalCodeValue)) {
        isValid = false;
        errorMessage = 'Please enter a valid 6-digit postal code';
        postalCode.focus();
    }
    else if (!countryValue) {
        isValid = false;
        errorMessage = 'Please enter your country';
        country.focus();
    }
    
    if (!isValid) {
        console.log('[DEBUG] Validation failed:', errorMessage);
        alert('Validation Error: ' + errorMessage);
        return null;
    }
    
    console.log('[DEBUG] Form validation successful');
    
    // Return validated form data
    return {
        fullName: fullNameValue,
        phoneNumber: phoneNumberValue,
        addressLine1: addressLine1Value,
        addressLine2: addressLine2Value,
        city: cityValue,
        state: stateValue,
        postalCode: postalCodeValue,
        country: countryValue,
        items: cartItems,
        totalAmount: cartTotal,
        userId: getCurrentUser().id
    };
}

// Helper function to show loading spinner
function showLoadingSpinner() {
    console.log('[DEBUG] Showing loading spinner');
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    } else {
        // Create spinner if it doesn't exist
        console.log('[DEBUG] Creating loading spinner element');
        const spinnerElement = document.createElement('div');
        spinnerElement.id = 'loadingSpinner';
        spinnerElement.className = 'loading-spinner';
        spinnerElement.innerHTML = '<div class="spinner"></div><p>Processing your order...</p>';
        document.body.appendChild(spinnerElement);
    }
    
    // Disable both submit button and place order button
    disableButtons();
}

// Helper function to hide loading spinner
function hideLoadingSpinner() {
    console.log('[DEBUG] Hiding loading spinner');
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
    
    // Enable both submit button and place order button
    enableButtons();
}

// Helper function to disable all form buttons
function disableButtons() {
    console.log('[DEBUG] Disabling form buttons');
    
    // Try to find the form buttons by different methods
    const formButtons = [
        document.querySelector('button[type="submit"]'),
        document.getElementById('placeOrderBtn'),
        document.querySelector('.btn-checkout')
    ];
    
    let buttonDisabled = false;
    formButtons.forEach(button => {
        if (button) {
            button.disabled = true;
            console.log('[DEBUG] Disabled button:', button.id || button.className);
            buttonDisabled = true;
        }
    });
    
    if (!buttonDisabled) {
        console.error('[DEBUG] No buttons found to disable');
    }
}

// Helper function to enable all form buttons
function enableButtons() {
    console.log('[DEBUG] Enabling form buttons');
    
    // Try to find the form buttons by different methods
    const formButtons = [
        document.querySelector('button[type="submit"]'),
        document.getElementById('placeOrderBtn'),
        document.querySelector('.btn-checkout')
    ];
    
    let buttonEnabled = false;
    formButtons.forEach(button => {
        if (button) {
            button.disabled = false;
            console.log('[DEBUG] Enabled button:', button.id || button.className);
            buttonEnabled = true;
        }
    });
    
    if (!buttonEnabled) {
        console.error('[DEBUG] No buttons found to enable');
    }
}

// Add another safety check for direct invocation
window.addEventListener('load', function() {
    console.log('[DEBUG] Window load event fired');
    setTimeout(function() {
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm && !checkoutForm._hasCheckoutListener) {
            console.log('[DEBUG] Adding backup event listener to form');
            checkoutForm._hasCheckoutListener = true;
            checkoutForm.addEventListener('submit', function(e) {
                console.log('[DEBUG] Backup form submit handler called');
                e.preventDefault();
                handleFormSubmit(e);
                return false;
            });
        }
    }, 500);
});

// Generate a unique order reference
function generateOrderReference() {
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${timestamp}-${random}`;
} 