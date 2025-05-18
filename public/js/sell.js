document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user || user.role !== 'seller') {
        window.location.href = '/login.html';
        return;
    }
    setupImagePreview();
});

// Image preview setup
function setupImagePreview() {
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');

    imageInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImage.src = e.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeImage() {
    document.getElementById('image').value = '';
    document.getElementById('previewImage').src = '';
    document.getElementById('imagePreview').classList.add('hidden');
}

// Handle form submission
document.getElementById('sellBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    try {
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const description = document.getElementById('description').value.trim();
        const price = document.getElementById('price').value.trim();
        const condition = document.getElementById('condition').value.trim();
        const category = document.getElementById('category').value.trim();
        const imageFile = document.getElementById('image').files[0];

        // Validate fields before sending request
        if (!title || !author || !description || !price || !condition || !category) {
            showToast('All fields are required', 'error');
            hideLoading();
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('condition', condition);
        formData.append('category', category);

        if (imageFile) {
            formData.append('image', imageFile);
        }

        const response = await fetch('/api/books', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error listing book');
        }

        showToast('Book listed successfully!', 'success');
        setTimeout(() => {
            window.location.href = '/my-books.html';
        }, 2000);
    } catch (error) {
        showToast(error.message || 'Error listing book', 'error');
    } finally {
        hideLoading();
    }
});

// Show/hide loading spinner
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

// Show toast notifications
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

// Check seller approval status
async function checkSellerStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('/api/sellers/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                showToast('Please wait for admin approval before listing books', 'error');
                window.location.href = '/become-seller.html';
                return;
            }
            throw new Error('Failed to check seller status');
        }

        const data = await response.json();
        if (!data.isApproved) {
            showToast('Please wait for admin approval before listing books', 'error');
            window.location.href = '/become-seller.html';
        }
    } catch (error) {
        showToast('Error checking seller status', 'error');
        window.location.href = '/become-seller.html';
    }
}

document.addEventListener('DOMContentLoaded', checkSellerStatus);
