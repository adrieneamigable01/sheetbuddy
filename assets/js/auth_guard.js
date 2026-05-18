// auth_guard.js
(function authGuard() {
    const token = localStorage.getItem("g_access_token");
    const expiry = localStorage.getItem("g_token_expiry");

    // If no token exists OR the current time is past the expiry time
    if (!token || !expiry || Date.now() > parseInt(expiry)) {
        console.log("Session expired or invalid. Redirecting...");
        
        // Wipe local storage to ensure a clean state
        localStorage.removeItem("g_access_token");
        localStorage.removeItem("g_token_expiry");
        localStorage.removeItem("g_user_data");

        // Force user back to login page
        window.location.href = "login.html";
    }
})();