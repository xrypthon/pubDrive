document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileIcon = document.getElementById('fileIcon');
    const removeFile = document.getElementById('removeFile');
    const protectCheckbox = document.getElementById('protectFile');
    const passwordField = document.getElementById('passwordField');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const searchInput = document.getElementById('searchInput');
    const fileList = document.getElementById('fileList');
    const passwordModal = document.getElementById('passwordModal');
    const closeModal = document.querySelector('.close-modal');
    const modalPassword = document.getElementById('modalPassword');
    const submitPassword = document.getElementById('submitPassword');
    const passwordError = document.getElementById('passwordError');

    // Current file to be uploaded
    let currentFile = null;
    let currentProtectedFileId = null;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    // Handle file selection via browse button
    fileInput.addEventListener('change', handleFiles);

    // Remove selected file
    removeFile.addEventListener('click', function() {
        resetFileInput();
    });

    // Toggle password protection
    protectCheckbox.addEventListener('change', function() {
        passwordField.style.display = this.checked ? 'block' : 'none';
    });

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye-slash');
        this.classList.toggle('fa-eye');
    });

    // Handle form submission
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentFile) {
            showAlert('Please select a file to upload.', 'error');
            return;
        }

        if (protectCheckbox.checked && (!passwordInput.value || passwordInput.value.length < 4)) {
            showAlert('Password must be at least 4 characters for protected files.', 'error');
            return;
        }

        // Show loading state
        uploadBtn.innerHTML = '<div class="spinner"></div> Uploading...';
        uploadBtn.disabled = true;

        // Submit form
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('protectFile', protectCheckbox.checked ? 'on' : 'off');
        if (protectCheckbox.checked) {
            formData.append('password', passwordInput.value);
        }

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text) });
            }
            return response;
        })
        .then(() => {
            window.location.reload();
        })
        .catch(error => {
            showAlert(error.message, 'error');
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload File';
            uploadBtn.disabled = false;
        });
    });

    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const files = document.querySelectorAll('.file-item');
        
        files.forEach(file => {
            const name = file.querySelector('h3').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                file.style.display = 'flex';
            } else {
                file.style.display = 'none';
            }
        });
    });

    // Handle protected file download
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('protected')) {
            e.preventDefault();
            currentProtectedFileId = e.target.getAttribute('data-id');
            passwordModal.style.display = 'flex';
            modalPassword.value = '';
            passwordError.textContent = '';
        }
    });

    // Close modal
    closeModal.addEventListener('click', function() {
        passwordModal.style.display = 'none';
    });

    // Submit password
    submitPassword.addEventListener('click', function() {
        const password = modalPassword.value;
        
        if (!password) {
            passwordError.textContent = 'Please enter a password.';
            return;
        }

        // Show loading state
        this.innerHTML = '<div class="spinner"></div> Verifying...';
        this.disabled = true;

        fetch('/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileId: currentProtectedFileId,
                password: password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = data.path;
            } else {
                passwordError.textContent = data.message;
                this.innerHTML = 'Submit';
                this.disabled = false;
            }
        })
        .catch(error => {
            passwordError.textContent = 'An error occurred. Please try again.';
            this.innerHTML = 'Submit';
            this.disabled = false;
        });
    });

    // Functions
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }

    function handleFiles(e) {
        const files = e.target.files;
        if (files.length === 0) return;
        
        currentFile = files[0];
        displayFileInfo(currentFile);
    }

    function displayFileInfo(file) {
        fileInfo.style.display = 'flex';
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Set appropriate icon based on file type
        const iconClass = getFileIconClass(file.type);
        fileIcon.className = `fas ${iconClass}`;
    }

    function resetFileInput() {
        currentFile = null;
        fileInput.value = '';
        fileInfo.style.display = 'none';
        protectCheckbox.checked = false;
        passwordField.style.display = 'none';
        passwordInput.value = '';
    }

    function getFileIconClass(mimeType) {
        const type = mimeType.split('/')[0];
        const subtype = mimeType.split('/')[1];
        
        switch(type) {
            case 'image':
                return 'fa-file-image';
            case 'video':
                return 'fa-file-video';
            case 'audio':
                return 'fa-file-audio';
            case 'application':
                if (subtype.includes('pdf')) return 'fa-file-pdf';
                if (subtype.includes('msword') || subtype.includes('wordprocessingml')) return 'fa-file-word';
                if (subtype.includes('spreadsheetml')) return 'fa-file-excel';
                if (subtype.includes('presentationml')) return 'fa-file-powerpoint';
                if (subtype.includes('zip') || subtype.includes('compressed')) return 'fa-file-archive';
                return 'fa-file-code';
            case 'text':
                return 'fa-file-alt';
            default:
                return 'fa-file';
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('fade-out');
            setTimeout(() => {
                alert.remove();
            }, 500);
        }, 3000);
    }
});