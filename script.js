// Client-side JavaScript for login functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded successfully');
    
    // Function to handle Zoho OAuth login using direct redirect
    function loginWithZoho() {
        console.log('Initiating Zoho OAuth login...');
        console.log('Redirecting to /authredirction...');
        
        // Direct redirect to the authredirction endpoint
        // The server will handle the redirect to Zoho OAuth
        window.location.href = '/authredirction';
    }
    
    // Function to handle direct redirect (alternative approach)
    function redirectToZoho() {
        console.log('Redirecting to Zoho OAuth...');
        window.location.href = '/authredirction';
    }
    
    // Function to show status messages
    function showStatus(message, type = 'success') {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
            statusDiv.style.display = 'block';
            
            // Hide status after 5 seconds
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    // Add event listeners when DOM is loaded
    const loginButton = document.getElementById('zoho-login-btn');
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Zoho login button clicked');
            
            // Show loading state
            loginButton.disabled = true;
            loginButton.textContent = 'Redirecting...';
            
            // Direct redirect to OAuth
            loginWithZoho();
        });
    }
    
    // Alternative: Direct redirect approach
    const directLoginButton = document.getElementById('direct-login-btn');
    if (directLoginButton) {
        directLoginButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Direct login button clicked');
            redirectToZoho();
        });
    }
    
    // Log when the page is fully loaded
    console.log('All event listeners attached successfully');
});
