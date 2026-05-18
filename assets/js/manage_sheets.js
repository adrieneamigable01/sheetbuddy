let table;
let docModal;
let accessToken = null;
let pickerInited = false;
let gisInited = false;

/* --- INITIALIZATION --- */
$(document).ready(function() {
    docModal = new bootstrap.Modal(document.getElementById('docModal'));
    
    table = $('#docsTable').DataTable({
        ajax: { url: 'api/fetch_full_docs.php', dataSrc: '' },
        columns: [
            { data: 'display_name', className: 'align-middle fw-bold' },
            { data: 'google_sheet_id', className: 'align-middle sheet-id-text' },
            { 
                data: null,
                className: 'text-end',
                render: (row) => `
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-action btn-light border" title="Edit" onclick='prepareEdit(${JSON.stringify(row)})'>
                        <i class="bi bi-pencil-square text-primary"></i>
                    </button>
                    <button class="btn btn-action btn-light border" title="Delete" onclick="deleteDoc(${row.id})">
                        <i class="bi bi-trash3 text-danger"></i>
                    </button>
                </div>`
            }
        ]
    });

    $('#docForm').on('submit', function(e) {
        e.preventDefault();
        
        const id = $('#doc_id').val();
        const url = id ? 'api/update_doc.php' : 'api/add_doc.php';
        
        Swal.fire({
            title: 'Processing...',
            text: 'Saving document details...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        $.ajax({
            url: url,
            type: 'POST',
            // Convert the form values into the specific JSON structure you requested
            data: JSON.stringify({
                name: $('#name').val(),
                sheet_id: $('#sheet_id').val(),
                email: '',        // Empty for Admin source
                source: 'admin',  // Hardcoded as admin for this form
                id: id            // Include the ID for updates
            }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function(res) {
                if (res.success) {
                    docModal.hide();
                    table.ajax.reload(null, false);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Saved!',
                        text: res.message,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    $('#docForm')[0].reset();
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Notice',
                        text: res.message,
                        confirmButtonColor: '#0aa5a5'
                    });
                }
            },
            error: function(xhr) {
                Swal.fire({
                    icon: 'error',
                    title: 'System Error',
                    text: 'Failed to communicate with the API.'
                });
            }
        });
    });
   
});

/* --- GOOGLE PICKER LOGIC --- */
function onGapiLoad() { gapi.load('picker', () => pickerInited = true); }
function onGisLoad() { gisInited = true; }

function openPicker() {
    // 1. Get the current active Bootstrap modal instance
    const modalElement = document.getElementById('linkSheetModal'); // <-- Change 'linkSheetModal' to your actual modal ID
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            if (response.access_token) {
                accessToken = response.access_token;
                
                // 2. Hide the modal right before creating the picker to avoid focus lockouts
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                createPicker(modalInstance);
            }
        },
    });
    tokenClient.requestAccessToken();
}

// Pass the modal instance to the picker creation phase
function createPicker(modalInstance) {
    if (pickerInited && accessToken) {
        const view = new google.picker.View(google.picker.ViewId.SPREADSHEETS);
        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setDeveloperKey(API_KEY)
            // Pass both data and the modal context to the callback
            .setCallback((data) => pickerCallback(data, modalInstance))
            .build();
        picker.setVisible(true);
    }
}

function pickerCallback(data, modalInstance) {
    // 3. Check if the user selected a document
    if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        $('#sheet_id').val(doc.id);
        
        // Automatically fill the name if it's currently empty
        $('#name').val(doc.name);

        // Bring the modal back so they can save/submit their linked sheet
        if (modalInstance) {
            modalInstance.show();
        }
    }
    
    // 4. ALSO bring the modal back if they click cancel or close the picker without selecting
    if (data.action === google.picker.Action.CANCEL) {
        if (modalInstance) {
            modalInstance.show();
        }
    }
}
/* --- CRUD HELPERS --- */
function prepareAdd() {
    $('#doc_id').val('');
    $('#docForm')[0].reset();
    $('#modalTitle').text('Add New Sheet');
    docModal.show();
}

function prepareEdit(row) {
    $('#doc_id').val(row.id);
    $('#name').val(row.display_name);
    $('#sheet_id').val(row.google_sheet_id);
    $('#modalTitle').text('Edit Document');
    docModal.show();
}

function deleteDoc(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This document will be removed on the dashboard.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6e7881',
        confirmButtonText: 'Yes, remove it!',
        cancelButtonText: 'Cancel',
        reverseButtons: true, // Puts Cancel on the left, Delete on the right
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            // Show a loading state while the request is processing
            Swal.fire({
                title: 'Removing...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: 'api/delete_doc.php',
                type: 'POST',
                data: JSON.stringify({ id: id }),
                contentType: 'application/json',
                dataType: 'json',
                success: function(res) {
                    if (res.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Removed!',
                            text: res.message || 'The document has been removed.',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        // Reload the DataTable
                        table.ajax.reload(null, false); 
                    } else {
                        Swal.fire('Error', res.message, 'error');
                    }
                },
                error: function() {
                    Swal.fire('System Error', 'Failed to communicate with the server.', 'error');
                }
            });
        }
    });
}