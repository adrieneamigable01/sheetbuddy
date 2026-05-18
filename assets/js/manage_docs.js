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
    
    if (folderList) folderList.innerHTML = "";
    if (adminList) adminList.innerHTML = "";
    if (userList) userList.innerHTML = "";

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
        if (d.source === 'user' && adminSheetIds.has(d.google_sheet_id)) {
            return; 
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

    // 3. Render logic with Folder Editing Enabled
    Object.keys(foldersMap).forEach(fId => {
        const folder = foldersMap[fId];
        
        const folderContainer = document.createElement("div");
        folderContainer.className = "folder-container p-3 mb-3";
        folderContainer.setAttribute("data-folder-id", fId);

        folderContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <!-- Editable Header Area -->
                <div class="folder-title-wrapper d-flex align-items-center fw-bold text-primary flex-grow-1">
                    <i class="bi bi-folder2 me-2"></i> 
                    <span class="folder-name-text" style="font-size: 14px;">${folder.name}</span>
                    <input type="text" class="form-index form-control form-control-sm d-none ms-1 folder-edit-input" 
                           value="${folder.name}" style="max-width: 200px; font-weight: 600;">
                </div>
                
                <!-- Action Controls -->
                <div class="folder-actions d-flex gap-1">
                    <button class="btn btn-link link-secondary btn-sm p-1 edit-folder-btn" onclick="toggleFolderEdit('${fId}')" title="Rename Folder">
                        <i class="bi bi-pencil-square fs-6"></i>
                    </button>
                    <button class="btn btn-link link-success btn-sm p-1 save-folder-btn d-none" onclick="saveFolderRename('${fId}')" title="Save Changes">
                        <i class="bi bi-check-circle-fill fs-6"></i>
                    </button>
                </div>
            </div>
            
            <div class="drag-area" data-folder-id="${fId}">
                ${folder.docs.map(d => renderDragItem(d)).join('')}
            </div>
        `;
        
        if (folderList) folderList.appendChild(folderContainer);
    });

    if (adminList) adminList.innerHTML = adminUngrouped.map(d => renderDragItem(d)).join('');
    if (userList) userList.innerHTML = userUngrouped.map(d => renderDragItem(d)).join('');

    document.querySelectorAll('.drag-area').forEach(el => {
        new Sortable(el, { group: 'shared', animation: 150, ghostClass: 'sortable-ghost' });
    });
}

// Switches visibility states seamlessly between display name text and the editing input field
function toggleFolderEdit(folderId) {
    const container = document.querySelector(`[data-folder-id="${folderId}"]`);
    if (!container) return;

    const nameText = container.querySelector(".folder-name-text");
    const editInput = container.querySelector(".folder-edit-input");
    const editBtn = container.querySelector(".edit-folder-btn");
    const saveBtn = container.querySelector(".save-folder-btn");

    nameText.classList.toggle("d-none");
    editInput.classList.toggle("d-none");
    editBtn.classList.toggle("d-none");
    saveBtn.classList.toggle("d-none");

    if (!editInput.classList.contains("d-none")) {
        editInput.focus();
        editInput.select();
        
        // Listen for Enter keypress directly inside the text input box
        editInput.onkeydown = function(e) {
            if (e.key === "Enter") saveFolderRename(folderId);
            if (e.key === "Escape") toggleFolderEdit(folderId); // Revert on Esc
        };
    }
}

// Commits the modified validation strings to local states and triggers database saves
// RENAME FOLDER - DATABASE SYNCED
function saveFolderRename(folderId) {
    const container = document.querySelector(`[data-folder-id="${folderId}"]`);
    if (!container) return;

    const editInput = container.querySelector(".folder-edit-input");
    const newName = editInput.value.trim();

    if (!newName) {
        Swal.fire('Error', 'Folder name cannot be left blank.', 'error');
        return;
    }

    $.ajax({
        url: 'api/update_folder_data.php', // Match your exact routing path
        method: 'POST',
        data: {
            id: folderId,
            folder_name: newName,
            email: userData.email
        },
        dataType: 'json',
        success: function(response) {
            // Evaluates success boolean sent back by the server instance
            if (response.success) {
                const nameText = container.querySelector(".folder-name-text");
                nameText.innerText = newName;
                toggleFolderEdit(folderId);

                // Dynamically uses response message string from database array logic
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: response.message || 'Folder renamed successfully!',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                // If backend validation fails, displays the explicit error from PHP
                Swal.fire('Database Error', response.message || 'Failed to update folder.', 'error');
            }
        },
        error: function(xhr, status, error) {
            Swal.fire('Server Connection Error', 'Could not reach database endpoint context.', 'error');
        }
    });
}

// DRAG AND DROP REARRANGEMENT - DATABASE SYNCED
function saveDocumentLocation(documentId, folderId) {
    $.ajax({
        url: 'update_folder', // Match your exact routing path
        method: 'POST',
        data: {
            id: documentId,
            folder_id: folderId
        },
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: response.message || 'Placement updated!',
                    showConfirmButton: false,
                    timer: 1200
                });
            } else {
                // Displays explicit engine failure reasoning from server records
                Swal.fire('Rearrangement Failed', response.message || 'Database rejected relocation state.', 'error');
                // Re-sync UI state here if needed (e.g., window.location.reload())
            }
        },
        error: function() {
            Swal.fire('Network Interface Error', 'Server failed to save new placement rules.', 'error');
        }
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
    const { value: name } = await Swal.fire({ 
        title: 'New Folder', 
        input: 'text', 
        inputPlaceholder: 'Folder Name',
        showCancelButton: true,
        confirmButtonColor: '#0aa5a5'
    });
    
    // Exit if user cancels or leaves input blank
    if (!name || !name.trim()) return; 

    try {
        const response = await fetch('api/create_folder.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: name.trim(), 
                email: userData.email 
            })
        });

        const result = await response.json();

        if (response.status && result.status == "success") {
            // Display successful database creation toast message
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: result.message || 'Folder created successfully!',
                showConfirmButton: false,
                timer: 1500
            });

            // Refresh layout matrix lists structure
            initManagement();
        } else {
            // Displays specific error messaging sent back from PHP (e.g. Duplicates)
            Swal.fire(
                'Folder Creation Failed', 
                result.error || result.message || 'An error occurred while saving.', 
                'warning'
            );
        }

    } catch (error) {
        Swal.fire(
            'Server Error', 
            'Could not establish a clean data connection stream to the backend API.', 
            'error'
        );
    }
}



initManagement();