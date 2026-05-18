// REDIRECT IF VALID SESSION EXISTS
(function checkSession() {
    const token = localStorage.getItem("g_access_token");
    const expiry = localStorage.getItem("g_token_expiry");

    if (token && expiry && Date.now() < parseInt(expiry)) {
        window.location.href = "dashboard.html";
    }
})();

function login() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (res) => {
            if (res.access_token) {
                // Store Token and Expiry
                localStorage.setItem("g_access_token", res.access_token);
                const expiryTime = Date.now() + (parseInt(res.expires_in) * 1000);
                localStorage.setItem("g_token_expiry", expiryTime);
                
                // Fetch User Profile
                const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${res.access_token}` }
                });
                const userData = await userRes.json();
                localStorage.setItem("g_user_data", JSON.stringify(userData));

                window.location.href = "dashboard.html";
            }
        }
    });
    tokenClient.requestAccessToken();
}