let userData = JSON.parse(localStorage.getItem("g_user_data"));
// Change this line
let docModal = new bootstrap.Modal(document.getElementById('docModal'), {
    focus: false // Prevents the modal from fighting the Picker for focus
});
let accessToken = null;
let pickerInited = false;

// 1. INITIALIZATION
async function initManagement() {
    try {
        const [folderRes, docRes] = await Promise.all([
            fetch(`api/fetch_folders.php?email=${encodeURIComponent(userData.email)}`),
            fetch(`api/fetch_full_docs.php?email=${encodeURIComponent(userData.email)}`)
        ]);

        const folders = await folderRes.json();
        const docs = await docRes.json();
        renderManagement(folders, docs);
    } catch (err) {
        console.error("Init Error:", err);
    }
}

// 2. RENDER LOGIC
function renderManagement(folders, docs) {
    const folderList = document.getElementById("folderList");
    const adminList = document.getElementById("adminUngroupedList");
    const userList = document.getElementById("userUngroupedList");
    
    folderList.innerHTML = "";
    adminList.innerHTML = "";
    userList.innerHTML = "";

    const foldersMap = {};
    folders.forEach(f => { 
        foldersMap[f.id] = { name: f.folder_name, docs: [] }; 
    });

    // 1. Identify all Admin Sheet IDs first
    const adminSheetIds = new Set(
        docs.filter(d => d.source === 'admin').map(d => d.google_sheet_id)
    );

    const adminUngrouped = [];
    const userUngrouped = [];

    docs.forEach(d => {
        // 2. DEDUPLICATION LOGIC:
        // If this is a user-added doc, but the ID is already in the admin list, SKIP IT.
        if (d.source === 'user' && adminSheetIds.has(d.google_sheet_id)) {
            return; // Exit this loop iteration (effectively hiding the duplicate)
        }

        if (d.folder_id && foldersMap[d.folder_id]) {
            foldersMap[d.folder_id].docs.push(d);
        } else {
            if (d.source === 'admin') {
                adminUngrouped.push(d);
            } else {
                userUngrouped.push(d);
            }
        }
    });

    // --- Render logic remains the same ---
    Object.keys(foldersMap).forEach(fId => {
        const folder = foldersMap[fId];
        folderList.innerHTML += `
            <div class="folder-container p-3 mb-3" data-folder-id="${fId}">
                <div class="fw-bold mb-2 text-primary">
                    <i class="bi bi-folder2"></i> ${folder.name}
                </div>
                <div class="drag-area" data-folder-id="${fId}">
                    ${folder.docs.map(d => renderDragItem(d)).join('')}
                </div>
            </div>`;
    });

    adminList.innerHTML = adminUngrouped.map(d => renderDragItem(d)).join('');
    userList.innerHTML = userUngrouped.map(d => renderDragItem(d)).join('');

    document.querySelectorAll('.drag-area').forEach(el => {
        new Sortable(el, { group: 'shared', animation: 150, ghostClass: 'sortable-ghost' });
    });
}

function renderDragItem(d) {
    // Only show delete button for user-added docs
    const deleteBtn = d.source === 'user' 
        ? `<button class="btn btn-link btn-sm text-danger p-0 ms-2 delete-doc-btn" data-id="${d.id}" title="Delete">
            <i class="bi bi-trash"></i>
           </button>` 
        : '';

    return `
        <div class="drag-item d-flex justify-content-between align-items-center bg-white border rounded p-2 mb-2" 
             data-gsid="${d.google_sheet_id}" 
             data-name="${d.display_name}" 
             data-source="${d.source || 'user'}">
            <div class="d-flex align-items-center text-truncate">
                <i class="bi bi-grip-vertical me-2 text-muted"></i>
                <span class="text-truncate">${d.display_name}</span>
            </div>
            ${deleteBtn}
        </div>`;
}

// 3. ACTIONS & SAVING
async function saveChanges() {
    const updates = [];
    const saveBtn = document.querySelector('button[onclick="saveChanges()"]');
    saveBtn.disabled = true;

    document.querySelectorAll('.drag-area').forEach(area => {
        const folderId = area.getAttribute('data-folder-id') || null;
        const areaSource = area.getAttribute('data-source');

        area.querySelectorAll('.drag-item').forEach(item => {
            updates.push({
                display_name: item.getAttribute('data-name'), 
                google_sheet_id: item.getAttribute('data-gsid'),
                folder_id: folderId,
                source: folderId ? item.getAttribute('data-source') : areaSource 
            });
        });
    });

    try {
        await fetch('api/update_folders.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates, email: userData.email })
        });
        Swal.fire({ icon: 'success', title: 'Saved!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        initManagement();
    } catch (err) {
        Swal.fire('Error', 'Failed to save', 'error');
    } finally {
        saveBtn.disabled = false;
    }
}

function addCustomSheet() {
    $('#docForm')[0].reset();
    $('#formUserEmail').val(userData.email); 
    docModal.show();
}

function goBackToDashboard() {
    // If you are using single-page-app view toggling:
    // document.getElementById('managementView').classList.add('d-none');
    // document.getElementById('mainDashboardView').classList.remove('d-none');
    
    // Or if this is a standard browser page redirect:
    window.location.href = "dashboard.html";
}

$('#docForm').on('submit', function(e) {
    e.preventDefault();
    
    // Show loading state
    Swal.fire({ 
        title: 'Linking...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
    });

    $.ajax({
        url: 'api/add_doc.php',
        type: 'POST',
        data: JSON.stringify({
            name: $('#name').val(),
            sheet_id: $('#sheet_id').val(),
            email: $('#formUserEmail').val()
        }),
        contentType: 'application/json',
        success: (res) => {
            // res is the JSON object returned from PHP
            if (res.success) {
                // Case: Document actually added
                docModal.hide();
                Swal.fire('Success', res.message, 'success');
                initManagement();
            } else {
                // Case: PHP caught a duplicate (Admin or User)
                // res.message will contain the specific error from PHP
                Swal.fire('Notice', res.message, 'info');
            }
        },
        error: () => {
            // Case: Server crash or network error
            Swal.fire('Error', 'Could not connect to the server.', 'error');
        }
    });
});

$(document).on('click', '.delete-doc-btn', function(e) {
    e.preventDefault();
    const docId = $(this).data('id');

    Swal.fire({
        title: 'Remove Document?',
        text: "You can re-link this document later if needed.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6e7881',
        confirmButtonText: 'Yes, remove it'
    }).then((result) => {
        if (result.isConfirmed) {
            // Show loading state while processing
            Swal.fire({
                title: 'Removing...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: 'api/delete_doc.php',
                type: 'POST',
                data: JSON.stringify({ id: docId }),
                contentType: 'application/json',
                success: (res) => {
                    if (res.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Removed!',
                            text: 'The document has been removed from your list.',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        initManagement(); // Refresh the UI
                    } else {
                        Swal.fire('Error', res.message, 'error');
                    }
                }
            });
        }
    });
});

// 4. GOOGLE PICKER LOGIC
function onGapiLoad() { gapi.load('picker', () => pickerInited = true); }
function onGisLoad() { /* GIS ready */ }
function openPicker() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            if (response.access_token) {
                accessToken = response.access_token;
                localStorage.setItem("g_access_token", accessToken);
                
                // Add a tiny delay to ensure the Auth popup has fully 
                // closed before the Picker tries to render over the modal
                setTimeout(createPicker, 100);
            }
        },
    });

    // Changed 'none' to empty string to allow interaction if needed
    tokenClient.requestAccessToken({ prompt: '' }); 
}

function createPicker() {
    if (pickerInited && accessToken) {
        // Build the picker
        const view = new google.picker.View(google.picker.ViewId.SPREADSHEETS);
        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setDeveloperKey(API_KEY)
            .setCallback(pickerCallback)
            // Use location.origin for better compatibility
            .setOrigin(window.location.origin) 
            .build();
            
        picker.setVisible(true);

        // EXTRA FIX: Find the picker element and move it if it's trapped
        // Google usually appends it to the body, but sometimes it gets stuck
    } else {
        console.error("Picker not initialized or token missing");
    }
}
function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        $('#sheet_id').val(doc.id);
        if (!$('#name').val()) $('#name').val(doc.name);
        
        // Optional: Close modal or give feedback
        console.log("File Selected: " + doc.name);
    }
}

async function createNewFolder() {
    const { value: name } = await Swal.fire({ title: 'New Folder', input: 'text', inputPlaceholder: 'Folder Name' });
    if (!name) return;
    await fetch('api/create_folder.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: userData.email })
    });
    initManagement();
}



initManagement();