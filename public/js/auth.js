// Auth state management
let currentUser = null;

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupDropdownMenu();
});

// Function to check authentication status
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        updateUIForLoggedOutUser();
        return;
    }

    try {
        console.log('Checking authentication status with server...');
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            console.log('User authenticated, profile data:', user);
            
            // Update localStorage with the latest user data from server
            if (user.email) localStorage.setItem('userEmail', user.email);
            if (user.name) localStorage.setItem('userName', user.name);
            if (user.profile_picture) localStorage.setItem('userProfilePicture', user.profile_picture);
            
            currentUser = user;
            updateUIForLoggedInUser(user);
            return user; // Return the user object
        } else {
            console.log('Authentication check failed - clearing auth data');
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userProfilePicture');
            updateUIForLoggedOutUser();
            return null;
        }
    } catch (err) {
        console.error('Error checking auth status:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userProfilePicture');
        updateUIForLoggedOutUser();
        return null;
    }
}

// Update UI for logged-in user
function updateUIForLoggedInUser(user) {
    console.log('Updating UI for logged-in user:', user);
    
    // Only update UI if we're not on the login or register page
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('register.html')) {
        return;
    }

    // Hide login/register links
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    if (loginLink) loginLink.classList.add('hidden');
    if (registerLink) registerLink.classList.add('hidden');
    
    // Show cart link for logged-in users
    const cartLink = document.getElementById('cartLink');
    if (cartLink) cartLink.classList.remove('hidden');
    
    // Handle "Become a Seller" / "List Book" based on role
    const becomeSellerLink = document.getElementById('becomeSeller');
    if (becomeSellerLink) {
        if (user.role === 'seller') {
            // Change link to "List Book" for sellers
            becomeSellerLink.href = '/sell.html';
            becomeSellerLink.innerHTML = '<i class="fas fa-plus-circle"></i> List Book';
        } else {
            // Keep as "Become a Seller" for buyers
            becomeSellerLink.href = '/become-seller.html';
            becomeSellerLink.innerHTML = 'Become a Seller';
        }
        // Make sure it's visible
        becomeSellerLink.classList.remove('hidden');
    }
    
    // Show user dropdown
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.remove('hidden');
        
        // Update dropdown to show user's name instead of email
        const userDisplay = document.getElementById('userEmail');
        if (userDisplay) {
            // Use name if available, otherwise fallback to email
            // Make sure we're using the actual user object from the server or localStorage
            console.log('Setting user display name:', user.name || localStorage.getItem('userName') || user.email);
            userDisplay.textContent = user.name || localStorage.getItem('userName') || user.email;
        }
        
        // Clear existing dropdown content
        const dropdownContent = userDropdown.querySelector('.dropdown-content');
        if (dropdownContent) {
            dropdownContent.innerHTML = '';
            
            // Add admin dashboard link only for admin users
            if (user.role === 'admin') {
                const adminLink = document.createElement('a');
                adminLink.href = '/admin-dashboard.html';
                adminLink.textContent = 'Admin Dashboard';
                dropdownContent.appendChild(adminLink);
            }
            
            // Add role-specific links
            if (user.role === 'seller') {
                const myBooksLink = document.createElement('a');
                myBooksLink.href = '/my-books.html';
                myBooksLink.textContent = 'My Books';
                dropdownContent.appendChild(myBooksLink);
                
                const sellLink = document.createElement('a');
                sellLink.href = '/sell.html';
                sellLink.textContent = 'Sell Book';
                dropdownContent.appendChild(sellLink);
            } else if (user.role === 'buyer') {
                const myOrdersLink = document.createElement('a');
                myOrdersLink.href = '/my-orders.html';
                myOrdersLink.textContent = 'My Orders';
                dropdownContent.appendChild(myOrdersLink);
                
                const becomeSellerLink = document.createElement('a');
                becomeSellerLink.href = '/become-seller.html';
                becomeSellerLink.textContent = 'Become a Seller';
                dropdownContent.appendChild(becomeSellerLink);
            }
            
            // Add common links
            const profileLink = document.createElement('a');
            profileLink.href = '/profile.html';
            profileLink.textContent = 'Profile';
            dropdownContent.appendChild(profileLink);
            
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                logout();
            };
            dropdownContent.appendChild(logoutBtn);
        }
    }
}

// Update UI for logged-out user
function updateUIForLoggedOutUser() {
    // Only update UI if we're not on the login or register page
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('register.html')) {
        return;
    }

    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const userDropdown = document.getElementById('userDropdown');
    const cartLink = document.getElementById('cartLink');

    if (loginLink) loginLink.classList.remove('hidden');
    if (registerLink) registerLink.classList.remove('hidden');
    if (userDropdown) userDropdown.classList.add('hidden');
    if (cartLink) cartLink.classList.add('hidden');
    
    currentUser = null;
}

// Login function
async function login(email, password) {
    try {
        showLoadingSpinner();
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.user.email); // Store user email
            localStorage.setItem('userName', data.user.name); // Store user name
            currentUser = data.user;
            updateUIForLoggedInUser(data.user);
            showToast('Login successful!', 'success');
            return data.user;
        } else {
            showToast(data.message || 'Login failed', 'error');
            throw new Error(data.message || 'Login failed');
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast('Error during login', 'error');
        throw err; // Re-throw the error to be caught by the form handler
    } finally {
        hideLoadingSpinner();
    }
}

// Register function
async function register(name, email, password) {
    try {
        showLoadingSpinner();
        
        // Validate inputs
        if (!name || !email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name, 
                email, 
                password, 
                role: 'buyer' // Default role is buyer
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.user.email); // Store user email
            localStorage.setItem('userName', data.user.name); // Store user name
            currentUser = data.user;
            updateUIForLoggedInUser(data.user);
            showToast('Registration successful!', 'success');
            window.location.href = '/';
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showToast('Error during registration. Please try again.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Logout function
function logout() {
    // Clear all user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userProfilePicture');
    localStorage.removeItem('user');
    currentUser = null;
    
    // Update UI
    updateUIForLoggedOutUser();
    
    // Show success message and redirect
    showToast('Logged out successfully', 'success');
    window.location.href = '/';
}

// Helper function to get auth token
function getToken() {
    return localStorage.getItem('token');
}

// Helper function to check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Get current user
async function getCurrentUser() {
    try {
        // First check if we have a token
        const token = localStorage.getItem('token');
        if (!token) {
            return null;
        }

        // Try to get user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.email && user.name) {
                return user;
            }
        }

        // If no valid user in localStorage, fetch from server
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const user = await response.json();
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    } catch (err) {
        console.error('Error getting current user:', err);
        return null;
    }
}

// Helper function to show loading spinner
function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.remove('hidden');
}

// Helper function to hide loading spinner
function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('hidden');
}

// Helper function to show toast message
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Set up dropdown menu click behavior
function setupDropdownMenu() {
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdown = document.getElementById('userDropdown');
    
    if (dropdownBtn && dropdown) {
        // Toggle dropdown when button is clicked
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the document click from immediately closing it
            dropdown.classList.toggle('dropdown-active');
        });
        
        // Close dropdown when clicking anywhere else on the page
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('dropdown-active');
            }
        });
        
        // Prevent clicks inside dropdown from closing it
        dropdown.querySelector('.dropdown-content')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// Handle Google authentication
async function handleGoogleAuth(idToken) {
    try {
        console.log('Starting Google authentication with token:', idToken.substring(0, 10) + '...');
        showLoadingSpinner();
        
        // Clear any existing authentication data to ensure a fresh login
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userProfilePicture');
        
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idToken })
        });

        const data = await response.json();
        console.log('Google auth response received:', data);

        if (response.ok) {
            console.log('Authentication successful. User data:', data.user);
            
            // Validate the user data
            if (!data.user || !data.user.email) {
                console.error('Invalid user data received from server');
                showToast('Error: Invalid user data received', 'error');
                throw new Error('Invalid user data received');
            }
            
            // Store user information in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.user.email);
            
            // Ensure user has a name (not null or "Google User")
            const userName = data.user.name && data.user.name !== 'Google User' 
                ? data.user.name 
                : data.user.email.split('@')[0];
                
            localStorage.setItem('userName', userName);
            
            if (data.user.profile_picture) {
                localStorage.setItem('userProfilePicture', data.user.profile_picture);
            }
            
            currentUser = data.user;
            
            // Force an update of the UI
            console.log('Updating UI for user:', userName);
            updateUIForLoggedInUser({
                ...data.user,
                name: userName // Ensure UI shows the proper name
            });
            
            showToast('Google authentication successful!', 'success');
            
            // Check if there's a redirect URL stored
            const redirectURL = localStorage.getItem('redirectAfterLogin');
            if (redirectURL) {
                console.log('Redirecting to:', redirectURL);
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectURL;
            } else {
                console.log('Redirecting to homepage');
                window.location.href = '/';
            }
            
            return data.user;
        } else {
            console.error('Google auth failed:', data);
            showToast(data.message || 'Google authentication failed', 'error');
            throw new Error(data.message || 'Google authentication failed');
        }
    } catch (err) {
        console.error('Google auth error:', err);
        showToast('Error during Google authentication: ' + (err.message || ''), 'error');
        throw err;
    } finally {
        hideLoadingSpinner();
    }
} 