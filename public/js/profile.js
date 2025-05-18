// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // Load user data
    await loadUserData();

    // Load account statistics
    loadAccountStats();

    // Setup form event listeners
    setupFormListeners();
});

// Load user data
async function loadUserData() {
    try {
        showLoadingSpinner();
        const user = await getCurrentUser();
        
        if (!user) {
            throw new Error('No user data available');
        }

        console.log('Loading user data:', user);

        // Update profile header
        const userNameElement = document.getElementById('userName');
        const userEmailDisplayElement = document.getElementById('userEmailDisplay');
        
        if (userNameElement) {
            userNameElement.textContent = user.name || 'User';
        }
        if (userEmailDisplayElement) {
            userEmailDisplayElement.textContent = user.email || '';
        }
        
        // Update form fields
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const roleInput = document.getElementById('role');
        
        if (nameInput) {
            nameInput.value = user.name || '';
        }
        if (emailInput) {
            emailInput.value = user.email || '';
        }
        if (roleInput) {
            roleInput.value = formatRole(user.role || 'buyer');
        }
        
        // Update dropdown menu
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.name || user.email || 'User';
        }
    } catch (err) {
        console.error('Error loading user data:', err);
        showToast('Error loading profile data', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Setup form event listeners
function setupFormListeners() {
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
}

// Update profile
async function updateProfile() {
    try {
        showLoadingSpinner();
        const name = document.getElementById('name').value;

        const response = await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (response.ok) {
            // Update current user data
            const user = getCurrentUser();
            user.name = name;
            localStorage.setItem('user', JSON.stringify(user));

            // Update UI
            document.getElementById('userName').textContent = name;
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = name;
            }

            showToast('Profile updated successfully', 'success');
        } else {
            showToast(data.message || 'Failed to update profile', 'error');
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        showToast('Error updating profile', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Load account statistics
async function loadAccountStats() {
    try {
        const user = getCurrentUser();
        const statsGrid = document.querySelector('.stats-grid');

        if (user.role === 'seller') {
            await loadSellerStats(statsGrid);
        } else {
            await loadBuyerStats(statsGrid);
        }
    } catch (err) {
        console.error('Error loading account statistics:', err);
        showToast('Error loading account statistics', 'error');
    }
}

// Load seller statistics
async function loadSellerStats(container) {
    try {
        const response = await fetch('/api/users/stats/seller', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load seller statistics');
        }

        const stats = await response.json();

        container.innerHTML = `
            <div class="stat-card">
                <i class="fas fa-book"></i>
                <h3>Total Books</h3>
                <p>${stats.total_books || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-check-circle"></i>
                <h3>Books Sold</h3>
                <p>${stats.books_sold || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-rupee-sign"></i>
                <h3>Total Earnings</h3>
                <p>₹${stats.total_earnings || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-star"></i>
                <h3>Active Listings</h3>
                <p>${stats.active_listings || 0}</p>
            </div>
        `;
    } catch (err) {
        console.error('Error loading seller stats:', err);
        container.innerHTML = '<p class="error-message">Failed to load statistics</p>';
    }
}

// Load buyer statistics
async function loadBuyerStats(container) {
    try {
        const response = await fetch('/api/users/stats/buyer', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load buyer statistics');
        }

        const stats = await response.json();

        container.innerHTML = `
            <div class="stat-card">
                <i class="fas fa-shopping-cart"></i>
                <h3>Total Orders</h3>
                <p>${stats.total_orders || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-check-circle"></i>
                <h3>Completed Orders</h3>
                <p>${stats.completed_orders || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-rupee-sign"></i>
                <h3>Total Spent</h3>
                <p>₹${stats.total_spent || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-clock"></i>
                <h3>Pending Orders</h3>
                <p>${stats.pending_orders || 0}</p>
            </div>
        `;
    } catch (err) {
        console.error('Error loading buyer stats:', err);
        container.innerHTML = '<p class="error-message">Failed to load statistics</p>';
    }
}

// Helper function to format role
function formatRole(role) {
    return role.charAt(0).toUpperCase() + role.slice(1);
} 