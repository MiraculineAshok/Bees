// Interview page JavaScript
let currentStudent = null;

async function lookupStudent() {
    console.log('lookupStudent function called');
    const zetaId = document.getElementById('zeta-id').value.trim();
    console.log('Zeta ID entered:', zetaId);
    
    if (!zetaId) {
        console.log('No Zeta ID provided, showing error');
        showMessage('lookup-message', 'Please enter a Zeta ID', 'error');
        return;
    }

    const lookupBtn = document.getElementById('lookup-btn-text');
    const lookupLoading = document.getElementById('lookup-loading');
    
    console.log('Lookup button element:', lookupBtn);
    console.log('Loading element:', lookupLoading);
    
    if (lookupBtn && lookupLoading) {
        console.log('Hiding lookup button, showing loading');
        lookupBtn.classList.add('hidden');
        lookupLoading.classList.remove('hidden');
    } else {
        console.error('Lookup button or loading element not found!');
    }

    try {
        const response = await fetch(`/api/students/zeta/${encodeURIComponent(zetaId)}`);
        const data = await response.json();

        if (data.success && data.student) {
            currentStudent = data.student;
            displayStudentInfo(data.student);
            showSection('student-info-section');
        } else {
            // Student not found, show registration form
            document.getElementById('form-zeta-id').value = zetaId;
            showSection('student-form-section');
        }
    } catch (error) {
        console.error('Error in lookupStudent:', error);
        showMessage('lookup-message', 'Error looking up student. Please try again.', 'error');
    } finally {
        console.log('Resetting button states - hiding loading, showing button');
        if (lookupBtn && lookupLoading) {
            lookupBtn.classList.remove('hidden');
            lookupLoading.classList.add('hidden');
            console.log('Button states reset successfully');
        } else {
            console.error('Cannot reset button states - elements not found');
        }
    }
}

function displayStudentInfo(student) {
    const detailsDiv = document.getElementById('student-details');
    detailsDiv.innerHTML = `
        <div class="student-detail">
            <strong>Name:</strong> ${student.name}
        </div>
        <div class="student-detail">
            <strong>Email:</strong> ${student.email}
        </div>
        <div class="student-detail">
            <strong>Phone:</strong> ${student.phone || 'Not provided'}
        </div>
        <div class="student-detail">
            <strong>Address:</strong> ${student.address || 'Not provided'}
        </div>
        <div class="student-detail">
            <strong>Zeta ID:</strong> ${student.zeta_id}
        </div>
        <div class="student-detail">
            <strong>First Name:</strong> ${student.first_name}
        </div>
        <div class="student-detail">
            <strong>Last Name:</strong> ${student.last_name}
        </div>
    `;
}

async function registerStudent(event) {
    event.preventDefault();
    console.log('Registering new student...');
    
    const formData = new FormData(event.target);
    const studentData = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        address: formData.get('address'),
        zeta_id: formData.get('zeta_id')
    };
    
    console.log('Student data:', studentData);
    
    const submitBtn = document.getElementById('submit-btn-text');
    const submitLoading = document.getElementById('submit-loading');
    
    if (submitBtn && submitLoading) {
        submitBtn.classList.add('hidden');
        submitLoading.classList.remove('hidden');
    }
    
    try {
        const response = await fetch('/api/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentData)
        });
        
        const result = await response.json();
        console.log('Registration result:', result);
        
        if (result.success) {
            showMessage('form-message', `Student ${result.data.action} successfully!`, 'success');
            // Show student info and hide form
            currentStudent = result.data;
            displayStudentInfo({
                name: studentData.name,
                email: studentData.email,
                phone: studentData.phone,
                address: studentData.address,
                zeta_id: studentData.zeta_id,
                first_name: studentData.first_name,
                last_name: studentData.last_name
            });
            showSection('student-info-section');
        } else {
            showMessage('form-message', `Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('form-message', 'Error registering student. Please try again.', 'error');
    } finally {
        if (submitBtn && submitLoading) {
            submitBtn.classList.remove('hidden');
            submitLoading.classList.add('hidden');
        }
    }
}

function resetLookup() {
    console.log('Resetting lookup form');
    document.getElementById('zeta-id').value = '';
    showSection('zeta-lookup-section');
    hideMessage('lookup-message');
}

function showSection(sectionId) {
    console.log('showSection called with:', sectionId);
    // Hide all sections
    document.getElementById('zeta-lookup-section').classList.add('hidden');
    document.getElementById('student-info-section').classList.add('hidden');
    document.getElementById('student-form-section').classList.add('hidden');
    
    // Show the requested section
    const targetSection = document.getElementById(sectionId);
    console.log('Target section element:', targetSection);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        console.log('Section shown successfully:', sectionId);
    } else {
        console.error('Target section not found:', sectionId);
    }
}

function showMessage(elementId, message, type) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.innerHTML = `<div class="${type}-message">${message}</div>`;
}

function hideMessage(elementId) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.innerHTML = '';
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Interview page loaded - DOMContentLoaded fired');
    
    // Add event listener for back button
    const backBtn = document.getElementById('back-home-btn');
    console.log('Back button element:', backBtn);
    
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            console.log('Back to home clicked - event listener working');
            window.location.href = '/';
        });
        console.log('Back button event listener added successfully');
    } else {
        console.error('Back button element not found!');
    }
    
    // Add event listener for lookup button
    const lookupStudentBtn = document.getElementById('lookup-student-btn');
    console.log('Lookup student button element:', lookupStudentBtn);
    
    if (lookupStudentBtn) {
        lookupStudentBtn.addEventListener('click', function() {
            console.log('Lookup student button clicked');
            lookupStudent();
        });
        console.log('Lookup student button event listener added');
    } else {
        console.error('Lookup student button element not found!');
    }
    
    // Add event listener for start interview button (from student info)
    const startInterviewFromInfoBtn = document.getElementById('start-interview-from-info-btn');
    console.log('Start interview from info button element:', startInterviewFromInfoBtn);
    
    if (startInterviewFromInfoBtn) {
        startInterviewFromInfoBtn.addEventListener('click', function() {
            console.log('Start interview from info button clicked');
            window.location.href = '/interview'; // or call startInterview if available
        });
        console.log('Start interview from info button event listener added');
    } else {
        console.error('Start interview from info button element not found!');
    }
    
    // Add event listener for reset lookup button
    const resetLookupBtn = document.getElementById('reset-lookup-btn');
    console.log('Reset lookup button element:', resetLookupBtn);
    
    if (resetLookupBtn) {
        resetLookupBtn.addEventListener('click', function() {
            console.log('Reset lookup button clicked');
            resetLookup();
        });
        console.log('Reset lookup button event listener added');
    } else {
        console.error('Reset lookup button element not found!');
    }
    
    // Add event listener for form submission
    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', registerStudent);
        console.log('Student form event listener added');
    }
    
    // Add event listener for Enter key on zeta ID input
    const zetaIdInput = document.getElementById('zeta-id');
    if (zetaIdInput) {
        zetaIdInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                lookupStudent();
            }
        });
    }
    
    // Reset to initial state
    console.log('Resetting page to initial state');
    showSection('zeta-lookup-section');
    hideMessage('lookup-message');
    document.getElementById('zeta-id').value = '';
    
    console.log('Page initialization complete');
});
