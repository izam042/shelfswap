// Enhanced header functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Header.js loaded');
    enhanceUserDropdown();
});

// Function to enhance the user dropdown display
function enhanceUserDropdown() {
    const userDisplay = document.getElementById('userEmail');
    if (!userDisplay) {
        console.log('User display element not found in header');
        return;
    }
    
    // Get user data from local storage
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    console.log('Header user data:', { token: !!token, userName, userEmail });
    
    if (token && (userName || userEmail)) {
        // Add debug info to see if the name is being set correctly
        console.log(`Setting header display name to: ${userName || userEmail}`);
        
        // Force update of the display name in header
        if (userName && userName !== 'Google User') {
            userDisplay.textContent = userName;
            console.log('Using stored name:', userName);
        } else if (userEmail) {
            // Fall back to email username if name is missing or is "Google User"
            const emailUsername = userEmail.split('@')[0];
            const capitalizedUsername = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
            userDisplay.textContent = capitalizedUsername;
            console.log('Using derived name from email:', capitalizedUsername);
            
            // Also update localStorage for future page loads
            localStorage.setItem('userName', capitalizedUsername);
        }
    } else {
        console.log('No user information found in localStorage');
    }
    
    // Additionally, check for current user from auth.js if available
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.name) {
        console.log('Current user from auth.js:', currentUser);
        if (currentUser.name !== 'Google User' && currentUser.name !== userDisplay.textContent) {
            console.log('Updating display name from currentUser:', currentUser.name);
            userDisplay.textContent = currentUser.name;
            localStorage.setItem('userName', currentUser.name);
        }
    }
} 