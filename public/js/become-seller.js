document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        // If user is already a seller, redirect to my-books page
        if (user.role === 'seller') {
            window.location.href = '/my-books.html';
            return;
        }

        // Handle form submission
        const form = document.getElementById('sellerForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Get form values
                const phone = document.getElementById('phone').value.trim();
                const address = document.getElementById('address').value.trim();
                const city = document.getElementById('city').value.trim();
                const state = document.getElementById('state').value.trim();
                const pincode = document.getElementById('pincode').value.trim();

                // Validate form
                if (!phone || !address || !city || !state || !pincode) {
                    showToast('Please fill in all fields', 'error');
                    return;
                }

                // Validate phone number format (basic validation)
                if (!/^\d{10}$/.test(phone)) {
                    showToast('Please enter a valid 10-digit phone number', 'error');
                    return;
                }

                // Validate pincode format (basic validation)
                if (!/^\d{6}$/.test(pincode)) {
                    showToast('Please enter a valid 6-digit pincode', 'error');
                    return;
                }

                const formData = {
                    phone,
                    address,
                    city,
                    state,
                    pincode
                };

                try {
                    showLoadingSpinner();
                    const response = await fetch('/api/sellers/apply', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getToken()}`
                        },
                        body: JSON.stringify(formData)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        showToast('Application submitted successfully! Please wait for admin approval.', 'success');
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 2000);
                    } else {
                        showToast(data.message || 'Error submitting application', 'error');
                    }
                } catch (err) {
                    console.error('Error submitting application:', err);
                    showToast('Error submitting application. Please try again.', 'error');
                } finally {
                    hideLoadingSpinner();
                }
            });
        }
    } catch (err) {
        console.error('Error:', err);
        showToast('Error loading page. Please try again.', 'error');
    }
});

function showLoadingSpinner() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
} 