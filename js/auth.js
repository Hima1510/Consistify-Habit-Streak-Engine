// DOM Elements
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabIndicator = document.querySelector('.tab-indicator');
const switchFormLinks = document.querySelectorAll('.switch-form');
const passwordToggles = document.querySelectorAll('.password-toggle');
const passwordInput = document.getElementById('signup-password');
const strengthLevel = document.querySelector('.strength-level');
const strengthText = document.querySelector('.strength-text');

// Check if user is already logged in
async function checkCurrentSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
}
document.addEventListener('DOMContentLoaded', checkCurrentSession);

// Tab Switching logic
if (loginTab && signupTab) {
    loginTab.addEventListener('click', () => switchToTab('login'));
    signupTab.addEventListener('click', () => switchToTab('signup'));

    switchFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.closest('.form').id === 'login-form' ? 'signup' : 'login';
            switchToTab(target);
        });
    });

    // Check URL parameters to decide which tab to open
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'signup') {
        switchToTab('signup');
    } else if (mode === 'login') {
        switchToTab('login');
    } else {
        // Default based on filename
        if (window.location.pathname.includes('signup.html')) {
            switchToTab('signup');
        } else if (window.location.pathname.includes('login.html')) {
            switchToTab('login');
        }
    }
}

function switchToTab(tab) {
    if (!loginTab || !signupTab) return;

    // Update active tab
    loginTab.classList.toggle('active', tab === 'login');
    signupTab.classList.toggle('active', tab === 'signup');

    // Update tab indicator position
    if (tabIndicator) {
        tabIndicator.style.transform = tab === 'login' ? 'translateX(0)' : 'translateX(100%)';
    }

    // Show/hide forms
    if (loginForm && signupForm) {
        loginForm.classList.toggle('active', tab === 'login');
        signupForm.classList.toggle('active', tab === 'signup');
    }
}

// Password Toggle Visibility
if (passwordToggles) {
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.parentElement.querySelector('input[type="password"], input[type="text"]');
            if (!input) return;
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Password Strength Checker
if (passwordInput && strengthLevel && strengthText) {
    passwordInput.addEventListener('input', function () {
        const password = this.value;
        const strength = checkPasswordStrength(password);

        strengthLevel.style.width = `${strength.percentage}%`;
        strengthLevel.style.backgroundColor = strength.color;
        strengthText.textContent = `Password strength: ${strength.text}`;
    });
}

function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    if (score >= 80) return { percentage: 100, color: '#2ecc71', text: 'Strong' };
    else if (score >= 60) return { percentage: 75, color: '#f39c12', text: 'Good' };
    else if (score >= 40) return { percentage: 50, color: '#f1c40f', text: 'Fair' };
    else return { percentage: 30, color: '#e74c3c', text: 'Weak' };
}

// Signup Submission
if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const fullName = this.querySelector('#full-name').value;
        const username = this.querySelector('#username').value;
        const email = this.querySelector('#signup-email').value;
        const password = this.querySelector('#signup-password').value;
        const confirmPassword = this.querySelector('#confirm-password').value;
        const termsChecked = this.querySelector('#terms')?.checked;

        if (!fullName || !username || !email || !password) {
            alert('Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (termsChecked === false) {
            alert('You must agree to the Terms of Service');
            return;
        }

        try {
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) throw error;

            if (data.user) {
                // Insert into public users table directly in Javascript, letting the DB auto-increment the Integer ID
                const { error: profileError } = await supabaseClient
                    .from('users')
                    .insert([{
                        email: email,
                        username: username
                    }]);

                if (profileError && profileError.code !== '23505') {
                    alert("Database Error: " + profileError.message + "\n\nPlease tell me exactly what this error says!");
                }

                alert('Account created successfully!');
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            alert('Signup failed: ' + error.message);
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Account';
        }
    });
}

// Login Submission
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = this.querySelector('#email').value;
        const password = this.querySelector('#password').value;

        if (!email || !password) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            window.location.href = 'dashboard.html';

        } catch (error) {
            alert('Login failed: ' + error.message);
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Login';
        }
    });
}
