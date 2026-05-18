/* --- GLOBAL STATE --- */
let SHEETS = [];
let token = localStorage.getItem("g_access_token");

// IMMEDIATE CHECK: If no token or expired, kick to login.php
(function authGuard() {
    const expiry = localStorage.getItem("g_token_expiry");
    if (!token || !expiry || Date.now() > parseInt(expiry)) {
        window.location.href = "index.html";
    }
})();

function clickToggleFunction(){
    sidebar.classList.toggle("collapsed");
        
    const nowHidden = sidebar.classList.contains("collapsed");
    localStorage.setItem("sidebar_hidden", nowHidden);
    
    // Swap the icon
    updateIcon(nowHidden);
}

// Initialize when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // 1. Display User Info from Storage
    
    const savedUser = localStorage.getItem("g_user_data");
    if (savedUser) {
        displayUser(JSON.parse(savedUser));
    }

    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebarToggle");
    const toggleIcon = toggleBtn.querySelector("i"); // Get the icon element

    // Function to update icon based on state
    const updateIcon = (isCollapsed) => {
        if (isCollapsed) {
            // Icon to show when sidebar is HIDDEN
            toggleIcon.classList.remove("bi-layout-sidebar-inset");
            toggleIcon.classList.add("bi-list"); 
        } else {
            // Icon to show when sidebar is VISIBLE
            toggleIcon.classList.remove("bi-list");
            toggleIcon.classList.add("bi-layout-sidebar-inset");
        }
    };

    // 1. Initial Load State
    const isHidden = localStorage.getItem("sidebar_hidden") === "true";
    if (isHidden) {
        sidebar.classList.add("collapsed");
        updateIcon(true);
    }

    // 2. Click Event
    if (toggleBtn) {
        toggleBtn.addEventListener("click", function() {
            clickToggleFunction();
        });
    }

  

    // 2. Start loading data
    startApp();
    loadDocument()
});

/**
 * Startup Sequence
 */
async function startApp() {
    await loadDocument();
    await fetchSheetIds(); // Get IDs from your PHP/MySQL
    await loadSheets();    // Sync those IDs with Google API
    
}


async function loadDocument(){
    // 1. Get the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const targetLink = urlParams.get('link');

    if (targetLink) {
        const frame = document.getElementById("frame");
        const titleHeader = document.getElementById("title");

        // 2. Load the link into the iframe
        if (frame) {
            frame.src = targetLink;
        }

        // 3. Optional: Set a placeholder title until the list loads
        if (titleHeader) {
            titleHeader.innerText = "Loading Document...";
        }
        
        // Clean up the URL in the address bar (optional, keeps it tidy)
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Fetches sheet IDs from your backend
 */
/**
 * Fetches sheet IDs from your backend
 */
async function fetchSheetIds() {
    const menu = document.getElementById("menu");
    menu.innerHTML = `<div class="p-3 text-muted small"><div class="spinner-border spinner-border-sm me-2"></div>Connecting to database...</div>`;
    
    // Get the user data to extract the email
    const savedUser = JSON.parse(localStorage.getItem("g_user_data"));
    const email = savedUser ? savedUser.email : '';

    try {
        // Pass the email in the query string
        const response = await fetch(`api/fetch_full_docs.php?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        SHEETS = Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Database Error:", e);
        menu.innerHTML = `<div class="p-3 text-danger small">Database connection failed.</div>`;
    }
}

/**
 * Loops through IDs and creates UI cards
 */
// async function loadSheets() {
//     const desktopMenu = document.getElementById("menu");
//     const mobileMenuBody = document.getElementById("mobileMenuBody");
    
//     desktopMenu.innerHTML = "";
//     mobileMenuBody.innerHTML = "";

//     if (SHEETS.length === 0) {
//         const emptyMsg = `<div class="p-3 text-muted small">No documents found.</div>`;
//         desktopMenu.innerHTML = emptyMsg;
//         mobileMenuBody.innerHTML = emptyMsg;
//         return;
//     }

//     // Loop through the objects from your API response
//     for (const doc of SHEETS) {
//         const id = doc.google_sheet_id; // Matches your JSON key
//         const dbName = doc.display_name; // Matches your JSON key

//         try {
//             // Fetch live metadata from Google
//             const [driveData, sheetData] = await Promise.all([
//                 getDrive(id),
//                 getSheet(id)
//             ]);

//             const data = {
//                 id: id,
//                 // Use the database name first, fallback to Google title if DB name is missing
//                 title: dbName || sheetData?.properties?.title || driveData?.name || "Untitled Sheet",
//                 owner: driveData.owners?.[0]?.displayName || "Private Owner",
//                 last: driveData.lastModifyingUser?.displayName || "External User",
//                 updated: format(driveData?.modifiedTime),
//                 url: `https://docs.google.com/spreadsheets/d/${id}/edit`
//             };

//             const createCard = () => {
//                 const card = document.createElement("div");
//                 card.className = "card-sheet mb-3 shadow-sm";
//                 card.setAttribute("data-id", data.id);
                
//                 card.innerHTML = `
//                     <div class="fw-bold text-dark mb-2" style="font-size: 0.95rem;">
//                         <i class="bi bi-file-earmark-spreadsheet text-success me-1"></i> ${data.title}
//                     </div>
//                     <div class="meta-container border-top pt-2 mt-2">
//                         <div class="text-muted mb-1" style="font-size: 11px;">
//                             <span class="fw-bold text-uppercase" style="font-size: 10px;">Owner:</span> ${data.owner}
//                         </div>
//                         <div class="text-muted mb-1" style="font-size: 11px;">
//                             <span class="fw-bold text-uppercase" style="font-size: 10px;">Last Editor:</span> ${data.last}
//                         </div>
//                         <div class="text-muted" style="font-size: 11px;">
//                             <span class="fw-bold text-uppercase" style="font-size: 10px;">Updated:</span> ${data.updated}
//                         </div>
//                     </div>
//                 `;

//                 card.onclick = () => selectSheet(data);
//                 return card;
//             };

//             desktopMenu.appendChild(createCard());
//             mobileMenuBody.appendChild(createCard());

//         } catch (err) {
//             console.error(`Error loading sheet ${id}:`, err);
//         }
//     }
// }

// async function loadSheets() {
//     const desktopMenu = document.getElementById("menu");
//     const mobileMenuBody = document.getElementById("mobileMenuBody");
    
//     desktopMenu.innerHTML = "";
//     mobileMenuBody.innerHTML = "";

//     if (SHEETS.length === 0) {
//         const msg = `<div class="p-3 text-muted small">No documents assigned.</div>`;
//         desktopMenu.innerHTML = msg;
//         mobileMenuBody.innerHTML = msg;
//         return;
//     }

//     // 1. ORGANIZE DATA: Group by Folder ID or Root
//     const folders = {};
//     const rootDocs = [];

//     SHEETS.forEach(item => {
//         if (item.folder_id && item.folder_name) {
//             if (!folders[item.folder_id]) {
//                 folders[item.folder_id] = {
//                     name: item.folder_name,
//                     docs: []
//                 };
//             }
//             folders[item.folder_id].docs.push(item);
//         } else {
//             rootDocs.push(item);
//         }
//     });

//     // 2. RENDER FOLDERS FIRST
//     for (const fId in folders) {
//         const folder = folders[fId];
//         const folderWrapper = document.createElement("div");
//         folderWrapper.className = "mb-3";
        
//         folderWrapper.innerHTML = `
//             <div class="folder-header d-flex align-items-center p-2 mb-2 text-muted fw-bold" 
//                  style="cursor: pointer; font-size: 11px; background: #f8f9fa; border-radius: 8px; border: 1px solid #eee;"
//                  onclick="this.nextElementSibling.classList.toggle('d-none')">
//                 <i class="bi bi-folder2-open me-2 text-warning"></i>
//                 <span class="flex-grow-1 text-uppercase" style="letter-spacing: 0.5px;">${folder.name}</span>
//                 <i class="bi bi-chevron-down small opacity-50"></i>
//             </div>
//             <div class="folder-content ps-3 border-start ms-2"></div>
//         `;

//         const contentArea = folderWrapper.querySelector(".folder-content");
        
//         for (const doc of folder.docs) {
//             const card = await createDocumentCard(doc);
//             contentArea.appendChild(card);
//         }
        
//         desktopMenu.appendChild(folderWrapper);
//     }

//     // 3. RENDER ROOT DOCUMENTS (No Folder)
//     if (rootDocs.length > 0) {
//         // Optional: Header for ungrouped files
//         const rootHeader = document.createElement("div");
//         rootHeader.className = "text-muted fw-bold mt-4 mb-2 ps-1";
//         rootHeader.style.fontSize = "10px";
//         rootHeader.innerText = "UNGROUPED DOCUMENTS";
//         desktopMenu.appendChild(rootHeader);

//         for (const doc of rootDocs) {
//             const card = await createDocumentCard(doc);
//             desktopMenu.appendChild(card);
//         }
//     }
// }

// REAL-TIME SEARCH: Triggered on every keystroke
let currentSearchId = 0; // Tracks the latest search instance to stop older async runs
let searchDebounceTimeout = null;

// Real-time Input Listener with a 200ms Debounce to prevent lag/doubling
document.getElementById("sidebarSearch")?.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Clear previous typing timer
    clearTimeout(searchDebounceTimeout);
    
    const desktopMenu = document.getElementById("menu");
    const mobileMenuBody = document.getElementById("mobileMenuBody");

    // SHOW LOADING IMMEDIATELY: Inject a clean Bootstrap spinner
    const loadingHtml = `
        <div class="d-flex flex-column align-items-center justify-content-center p-5 text-muted">
            <div class="spinner-border text-teal small mb-2" role="status" style="width: 1.5rem; height: 1.5rem;"></div>
            <span style="font-size: 11px; letter-spacing: 0.5px;">Searching...</span>
        </div>
    `;
    if (desktopMenu) desktopMenu.innerHTML = loadingHtml;
    if (mobileMenuBody) mobileMenuBody.innerHTML = loadingHtml;
    
    // Wait until user pauses typing for 200ms before running the search layout build
    searchDebounceTimeout = setTimeout(() => {
        loadSheets(searchTerm);
    }, 200);
});

// Block "Enter" key default behavior to prevent accidental duplicate triggers
document.getElementById("sidebarSearch")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
    }
});

async function loadSheets(filterText = "") {
    // 1. Generate a unique ID for this execution run
    const thisSearchId = ++currentSearchId;
    
    const desktopMenu = document.getElementById("menu");
    const mobileMenuBody = document.getElementById("mobileMenuBody");

    if (!SHEETS || SHEETS.length === 0) {
        const noDataMsg = `<div class="p-3 text-muted small text-center">No documents found.</div>`;
        if (desktopMenu) desktopMenu.innerHTML = noDataMsg;
        if (mobileMenuBody) mobileMenuBody.innerHTML = noDataMsg;
        return;
    }

    // Organize array structures
    const folders = {};
    const rootDocs = [];

    SHEETS.forEach(item => {
        if (item.folder_id && item.folder_name) {
            if (!folders[item.folder_id]) {
                folders[item.folder_id] = { name: item.folder_name, docs: [] };
            }
            folders[item.folder_id].docs.push(item);
        } else {
            rootDocs.push(item);
        }
    });

    // Use a Document Fragment to build elements in memory instead of direct DOM painting
    const desktopFragment = document.createDocumentFragment();

    // 2. Render Folders (Searchable)
    for (const fId in folders) {
        // RACE CONDITION CHECK: If a newer search stream has taken over, ABORT this execution immediately!
        if (thisSearchId !== currentSearchId) return;

        const folder = folders[fId];
        const folderNameLower = folder.name.toLowerCase();
        
        // Check if files inside match
        const matchingDocs = folder.docs.filter(doc => {
            const name = (doc.display_name || "").toLowerCase();
            return name.includes(filterText);
        });

        // Strict Filter: Only proceed if Folder Name matches OR Files inside match
        const folderMatches = folderNameLower.includes(filterText);
        
        if (filterText === "" || folderMatches || matchingDocs.length > 0) {
            const folderWrapper = document.createElement("div");
            folderWrapper.className = "mb-3 folder-group";
            
            // Auto-expand only if searching
            const isExpanded = filterText.length > 0;
            const contentClass = isExpanded ? "" : "d-none";

            folderWrapper.innerHTML = `
                <div class="folder-header d-flex align-items-center p-2 mb-2 text-muted fw-bold" 
                    style="cursor: pointer; font-size: 11px; background: #f8f9fa; border-radius: 8px; border: 1px solid #eee;"
                    onclick="toggleFolder(this)">
                    <i class="bi bi-folder2-open me-2 text-warning"></i>
                    <span class="flex-grow-1 text-uppercase">${folder.name}</span>
                    <i class="bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} small opacity-50"></i>
                </div>
                <div class="folder-content ps-3 border-start ms-2 ${contentClass}"></div>
            `;

            const contentArea = folderWrapper.querySelector(".folder-content");
            
            // If searching and folder name matched, show all its files.
            // If searching and only specific files matched, show only those.
            const docsToShow = (filterText !== "" && folderMatches) ? folder.docs : matchingDocs;
            const finalDocs = (filterText === "") ? folder.docs : docsToShow;

            for (const doc of finalDocs) {
                // Check token again inside async card builder loops
                if (thisSearchId !== currentSearchId) return;

                const card = await createDocumentCard(doc);
                contentArea.appendChild(card);
            }
            
            desktopFragment.appendChild(folderWrapper);
        }
    }

    // 3. Render Root Documents (Searchable)
    const matchingRootDocs = rootDocs.filter(doc => {
        const name = (doc.display_name || "").toLowerCase();
        return name.includes(filterText);
    });

    if (matchingRootDocs.length > 0) {
        if (thisSearchId !== currentSearchId) return;

        if (!filterText) {
            const rootHeader = document.createElement("div");
            rootHeader.className = "text-muted fw-bold mt-4 mb-2 ps-1 small";
            rootHeader.innerText = "UNGROUPED";
            desktopFragment.appendChild(rootHeader);
        }

        for (const doc of matchingRootDocs) {
            if (thisSearchId !== currentSearchId) return;

            const card = await createDocumentCard(doc);
            desktopFragment.appendChild(card);
        }
    }

    // 4. ATOMIC RENDERING: If no new search took over, clear loading spinner and append fragments
    if (thisSearchId === currentSearchId) {
        if (desktopMenu) {
            desktopMenu.innerHTML = ""; // Removes the spinner completely
            
            // If no elements matched our filters at all, show empty message
            if (desktopFragment.children.length === 0) {
                desktopMenu.innerHTML = `<div class="p-3 text-muted small text-center">No documents found.</div>`;
            } else {
                desktopMenu.appendChild(desktopFragment);
            }
            
            // Sync finalized markup to mobile securely
            if (mobileMenuBody) {
                mobileMenuBody.innerHTML = desktopMenu.innerHTML;
            }
        }
    }
}

// Global Folder toggle handler
function toggleFolder(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector(".bi-chevron-down, .bi-chevron-up");
    if (content) content.classList.toggle("d-none");
    if (icon) {
        icon.classList.toggle("bi-chevron-down");
        icon.classList.toggle("bi-chevron-up");
    }
}

// Global Folder toggle handler
function toggleFolder(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector(".bi-chevron-down, .bi-chevron-up");
    if (content) content.classList.toggle("d-none");
    if (icon) {
        icon.classList.toggle("bi-chevron-down");
        icon.classList.toggle("bi-chevron-up");
    }
}

// Global toggle function
function toggleFolder(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector(".bi-chevron-down, .bi-chevron-up");
    content.classList.toggle("d-none");
    if (icon) {
        icon.classList.toggle("bi-chevron-down");
        icon.classList.toggle("bi-chevron-up");
    }
}

/**
 * Creates the Document Card (With Preserved Metadata)
 */
async function createDocumentCard(doc) {
    const id = doc.google_sheet_id;
    const dbName = doc.display_name;

    try {
        const [driveData, sheetData] = await Promise.all([
            getDrive(id),
            getSheet(id)
        ]);

        const data = {
            id: id,
            title: dbName || sheetData?.properties?.title || driveData?.name || "Untitled Sheet",
            owner: driveData.owners?.[0]?.displayName || "Private Owner",
            last: driveData.lastModifyingUser?.displayName || "External User",
            updated: format(driveData?.modifiedTime),
            url: `https://docs.google.com/spreadsheets/d/${id}/edit`
        };

        const card = document.createElement("div");
        card.className = "card-sheet mb-3 shadow-sm";
        card.setAttribute("data-id", data.id);
        
        // YOUR EXACT HTML STRUCTURE PRESERVED
        card.innerHTML = `
            <div class="fw-bold text-dark mb-2" style="font-size: 0.95rem;">
                <i class="bi bi-file-earmark-spreadsheet text-success me-1"></i> ${data.title}
            </div>
            <div class="meta-container border-top pt-2 mt-2">
                <div class="text-muted mb-1" style="font-size: 11px;">
                    <span class="fw-bold text-uppercase" style="font-size: 10px;">Owner:</span> ${data.owner}
                </div>
                <div class="text-muted mb-1" style="font-size: 11px;">
                    <span class="fw-bold text-uppercase" style="font-size: 10px;">Last Editor:</span> ${data.last}
                </div>
                <div class="text-muted" style="font-size: 11px;">
                    <span class="fw-bold text-uppercase" style="font-size: 10px;">Updated:</span> ${data.updated}
                </div>
            </div>
        `;

        // card.onclick = () => selectSheet(data);
        card.onclick = (e) => {
            e.preventDefault();
            promptOpeningMode(data);
        };
        return card;
    } catch (err) {
        console.error(`Error building card for ${id}:`, err);
        const errorCard = document.createElement("div");
        errorCard.className = "p-2 small text-danger";
        errorCard.innerText = `Error loading: ${dbName}`;
        return errorCard;
    }
}

async function getScreens() {
    try {
        if ('getScreenDetails' in window) {
            const screenDetails = await window.getScreenDetails();
            return screenDetails.screens; // Returns an array of available monitors
        } else {
            console.error("Window Management API not supported.");
            return [];
        }
    } catch (err) {
        console.error("Permission denied or error:", err);
        return [];
    }
}

async function promptOpeningMode(data) {
    const { value: mode } = await Swal.fire({
        title: 'Open Document',
        text: `How would you like to view "${data.title}"?`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '<i class="bi bi-window-sidebar"></i> Dashboard',
        denyButtonText: '<i class="bi bi-box-arrow-up-right"></i> New Tab',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0aa5a5',
        denyButtonColor: '#1e293b',
    });

    if (mode === true) {
        // User clicked "Dashboard" (Confirmed)
        openInDashboard(data);

    } else if (mode === false) {
        // User clicked "New Tab" (Denied/Deny Button)
        handleMultiMonitorOpen(data);
    }
}

async function handleMultiMonitorOpen(data) {
    try {
        // 1. Check for API support and get screens
        if (!('getScreenDetails' in window)) {
            // Fallback for browsers that don't support multi-screen API
            window.open(`dashboard.html?link=${encodeURIComponent(data.url)}`, '_blank');
            return;
        }

        const screenDetails = await window.getScreenDetails();
        const screens = screenDetails.screens;

        // 2. If only one monitor, just open it normally
        if (screens.length <= 1) {
            window.open(`dashboard.html?link=${encodeURIComponent(data.url)}`, '_blank');
            return;
        }

        // 3. Build monitor selection list
        const monitorOptions = {};
        screens.forEach((screen, index) => {
            const isPrimary = screen.isPrimary ? " (Primary)" : "";
            monitorOptions[index] = `Monitor ${index + 1}${isPrimary} - ${screen.width}x${screen.height}`;
        });

        // 4. Prompt user to select a monitor
        const { value: screenIndex } = await Swal.fire({
            title: 'Select Target Monitor',
            text: 'Which screen should the new tab open on?',
            input: 'select',
            inputOptions: monitorOptions,
            showCancelButton: true,
            confirmButtonText: 'Launch',
            confirmButtonColor: '#0aa5a5'
        });

        if (screenIndex !== undefined) {
            const target = screens[screenIndex];
            const encodedLink = encodeURIComponent(data.url);
            
            // 5. Open window at specific coordinates of the selected monitor
            const features = `
                left=${target.availLeft},
                top=${target.availTop},
                width=${target.availWidth},
                height=${target.availHeight},
                menubar=yes,
                toolbar=yes,
                location=yes
            `;

            window.open(`dashboard.html?link=${encodedLink}`, '_blank', features);
        }

    } catch (err) {
        console.error("Monitor detection failed:", err);
        // Fallback: Open in a standard new tab if user denies permission
        window.open(`dashboard.html?link=${encodeURIComponent(data.url)}`, '_blank');
    }
}

// Helper function to handle the iframe logic
function openInDashboard(data) {
    const frame = document.getElementById("frame");
    const titleHeader = document.getElementById("title");
    
    // 1. Create and show the iframe loading spinner
    showIframeLoader();
    
    if (frame) {
        // 2. Attach a one-time event listener that hides the loader when the iframe finishes loading
        frame.onload = function() {
            hideIframeLoader();
        };
        
        // 3. Set the source to start loading the document
        frame.src = data.url;
    }
    
    if (titleHeader) titleHeader.innerText = data.title;

    // Highlight active card
    document.querySelectorAll(".card-sheet").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(`[data-id="${data.id}"]`).forEach(c => c.classList.add("active"));

    // Close Mobile Menu if using Offcanvas
    const mobileMenuEl = document.getElementById('mobileMenu');
    if (mobileMenuEl) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(mobileMenuEl);
        if (bsOffcanvas) bsOffcanvas.hide();
    }
    
    if (typeof clickToggleFunction === "function") {
        clickToggleFunction();
    }
}

// Helper to create and inject the loader overlay dynamically
function showIframeLoader() {
    // Check if a loader overlay already exists; if not, create it
    let loader = document.getElementById("iframeLoader");
    
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "iframeLoader";
        loader.className = "d-flex flex-column align-items-center justify-content-center bg-white position-absolute";
        loader.style.inset = "70px 0 0 0"; // Adjust '70px' to match your exact topbar height
        loader.style.zIndex = "99";
        loader.style.transition = "opacity 0.2s ease";
        
        loader.innerHTML = `
            <div class="spinner-border text-teal mb-3" role="status" style="width: 2.5rem; height: 2.5rem;"></div>
            <h6 class="text-muted fw-medium small text-uppercase" style="letter-spacing: 1px;">Loading Document...</h6>
        `;
        
        // Append it inside the main-content container right above or below the iframe
        const mainContent = document.getElementById("main-content") || document.querySelector(".main-content");
        if (mainContent) {
            mainContent.appendChild(loader);
        }
    }
    
    // Reset opacity and block interactions
    loader.style.opacity = "1";
    loader.style.pointerEvents = "all";
}

// Helper to fade out and hide the loader overlay
function hideIframeLoader() {
    const loader = document.getElementById("iframeLoader");
    if (loader) {
        loader.style.opacity = "0";
        loader.style.pointerEvents = "none";
        
        // Optional: Remove it from the DOM completely after the fade transition ends
        setTimeout(() => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 200);
    }
}


/**
 * Handles the selection of a sheet
 */
function selectSheet(data, event = null) {
    const frame = document.getElementById("frame");
    const titleHeader = document.getElementById("title");
    
    // 1. Determine if we should open in a new tab
    // Option A: Check if a toggle/checkbox is checked
    const openInNewTab = document.getElementById("tabModeToggle")?.checked;
    
    // Option B: Also open in new tab if user holds Ctrl (Windows) or Cmd (Mac)
    const isModifierPressed = event && (event.ctrlKey || event.metaKey);

    if (openInNewTab || isModifierPressed) {
        window.open(data.url, '_blank');
    }

    // 2. Always update the Iframe and Header regardless
    if (frame) frame.src = data.url;
    if (titleHeader) titleHeader.innerText = data.title;

    // Highlight active card
    document.querySelectorAll(".card-sheet").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(`[data-id="${data.id}"]`).forEach(c => c.classList.add("active"));

    // Close Mobile Menu
    const mobileMenuEl = document.getElementById('mobileMenu');
    if (mobileMenuEl) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(mobileMenuEl);
        if (bsOffcanvas) bsOffcanvas.hide();
    }
}

/* --- API HELPERS --- */

async function getDrive(id) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,owners(displayName,emailAddress),lastModifyingUser(displayName,emailAddress),createdTime,modifiedTime&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) logout(); // Automatic logout if token is rejected
    return await res.json();
}

async function getSheet(id) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
}

function displayUser(data) {
    const container = document.getElementById("userInfo");
    if (container) {
        container.style.setProperty("display", "flex", "important");
        document.getElementById("userName").innerText = data.name;
        document.getElementById("userEmail").innerText = data.email;
        document.getElementById("userImg").src = data.picture;
    }
}

function format(d) {
    if (!d) return "Unknown";
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}