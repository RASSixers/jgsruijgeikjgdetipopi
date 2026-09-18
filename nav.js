// Navbar Injection Script

// === DARK MODE ANTI-FLASH ===
// Run immediately (outside DOMContentLoaded) so theme applies before first paint.
(function() {
    try {
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.style.colorScheme = 'dark';
        }
    } catch(e) {}
})();

document.addEventListener('DOMContentLoaded', function() {
    // Add Navbar Styles if not present
    if (!document.getElementById('navbar-styles')) {
        const link = document.createElement('link');
        link.id = 'navbar-styles';
        link.rel = 'stylesheet';
        link.href = '/navbar-styles.css';
        document.head.appendChild(link);
    }
    if (!document.getElementById('site-theme-css')) {
        const tlink = document.createElement('link');
        tlink.id = 'site-theme-css';
        tlink.rel = 'stylesheet';
        tlink.href = '/theme.css';
        document.head.appendChild(tlink);
    }

    // Add Google Fonts if not present (Lexend matches homepage)
    if (!document.getElementById('nav-google-fonts')) {
        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        document.head.appendChild(preconnect1);

        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.crossOrigin = '';
        document.head.appendChild(preconnect2);

        const link = document.createElement('link');
        link.id = 'nav-google-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap';
        document.head.appendChild(link);
    }

    // Add Tailwind CSS if not present
    if (typeof tailwind === 'undefined' && !document.getElementById('nav-tailwind-cdn')) {
        const script = document.createElement('script');
        script.id = 'nav-tailwind-cdn';
        script.src = 'https://cdn.tailwindcss.com';
        script.onload = () => {
            if (window.tailwind) {
                tailwind.config = {
                    theme: {
                        extend: {
                            colors: {
                                border: "hsl(214.3 31.8% 91.4%)",
                                input: "hsl(214.3 31.8% 91.4%)",
                                ring: "hsl(222.2 84% 4.9%)",
                                background: "hsl(0 0% 100%)",
                                foreground: "hsl(222.2 84% 4.9%)",
                                primary: {
                                    DEFAULT: "hsl(222.2 47.4% 11.2%)",
                                    foreground: "hsl(210 40% 98%)",
                                },
                                secondary: {
                                    DEFAULT: "hsl(210 40% 96.1%)",
                                    foreground: "hsl(222.2 47.4% 11.2%)",
                                },
                                muted: {
                                    DEFAULT: "hsl(210 40% 96.1%)",
                                    foreground: "hsl(215.4 16.3% 46.9%)",
                                },
                                accent: {
                                    DEFAULT: "hsl(210 40% 96.1%)",
                                    foreground: "hsl(222.2 47.4% 11.2%)",
                                },
                                card: {
                                    DEFAULT: "hsl(0 0% 100%)",
                                    foreground: "hsl(222.2 84% 4.9%)",
                                },
                            }
                        }
                    }
                };
            }
        };
        document.head.appendChild(script);
    } else if (window.tailwind && !tailwind.config?.theme?.extend?.colors?.primary) {
        const existingConfig = tailwind.config || {};
        tailwind.config = {
            ...existingConfig,
            theme: {
                ...(existingConfig.theme || {}),
                extend: {
                    ...(existingConfig.theme?.extend || {}),
                    colors: {
                        ...(existingConfig.theme?.extend?.colors || {}),
                        border: "hsl(214.3 31.8% 91.4%)",
                        primary: {
                            DEFAULT: "hsl(222.2 47.4% 11.2%)",
                            foreground: "hsl(210 40% 98%)",
                        },
                    }
                }
            }
        };
    }

    // Add Firebase SDKs if not present
    if (!document.getElementById('firebase-app-sdk')) {
        const scripts = [
            { id: 'firebase-app-sdk', src: 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js' },
            { id: 'firebase-auth-sdk', src: 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js' },
            { id: 'firebase-firestore-sdk', src: 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js' },
            { id: 'firebase-storage-sdk', src: 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js' }
        ];
        
        scripts.forEach(s => {
            const script = document.createElement('script');
            script.id = s.id;
            script.src = s.src;
            script.async = false;
            document.head.appendChild(script);
        });
    }

    const navbarHTML = `
    <nav class="navbar">
        <div class="nav-left">
            <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Open menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <a href="/" class="nav-brand">
                <img src="/favicon.ico" alt="SixersHoops" class="nav-logo">
                <span class="brand-name">SixersHoops</span>
            </a>
        </div>

        <ul class="nav-menu">
            <li class="nav-item">
                <a href="/" class="nav-link">Home</a>
            </li>
            <li class="nav-item">
                <a href="/pickem" class="nav-link">Pick'em</a>
            </li>
            <li class="nav-item dropdown">
                <button class="dropdown-toggle">Team Hub</button>
                <div class="dropdown-menu">
                    <a href="https://sixershoops.com/roster" class="dropdown-item">Roster</a>
                    <a href="https://sixershoops.com/sixers-depth-chart" class="dropdown-item">Depth Chart</a>
                    <a href="https://sixershoops.com/standings" class="dropdown-item">NBA Standings</a>
                    <a href="https://sixershoops.com/salary" class="dropdown-item">Salary Breakdown</a>
                    <a href="https://sixershoops.com/future-draft-picks" class="dropdown-item">Draft Picks</a>
                </div>
            </li>
            <li class="nav-item">
                <a href="https://sixershoops.com/schedule" class="nav-link">Schedule</a>
            </li>
            <li class="nav-item">
                <a href="https://sixershoops.com/contact" class="nav-link">Contact</a>
            </li>
        </ul>

        <div class="nav-icons">
            <div id="authNavContainer">
                <button class="auth-nav-btn" id="navSignInBtn">Sign In</button>
            </div>
            <button class="icon-btn theme-toggle" id="themeToggle" aria-label="Cycle theme: light, dark, navy" title="Theme">
                <svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <svg class="navy-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="display: none;">
                    <path d="M12 2L3 7v4c0 5.25 3.4 10.15 9 11.35C17.6 21.15 21 16.25 21 11V7l-9-5z"/>
                </svg>
            </button>
        </div>
        <style>
            .notification-item {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                transition: background 0.2s;
                cursor: pointer;
            }
            .notification-item:hover {
                background: #f8fafc;
            }
            .notification-item.unread {
                background: #eff6ff;
            }
            .notification-item.unread:hover {
                background: #e0f2fe;
            }
            #nav-notif-badge {
                z-index: 50;
                box-shadow: 0 0 0 2px #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
            }

            .auth-divider {
                display: flex;
                align-items: center;
                margin: 1.1rem 0;
                color: #94a3b8;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .auth-divider::before,
            .auth-divider::after {
                content: '';
                flex: 1;
                height: 1px;
                background: #e2e8f0;
            }
            .auth-divider span { padding: 0 0.75rem; }
            .auth-google-btn {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.6rem;
                padding: 0.7rem 1rem;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-family: inherit;
                font-size: 0.88rem;
                font-weight: 600;
                color: #1e293b;
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
            }
            .auth-google-btn:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            :root.dark-mode .auth-google-btn {
                background: #1e293b;
                border-color: #334155;
                color: #e2e8f0;
            }
            :root.dark-mode .auth-google-btn:hover { background: #334155; }
            :root.dark-mode .auth-divider::before,
            :root.dark-mode .auth-divider::after { background: #334155; }
        </style>
    </nav>

    <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu-panel">
            <p class="mobile-menu-label">Navigate</p>
            <a href="/" class="mobile-nav-link">Home</a>
            <a href="/pickem" class="mobile-nav-link">Pick'em</a>
            <a href="https://sixershoops.com/schedule" class="mobile-nav-link">Schedule</a>

            <p class="mobile-menu-label">Team Hub</p>
            <a href="https://sixershoops.com/roster" class="mobile-nav-link">Roster</a>
            <a href="https://sixershoops.com/sixers-depth-chart" class="mobile-nav-link">Depth Chart</a>
            <a href="https://sixershoops.com/standings" class="mobile-nav-link">NBA Standings</a>
            <a href="https://sixershoops.com/salary" class="mobile-nav-link">Salary Breakdown</a>
            <a href="https://sixershoops.com/future-draft-picks" class="mobile-nav-link">Draft Picks</a>

            <p class="mobile-menu-label">Site</p>
            <a href="https://sixershoops.com/contact" class="mobile-nav-link">Contact</a>
        </div>
    </div>

    <!-- Auth Modal -->
    <div class="auth-modal-overlay" id="authModalOverlay">
        <div class="auth-modal">
            <button class="auth-modal-close" id="authModalClose" aria-label="Close">×</button>
            <div class="auth-modal-header">
                <h2 class="auth-modal-title">Sixers Hoops</h2>
            </div>
            <div class="auth-modal-tabs">
                <button class="auth-modal-tab active" data-tab="login">Login</button>
                <button class="auth-modal-tab" data-tab="register">Sign Up</button>
                <button class="auth-modal-tab" data-tab="profile" id="navProfileTab" style="display: none;">Profile</button>
            </div>
            <div class="auth-modal-content">
                <div id="navAuthMessage" class="auth-message"></div>

                <!-- Login Form -->
                <form id="navLoginForm" novalidate>
                    <div class="auth-form-group">
                        <label class="auth-label" for="navLoginEmail">Email</label>
                        <div class="auth-input-wrap">
                            <input type="email" class="auth-input" id="navLoginEmail" required autocomplete="email" placeholder="name@example.com">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-label" for="navLoginPassword">Password</label>
                        <div class="auth-input-wrap">
                            <input type="password" class="auth-input" id="navLoginPassword" required autocomplete="current-password" placeholder="••••••••">
                            <button type="button" class="auth-pw-toggle" data-target="navLoginPassword" aria-label="Show password">Show</button>
                        </div>
                    </div>
                    <div class="auth-row-between">
                        <label class="auth-remember">
                            <input type="checkbox" id="navRememberMe">
                            <span>Remember me</span>
                        </label>
                        <a href="#" id="forgotPasswordLink" class="auth-helper-link">Forgot password?</a>
                    </div>
                    <button type="submit" class="auth-submit-btn">Sign In</button>
                    <div class="auth-divider"><span>or</span></div>
                    <button type="button" class="auth-google-btn" id="navGoogleSignInBtn">
                        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                        Continue with Google
                    </button>
                    <div class="auth-switch">Don't have an account? <a href="#" data-tab-switch="register">Create one</a></div>
                </form>

                <!-- Forgot Password Form -->
                <form id="navForgotForm" style="display: none;" novalidate>
                    <p class="auth-helper-text">Enter your email and we'll send you a link to reset your password.</p>
                    <div class="auth-form-group">
                        <label class="auth-label" for="navForgotEmail">Email address</label>
                        <div class="auth-input-wrap">
                            <input type="email" class="auth-input" id="navForgotEmail" required placeholder="name@example.com">
                        </div>
                    </div>
                    <button type="submit" class="auth-submit-btn">Send reset link</button>
                    <div class="auth-switch"><a href="#" id="backToLoginLink" class="auth-back-link">&larr; Back to login</a></div>
                </form>

                <!-- Profile Form -->
                <form id="navProfileForm" style="display: none;">
                    <div id="navProfilePreview" style="display:flex;align-items:center;gap:1rem;background:#f6f8fb;border:1px solid rgba(13,15,26,0.08);border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;">
                        <div style="position:relative;flex-shrink:0;">
                            <div id="navProfileAvatarPreview" style="width:56px;height:56px;border-radius:50%;background:#001a57;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.4rem;color:white;overflow:hidden;border:3px solid rgba(0,107,182,0.3);">
                                <span id="navProfileInitialPreview">?</span>
                            </div>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div id="navProfileNamePreview" style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.1rem;color:#001a57;letter-spacing:0.03em;">—</div>
                            <div id="navProfileEmailPreview" style="font-size:0.78rem;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
                            <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
                                <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div>
                                <span style="font-size:0.7rem;color:#64748b;font-weight:600;">Sixers Hoops Member</span>
                            </div>
                        </div>
                    </div>

                    <div class="auth-form-group">
                        <label class="auth-label">Display Name (Max 12 chars)</label>
                        <input type="text" class="auth-input" id="navProfileName" required maxlength="12">
                    </div>

                    <div class="auth-form-group">
                        <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0;">
                            <div class="nav-avatar-opt" data-color="#001a57" data-label="Navy" style="width:34px;height:34px;border-radius:50%;background:#001a57;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:0.85rem;color:white;flex-shrink:0;transition:border-color 0.15s,transform 0.15s;" title="Navy">S</div>
                            <div class="nav-avatar-opt" data-color="#006BB6" data-label="Blue" style="width:34px;height:34px;border-radius:50%;background:#006BB6;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:0.85rem;color:white;flex-shrink:0;transition:border-color 0.15s,transform 0.15s;" title="Blue">S</div>
                            <div class="nav-avatar-opt" data-color="#ED174C" data-label="Red" style="width:34px;height:34px;border-radius:50%;background:#ED174C;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:0.85rem;color:white;flex-shrink:0;transition:border-color 0.15s,transform 0.15s;" title="Red">S</div>
                            <div class="nav-avatar-opt" data-color="#475569" data-label="Slate" style="width:34px;height:34px;border-radius:50%;background:#475569;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:0.85rem;color:white;flex-shrink:0;transition:border-color 0.15s,transform 0.15s;" title="Slate">S</div>
                            <div class="nav-avatar-opt" data-color="#1e293b" data-label="Dark" style="width:34px;height:34px;border-radius:50%;background:#1e293b;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:0.85rem;color:white;flex-shrink:0;transition:border-color 0.15s,transform 0.15s;" title="Dark">S</div>
                        </div>
                        <input type="hidden" id="navAvatarColor" value="">
                    </div>

                    <div class="auth-form-group">
                        <label class="auth-label">Profile Picture</label>
                        <div class="pic-upload-row">
                            <div class="pic-upload-preview" id="navPicPreview"></div>
                            <div class="pic-upload-controls">
                                <label for="navProfilePicInput" class="pic-upload-btn">Upload Photo</label>
                                <input type="file" id="navProfilePicInput" accept="image/*" style="display:none;">
                                <button type="button" class="pic-upload-clear" id="navProfilePicClear">Remove</button>
                                <p class="pic-upload-hint">JPG or PNG, up to 2 MB.</p>
                            </div>
                        </div>
                        <input type="hidden" id="navProfilePicUrl" value="">
                    </div>

                    <button type="submit" class="auth-submit-btn">Save Changes</button>

                    <div class="user-dropdown-divider" style="margin: 2rem 0 1rem;"></div>

                    <div class="danger-zone">
                        <h4 style="color: #ef4444; font-size: 0.85rem; margin-bottom: 0.5rem;">Danger Zone</h4>
                        <button type="button" class="delete-account-btn" id="deleteAccountBtn">Delete My Account</button>
                    </div>
                </form>

                <!-- Register Form -->
                <form id="navRegisterForm" style="display: none;" novalidate>
                    <div class="auth-form-group">
                        <label class="auth-label" for="navRegisterUsername">Username (max 12 chars)</label>
                        <div class="auth-input-wrap">
                            <input type="text" class="auth-input" id="navRegisterUsername" required maxlength="12" placeholder="yourhandle">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-label" for="navRegisterEmail">Email</label>
                        <div class="auth-input-wrap">
                            <input type="email" class="auth-input" id="navRegisterEmail" required autocomplete="email" placeholder="name@example.com">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-label" for="navRegisterPassword">Password</label>
                        <div class="auth-input-wrap">
                            <input type="password" class="auth-input" id="navRegisterPassword" required autocomplete="new-password" placeholder="At least 8 characters">
                            <button type="button" class="auth-pw-toggle" data-target="navRegisterPassword" aria-label="Show password">Show</button>
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-label" for="navRegisterConfirm">Confirm password</label>
                        <div class="auth-input-wrap">
                            <input type="password" class="auth-input" id="navRegisterConfirm" required autocomplete="new-password" placeholder="Repeat password">
                        </div>
                    </div>
                    <p class="auth-fineprint">By creating an account, you agree to the Terms and Privacy Policy.</p>
                    <button type="submit" class="auth-submit-btn">Create Account</button>
                    <div class="auth-divider"><span>or</span></div>
                    <button type="button" class="auth-google-btn" id="navGoogleSignUpBtn">
                        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                        Continue with Google
                    </button>
                    <div class="auth-switch">Already have an account? <a href="#" data-tab-switch="login">Sign in</a></div>
                </form>
            </div>
        </div>
    </div>
    `;

    const footerHTML = `
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <a href="/" class="footer-brand">
                </a>
                <span class="footer-brand-accent"></span>
                <p class="footer-tagline">Independent Philadelphia 76ers analysis, advanced stats, and draft tools built for fans who want the full picture.</p>
            </div>

            <div class="footer-section">
                <h3 class="footer-title">Explore</h3>
                <ul class="footer-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/pickem">Pick'em</a></li>
                    <li><a href="https://sixershoops.com/standings">NBA Standings</a></li>
                    <li><a href="https://sixershoops.com/schedule">Schedule</a></li>
                    <li><a href="https://sixershoops.com/contact">Contact</a></li>
                </ul>
            </div>

            <div class="footer-section">
                <h3 class="footer-title">Legal</h3>
                <ul class="footer-links">
                    <li><a href="/privacy-policy">Privacy Policy</a></li>
                    <li><a href="/cookie-policy">Cookie Policy</a></li>
                    <li><a href="/terms-of-service">Terms of Service</a></li>
                    <li><a href="/disclaimer">Disclaimer</a></li>
                </ul>
            </div>
        </div>

        <div class="footer-bottom">
            <p>&copy; 2025 Sixers Hoops &middot; All rights reserved</p>
            <span class="footer-bottom-meta">Not affiliated with the NBA or the Philadelphia 76ers</span>
        </div>
    </footer>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);

 const firebaseConfig = {
    apiKey: "AIzaSyBzMlBV5gbZZlg_eTwNWrRDrhx-_ATIPS0",
    authDomain: "auth.sixershoops.com",
    projectId: "pickem-1e12b",
    storageBucket: "pickem-1e12b.appspot.com",
    messagingSenderId: "715626120695",
    appId: "1:715626120695:web:4942646cf3d6ca7e181af2",
    measurementId: "G-B22K71F01E"
};

    window.auth = null;
    window.db = null;
    window.storage = null;
    
    function initFirebase() {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore || !firebase.storage) {
            setTimeout(initFirebase, 200);
            return;
        }
        try {
            window.firebase = firebase;
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            window.auth = firebase.auth();
            window.db = firebase.firestore();
            window.storage = firebase.storage();
            setupAuthListeners();
        } catch (err) {
            console.error('Firebase init error:', err);
            setTimeout(initFirebase, 400);
        }
    }

    let _notifUnsub = null;
    window.updateNotifBadge = function updateNotifBadge(count) {
        const n = Math.max(0, Number(count) || 0);
        document.querySelectorAll('#navNotifBadgeTop, #nav-notif-badge, .nav-notif-badge, #dropdown-notif-count, #dropdown-inbox-count').forEach(function(el) {
            if (el.id === 'navNotifBadgeTop') return;
            el.style.display = 'none';
            el.classList.add('hidden');
            el.textContent = '';
            try { if (el.id !== 'navNotifBadgeTop') el.remove(); } catch(_) {}
        });

        const btn = document.getElementById('userProfileBtn');
        if (!btn) return;
        btn.style.position = 'relative';

        let anchor = btn.querySelector('.user-avatar-img, .user-avatar, .relative') || btn;
        if (anchor && anchor.classList && anchor.classList.contains('relative')) {
            // ok
        } else if (btn.querySelector('.relative')) {
            anchor = btn.querySelector('.relative');
        } else {
            anchor = btn;
        }
        if (anchor !== btn) anchor.style.position = 'relative';

        let badge = document.getElementById('navNotifBadgeTop');
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'navNotifBadgeTop';
            anchor.appendChild(badge);
        } else if (badge.parentElement !== anchor) {
            anchor.appendChild(badge);
        }
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;line-height:18px;text-align:center;z-index:6;box-shadow:0 0 0 2px #fff;pointer-events:none;';
        if (n > 0) {
            badge.style.display = 'block';
            badge.textContent = n > 99 ? '99+' : String(n);
        } else {
            badge.style.display = 'none';
            badge.textContent = '';
        }
    }
    function listenNotifications(user) {
        if (_notifUnsub) { try { _notifUnsub(); } catch (e) {} _notifUnsub = null; }
        if (!user || !window.db) { updateNotifBadge(0); return; }
        try {
            _notifUnsub = window.db.collection('notifications')
                .where('recipientId', '==', user.uid)
                .onSnapshot(function(snap) {
                    var unread = 0;
                    snap.forEach(function(doc) {
                        var d = doc.data() || {};
                        if (d.read === false || d.read === undefined) unread++;
                    });
                    updateNotifBadge(unread);
                }, function(err) {
                    console.warn('notifications listen', err);
                });
        } catch (e) {
            console.warn(e);
        }
    }

    async function syncUsernameSlug(user) {
        if (!user || !window.db) return;
        try {
            const doc = await window.db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const d = doc.data() || {};
                const lower = (d.usernameLower || d.username || '').toString().toLowerCase().trim();
                if (lower) {
                    localStorage.setItem('usernameLower', lower.replace(/[^a-z0-9_-]+/g, '-'));
                }
            }
        } catch (e) {}
    }

    function renderUserNav(user) {
        const authNav = document.getElementById('authNavContainer');
        const mobileAuth = document.getElementById('mobileAuthContainer');
        
        if (user) {
            const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
            const initial = displayName.charAt(0).toUpperCase();
            
            const photoURL = localStorage.getItem('photoURL') || user.photoURL || '';
            const avatarColor = localStorage.getItem('avatarColor') || '#001a57';
            let usernameSlug = (localStorage.getItem('usernameLower') || '').trim().toLowerCase();
            if (!usernameSlug) {
                usernameSlug = (displayName || 'user').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'user';
            }
            const profileUrl = '/user/' + encodeURIComponent(usernameSlug);

            const avatarInner = photoURL
                ? `<img src="${photoURL}" alt="${displayName}" class="user-avatar-img">`
                : `<div class="user-avatar" style="background:${avatarColor}">${initial}</div>`;

            const avatarHTML = `<div class="relative" style="position:relative;display:inline-block;">${avatarInner}</div>`;

            const userHTML = `
                <div class="user-profile-wrapper">
                    <div class="user-profile-btn" id="userProfileBtn">
                        ${avatarHTML}
                        <span class="user-name">${displayName}</span>
                    </div>
                    <div class="user-dropdown" id="userDropdown">
                        <div class="user-dropdown-header">
                            <strong>${displayName}</strong>
                            <span>${user.email || ''}</span>
                        </div>
                        <div class="user-dropdown-divider"></div>
                        <button class="user-dropdown-item" id="navMyProfileLink">Profile</button>
                        <button class="user-dropdown-item" id="navDraftsLink">
                            <span>View Drafts</span>
                        </button>
                        <button class="user-dropdown-item" id="navInboxLink">
                            <span>Inbox</span>
                        </button>
                        <button class="user-dropdown-item" id="navNotifsLink">
                            <span>Notifications</span>
                        </button>
                        <button class="user-dropdown-item" id="navSettingsBtn">Account Settings</button>
                        ${user.email && user.email.toLowerCase() === 'rhatus13@gmail.com' ? `<div class="user-dropdown-divider"></div>
                        <button class="user-dropdown-item" id="navModerationLink">Moderation</button>` : ''}
                        <div class="user-dropdown-divider"></div>
                        <button class="user-dropdown-item logout-action" id="navDropdownLogout">Sign Out</button>
                    </div>
                </div>
            `;

            if (authNav) authNav.innerHTML = userHTML;
            if (mobileAuth) mobileAuth.innerHTML = '';

            const profileBtn = document.getElementById('userProfileBtn');
            const userDropdown = document.getElementById('userDropdown');
            const smallLogoutBtn = document.getElementById('navSmallLogout');
            const dropdownLogoutBtn = document.getElementById('navDropdownLogout');
            const editProfileBtn = document.getElementById('navSettingsBtn');
            const mobileEditBtn = document.getElementById('mobileProfileBtn');
            const mobileLogout = document.getElementById('navLogoutBtn');
            const myProfileLink = document.getElementById('navMyProfileLink');
            const inboxLink = document.getElementById('navInboxLink');
            
            const draftsLink = document.getElementById('navDraftsLink');
            if (draftsLink) {
                draftsLink.onclick = function(e) {
                    if (e) { e.preventDefault(); e.stopPropagation(); }
                    try {
                        var dd = document.getElementById('userDropdown');
                        if (dd) dd.classList.remove('active');
                    } catch (_) {}
                    if (typeof window.openTradeDrafts === 'function') {
                        window.openTradeDrafts();
                    } else if (typeof window.openGlobalDraftsPanel === 'function') {
                        window.openGlobalDraftsPanel();
                    }
                };
            }
            const notifsLink = document.getElementById('navNotifsLink');

            if (profileBtn && userDropdown) {
                profileBtn.onclick = (e) => {
                    e.stopPropagation();
                    userDropdown.classList.toggle('active');
                };
            }
            if (myProfileLink) myProfileLink.onclick = function(e) {
                e.preventDefault();
                window.location.href = profileUrl;
            };
            if (inboxLink) inboxLink.onclick = function(e) {
                e.preventDefault();
                window.location.href = profileUrl + '/inbox';
            };
            if (notifsLink) notifsLink.onclick = function(e) {
                e.preventDefault();
                window.location.href = profileUrl + '/notifications';
            };
            const modLink = document.getElementById('navModerationLink');
            if (modLink) modLink.onclick = function(e) {
                e.preventDefault();
                window.location.href = '/moderation.html';
            };
            if (smallLogoutBtn) smallLogoutBtn.onclick = function(e) { e.stopPropagation(); window.auth.signOut(); };
            if (dropdownLogoutBtn) dropdownLogoutBtn.onclick = function(e) { e.stopPropagation(); window.auth.signOut(); };
            if (editProfileBtn) editProfileBtn.onclick = function(e) {
                e.preventDefault();
                window.location.href = profileUrl + '/settings';
            };
            if (mobileEditBtn) mobileEditBtn.onclick = function(e) {
                e.preventDefault();
                window.location.href = profileUrl + '/settings';
            };
            if (mobileLogout) mobileLogout.onclick = () => window.auth.signOut();
            listenNotifications(user);
            syncUsernameSlug(user).then(function(){
                const newSlug = (localStorage.getItem('usernameLower') || '').trim();
                if (newSlug) {
                    const expected = '/user/' + encodeURIComponent(newSlug);
                    const mp = document.getElementById('navMyProfileLink');
                    const ib = document.getElementById('navInboxLink');
                    const nt = document.getElementById('navNotifsLink');
                    const st = document.getElementById('navSettingsBtn');
                    if (mp) mp.onclick = function(e){ e.preventDefault(); window.location.href = expected; };
                    if (ib) ib.onclick = function(e){ e.preventDefault(); window.location.href = expected + '/inbox'; };
                    if (nt) nt.onclick = function(e){ e.preventDefault(); window.location.href = expected + '/notifications'; };
                    if (st) st.onclick = function(e){ e.preventDefault(); window.location.href = expected + '/settings'; };
                    const mst = document.getElementById('mobileProfileBtn');
                    if (mst) { mst.setAttribute('href', expected + '/settings'); mst.onclick = function(e){ e.preventDefault(); window.location.href = expected + '/settings'; }; }
                }
            });

        } else {
            if (authNav) authNav.innerHTML = '<button class="auth-nav-btn" id="navSignInBtn">Sign In</button>';
            if (mobileAuth) mobileAuth.innerHTML = '';
            
            const signInBtn = document.getElementById('navSignInBtn');
            const mobileSignInBtn = document.getElementById('mobileSignInBtn');
            if(signInBtn) signInBtn.onclick = openAuthModal;
            if(mobileSignInBtn) mobileSignInBtn.onclick = openAuthModal;
            listenNotifications(null);
            updateNotifBadge(0);
        }
    }

    let notificationUnsubscribe = null;

    function setupNotificationListener(user) {
        if (notificationUnsubscribe) { try { notificationUnsubscribe(); } catch(_) {} notificationUnsubscribe = null; }
        if (!user || !window.db) { updateNotifBadge(0); return; }
        notificationUnsubscribe = window.db.collection('notifications')
            .where('recipientId', '==', user.uid)
            .onSnapshot(snapshot => {
                let count = 0;
                snapshot.forEach(doc => {
                    const d = doc.data() || {};
                    if (d.read === false || d.read === undefined) count++;
                });
                updateNotifBadge(count);
            }, err => console.error("Notification listener error:", err));
    }

    function setupAuthListeners() {
        window.auth.onAuthStateChanged(async user => {
            if (user && window.db) {
                try {
                    const ref = window.db.collection('users').doc(user.uid);
                    const doc = await ref.get();
                    const display = user.displayName || (user.email ? user.email.split('@')[0] : 'fan');
                    const usernameLower = (display || 'fan').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'fan';
                    if (!doc.exists) {
                        await ref.set({
                            username: display,
                            usernameLower: usernameLower,
                            email: user.email || '',
                            followerCount: 0,
                            followingCount: 0,
                            createdAt: new Date().toISOString()
                        }, { merge: true });
                        localStorage.setItem('usernameLower', usernameLower);
                    } else {
                        const d = doc.data() || {};
                        let lower = (d.usernameLower || '').toString().trim();
                        if (!lower) {
                            lower = (d.username || display).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || usernameLower;
                            await ref.set({ username: d.username || display, usernameLower: lower }, { merge: true });
                        }
                        localStorage.setItem('usernameLower', lower);
                        if (d.photoURL) localStorage.setItem('photoURL', d.photoURL);
                        if (d.avatarColor) localStorage.setItem('avatarColor', d.avatarColor);
                    }
                } catch(err) { console.warn('ensure user profile', err); }
            } else if (!user) {
                localStorage.removeItem('usernameLower');
            }
            renderUserNav(user);
            setupNotificationListener(user);
        });
    }

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('userDropdown');
        const profileBtn = document.getElementById('userProfileBtn');
        if (!dropdown) return;
        if (!dropdown.contains(e.target) && (!profileBtn || !profileBtn.contains(e.target))) {
            dropdown.classList.remove('active');
        }
    });

    initFirebase();

    const modal = document.getElementById('authModalOverlay');
    const closeBtn = document.getElementById('authModalClose');
    const tabs = document.querySelectorAll('.auth-modal-tab');
    const loginForm = document.getElementById('navLoginForm');
    const registerForm = document.getElementById('navRegisterForm');
    const forgotForm = document.getElementById('navForgotForm');
    const profileForm = document.getElementById('navProfileForm');
    const authMessage = document.getElementById('navAuthMessage');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');

    function openAuthModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (tabs[0]) tabs[0].click();
    }

    function openProfileModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        forgotForm.style.display = 'none';
        profileForm.style.display = 'block';
        
        tabs.forEach(t => t.style.display = 'none');
        const profileTab = document.getElementById('navProfileTab');
        if (profileTab) profileTab.style.display = 'block';
        
        tabs.forEach(t => t.classList.remove('active'));
        if (profileTab) profileTab.classList.add('active');

        document.querySelector('.auth-modal-title').textContent = 'Account Settings';

        const user = window.auth && window.auth.currentUser;
        if (user) {
            const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
            const initial = displayName.charAt(0).toUpperCase();
            const savedColor = localStorage.getItem('avatarColor') || '#001a57';

            document.getElementById('navProfileName').value = displayName;
            document.getElementById('navAvatarColor').value = savedColor;

            const namePreview = document.getElementById('navProfileNamePreview');
            const emailPreview = document.getElementById('navProfileEmailPreview');
            const initialPreview = document.getElementById('navProfileInitialPreview');
            const avatarPreview = document.getElementById('navProfileAvatarPreview');

            if (namePreview) namePreview.textContent = displayName;
            if (emailPreview) emailPreview.textContent = user.email || '';
            if (avatarPreview) avatarPreview.style.background = savedColor;
            if (initialPreview) initialPreview.textContent = initial;

            const nameInput = document.getElementById('navProfileName');
            if (nameInput && namePreview && initialPreview) {
                nameInput.oninput = () => {
                    const val = nameInput.value || displayName;
                    namePreview.textContent = val;
                    initialPreview.textContent = val.charAt(0).toUpperCase() || initial;
                };
            }

            const avatarOpts = document.querySelectorAll('.nav-avatar-opt');
            avatarOpts.forEach(opt => {
                const isSelected = opt.dataset.color === savedColor;
                opt.style.borderColor = isSelected ? '#006BB6' : 'transparent';
                opt.style.boxShadow = isSelected ? '0 0 0 2px rgba(0,107,182,0.3)' : 'none';
                opt.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
                opt.onclick = () => {
                    avatarOpts.forEach(o => {
                        o.style.borderColor = 'transparent';
                        o.style.boxShadow = 'none';
                        o.style.transform = 'scale(1)';
                    });
                    opt.style.borderColor = '#006BB6';
                    opt.style.boxShadow = '0 0 0 2px rgba(0,107,182,0.3)';
                    opt.style.transform = 'scale(1.1)';
                    document.getElementById('navAvatarColor').value = opt.dataset.color;
                    if (avatarPreview) avatarPreview.style.background = opt.dataset.color;
                };
            });

            const picInput   = document.getElementById('navProfilePicInput');
            const picPreview = document.getElementById('navPicPreview');
            const picClear   = document.getElementById('navProfilePicClear');
            const picUrlHidden = document.getElementById('navProfilePicUrl');
            const currentPhoto = user.photoURL || localStorage.getItem('photoURL') || '';
            if (picPreview) {
                picPreview.innerHTML = currentPhoto
                    ? `<img src="${currentPhoto}" alt="">`
                    : `<span class="pic-upload-placeholder">${initial}</span>`;
                picPreview.style.background = currentPhoto ? '#0b0f1a' : savedColor;
            }
            if (picUrlHidden) picUrlHidden.value = currentPhoto;
            if (picInput) {
                const compressPic = (file, maxSide, quality) => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = reject;
                    reader.onload = () => {
                        const img = new Image();
                        img.onerror = reject;
                        img.onload = () => {
                            let w = img.width, h = img.height;
                            const scale = Math.min(1, maxSide / Math.max(w, h));
                            w = Math.round(w * scale); h = Math.round(h * scale);
                            const canvas = document.createElement('canvas');
                            canvas.width = w; canvas.height = h;
                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                            resolve(canvas.toDataURL('image/jpeg', quality));
                        };
                        img.src = reader.result;
                    };
                    reader.readAsDataURL(file);
                });

                picInput.onchange = async (ev) => {
                    const file = ev.target.files && ev.target.files[0];
                    if (!file) return;
                    if (!file.type || !file.type.startsWith('image/')) {
                        showNavMessage('Please choose an image file.', 'error');
                        return;
                    }
                    if (file.size > 8 * 1024 * 1024) {
                        showNavMessage('Image must be under 8 MB.', 'error');
                        return;
                    }
                    try {
                        showNavMessage('Processing photo…', 'success');
                        let url = await compressPic(file, 400, 0.7);
                        if (url.length > 700000) url = await compressPic(file, 280, 0.55);
                        if (url.length > 900000) {
                            showNavMessage('Image still too large after compression. Try a smaller photo.', 'error');
                            return;
                        }
                        if (picUrlHidden) picUrlHidden.value = url;
                        if (picPreview) {
                            picPreview.innerHTML = `<img src="${url}" alt="">`;
                            picPreview.style.background = '#0b0f1a';
                        }
                        if (avatarPreview) {
                            avatarPreview.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                        }
                        showNavMessage('Photo ready. Hit Save Changes to keep it.', 'success');
                    } catch (err) {
                        console.error(err);
                        showNavMessage('Could not process photo: ' + (err.message || err), 'error');
                    }
                };
            }
            if (picClear) {
                picClear.onclick = () => {
                    if (picUrlHidden) picUrlHidden.value = '';
                    if (picPreview) {
                        picPreview.innerHTML = `<span class="pic-upload-placeholder">${initial}</span>`;
                        picPreview.style.background = savedColor;
                    }
                    if (avatarPreview) {
                        avatarPreview.innerHTML = `<span id="navProfileInitialPreview">${initial}</span>`;
                        avatarPreview.style.background = savedColor;
                    }
                };
            }
        }
    }

    function formatTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            if (isNaN(date.getTime())) return 'Just now';
            const seconds = Math.floor((new Date() - date) / 1000);
            
            if (seconds < 60) return "just now";
            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + "y";
            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + "mo";
            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + "d";
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + "h";
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + "m";
            return Math.floor(seconds) + "s";
        } catch (e) {
            return 'Just now';
        }
    }

    async function loadNotifications() {
        const list = document.getElementById('dropdown-notifications-list');
        const user = (window.auth && window.auth.currentUser) ? window.auth.currentUser : null;
        if (!list || !user) return;

        if (!window.db) {
            console.warn("Firestore not initialized yet");
            setTimeout(loadNotifications, 500);
            return;
        }

        try {
            let snapshot;
            try {
                snapshot = await window.db.collection('notifications')
                    .where('recipientId', '==', user.uid)
                    .orderBy('createdAt', 'desc')
                    .limit(20)
                    .get();
            } catch (qErr) {
                console.warn("Ordered notifications query failed, trying simple query", qErr);
                snapshot = await window.db.collection('notifications')
                    .where('recipientId', '==', user.uid)
                    .limit(20)
                    .get();
            }

            if (!snapshot) throw new Error("Failed to retrieve snapshot");

            const markAllBtn = document.getElementById('markAllReadBtn');
            if (markAllBtn) {
                markAllBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const unreadDocs = snapshot.docs.filter(doc => !doc.data().read);
                    if (unreadDocs.length === 0) return;
                    
                    try {
                        const batch = window.db.batch();
                        unreadDocs.forEach(doc => {
                            batch.update(doc.ref, { read: true });
                        });
                        await batch.commit();
                        loadNotifications();
                    } catch (batchErr) {
                        console.error("Error marking all as read:", batchErr);
                    }
                };
            }

            if (snapshot.empty) {
                list.innerHTML = `
                    <div class="text-center py-10 text-slate-400">
                        <p class="text-[11px]">Your inbox is empty</p>
                    </div>
                `;
                return;
            }

            const docs = [...snapshot.docs];
            docs.sort((a, b) => {
                const getVal = (doc) => {
                    const d = doc.data().createdAt;
                    if (!d) return 0;
                    if (d.toDate) return d.toDate().getTime();
                    if (d.seconds) return d.seconds * 1000;
                    try {
                        const parsed = new Date(d).getTime();
                        return isNaN(parsed) ? 0 : parsed;
                    } catch(e) { return 0; }
                };
                return getVal(b) - getVal(a);
            });

            list.innerHTML = docs.map(doc => {
                const data = doc.data();
                const timeStr = formatTimeAgo(data.createdAt);
                
                return `
                    <div class="notification-item ${!data.read ? 'unread' : ''}" onclick="handleNotificationClick('${data.postId}', '${doc.id}', event)">
                        <div class="flex gap-3">
                            <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">${(data.senderName || 'S').charAt(0).toUpperCase()}</div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[11px] text-slate-900 leading-tight">
                                    <span class="font-bold">${data.senderName || 'Someone'}</span> 
                                    ${data.type === 'reply' ? 'replied to your comment' : 'commented on your post'}
                                </p>
                                <p class="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">"${data.text || ''}"</p>
                                <p class="text-[9px] text-slate-400 mt-1">${timeStr}</p>
                            </div>
                            ${!data.read ? '<div class="h-1.5 w-1.5 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (err) {
            console.error("Detailed error loading notifications:", err);
            list.innerHTML = `
                <div class="p-6 text-center text-[10px] text-slate-400">
                    <p>Unable to load notifications.</p>
                    <p class="mt-1 opacity-50">${err.code || 'Check connection or permissions'}</p>
                </div>
            `;
        }
    }

    window.handleNotificationClick = async (postId, notificationId, event) => {
        if (event) event.stopPropagation();
        try {
            await window.db.collection('notifications').doc(notificationId).update({ read: true });
            
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) dropdown.classList.remove('active');

            if (window.location.pathname.includes('community') || document.getElementById('community-feed-section')) {
                if (window.CommunityFeed && typeof window.CommunityFeed.openDetailedView === 'function') {
                    window.CommunityFeed.openDetailedView(postId);
                } else {
                    window.location.href = `/?post=${postId}`;
                }
            } else {
                window.location.href = `/?post=${postId}`;
            }
        } catch (err) {
            console.error("Error handling notification click:", err);
            window.location.href = `/?post=${postId}`;
        }
    };

    function closeAuthModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        authMessage.className = 'auth-message';
        authMessage.textContent = '';
        document.querySelector('.auth-modal-title').textContent = 'Sixers Hoops';
        tabs.forEach(t => t.style.display = 'block');
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        if (forgotForm) forgotForm.reset();
        if (profileForm) profileForm.reset();
    }

    if(closeBtn) closeBtn.addEventListener('click', closeAuthModal);
    if(modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAuthModal();
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.dataset.tab;
            if (tabName === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                forgotForm.style.display = 'none';
                profileForm.style.display = 'none';
            } else if (tabName === 'register') {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                forgotForm.style.display = 'none';
                profileForm.style.display = 'none';
            } else if (tabName === 'profile') {
                loginForm.style.display = 'none';
                registerForm.style.display = 'none';
                forgotForm.style.display = 'none';
                profileForm.style.display = 'block';
            }
        });
    });

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            forgotForm.style.display = 'block';
            profileForm.style.display = 'none';
            tabs.forEach(t => t.classList.remove('active'));
        });
    }

    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (tabs[0]) tabs[0].click();
        });
    }

    function showNavMessage(msg, type) {
        authMessage.textContent = msg;
        authMessage.className = `auth-message show ${type}`;
    }

    if(loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('navLoginEmail').value;
        const password = document.getElementById('navLoginPassword').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            closeAuthModal();
        } catch (err) {
            showNavMessage(err.message, 'error');
        }
    });

    // Google Sign-In / Sign-Up
    async function handleGoogleSignIn() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            const userDb = window.db;
            if (userDb) {
                const userRef = userDb.collection('users').doc(user.uid);
                const snap = await userRef.get();
                if (!snap.exists) {
                    const displayName = (user.displayName || (user.email ? user.email.split('@')[0] : 'User')).substring(0, 12);
                    const usernameLower = displayName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
                    await userRef.set({
                        username: displayName,
                        usernameLower: usernameLower,
                        email: user.email || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        photoURL: user.photoURL || null
                    });
                    localStorage.setItem('usernameLower', usernameLower);
                }
            }
            closeAuthModal();
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                showNavMessage(err.message || 'Google sign-in failed', 'error');
            }
        }
    }

    document.getElementById('navGoogleSignInBtn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('navGoogleSignUpBtn')?.addEventListener('click', handleGoogleSignIn);

    if(forgotForm) forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('navForgotEmail').value;
        
        try {
            await auth.sendPasswordResetEmail(email);
            showNavMessage('Password reset email sent! Check your inbox.', 'success');
            setTimeout(() => {
                if (tabs[0]) tabs[0].click();
            }, 3000);
        } catch (err) {
            showNavMessage(err.message, 'error');
        }
    });

    if(profileForm) profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('navProfileName').value;
        const avatarColor = document.getElementById('navAvatarColor').value;

        if (name.length > 12) {
            showNavMessage('Username must be 12 characters or less', 'error');
            return;
        }

        const submitBtn = profileForm.querySelector('.auth-submit-btn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

        try {
            const user = window.auth && window.auth.currentUser;
            if (!user) throw new Error('Please sign in again.');
            const photoURL = (document.getElementById('navProfilePicUrl') || {}).value || '';
            try { await user.updateProfile({ displayName: name }); } catch (ae) { console.warn(ae); }
            if (avatarColor) localStorage.setItem('avatarColor', avatarColor);
            if (photoURL) localStorage.setItem('photoURL', photoURL);
            else localStorage.removeItem('photoURL');

            const usernameLower = (name || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
            localStorage.setItem('usernameLower', usernameLower);
            if (!window.db) throw new Error('Database not ready. Refresh the page and try again.');
            await window.db.collection('users').doc(user.uid).set({
                username: name,
                usernameLower: usernameLower,
                avatarColor: avatarColor || '#001a57',
                photoURL: photoURL || null,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            try { await user.reload(); } catch (_) {}
            renderUserNav(window.auth.currentUser);
            showNavMessage('Settings saved successfully!', 'success');
            setTimeout(closeAuthModal, 1800);
        } catch (err) {
            showNavMessage(err.message || String(err), 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Changes'; }
        }
    });

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const user = window.auth.currentUser;
            if (!user) return;

            const confirmDelete = confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and you will lose all your Pick\'em progress.');
            
            if (confirmDelete) {
                try {
                    await window.db.collection('users').doc(user.uid).delete().catch(() => {});
                    await user.delete();
                    showNavMessage('Account deleted successfully.', 'success');
                    setTimeout(closeAuthModal, 2000);
                } catch (err) {
                    if (err.code === 'auth/requires-recent-login') {
                        showNavMessage('For security, please sign out and sign back in before deleting your account.', 'error');
                    } else {
                        showNavMessage(err.message, 'error');
                    }
                }
            }
        });
    }

    if(registerForm) registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('navRegisterUsername').value;
        const email = document.getElementById('navRegisterEmail').value;
        const password = document.getElementById('navRegisterPassword').value;
        const confirm = document.getElementById('navRegisterConfirm').value;
        
        if (password !== confirm) {
            showNavMessage('Passwords do not match', 'error');
            return;
        }
        
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await user.updateProfile({ displayName: username });
            
            const userDb = window.db || db;
            if (!userDb) throw new Error('Database not ready. Try again.');
            const usernameLower = (username || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
            localStorage.setItem('usernameLower', usernameLower);
            await userDb.collection('users').doc(user.uid).set({
                username: username,
                usernameLower: usernameLower,
                email: email,
                followerCount: 0,
                followingCount: 0,
                createdAt: new Date().toISOString()
            }, { merge: true });

            await user.reload();
            renderUserNav(window.auth.currentUser);

            showNavMessage('Account created! Settings updated.', 'success');
            setTimeout(closeAuthModal, 1500);
        } catch (err) {
            showNavMessage(err.message, 'error');
        }
    });

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const open = mobileMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active', open);
            document.body.style.overflow = open ? 'hidden' : '';
        });

        document.addEventListener('click', function(e) {
            if (!mobileMenu.classList.contains('active')) return;
            if (mobileMenu.contains(e.target) || mobileMenuBtn.contains(e.target)) return;
            mobileMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    const currentLocation = location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href === currentLocation || 
            (currentLocation === '/' && href === '/')) {
            link.classList.add('active');
        }
        if (link.getAttribute('data-nav') === 'community') {
            if (currentLocation.indexOf('/trade') === 0 ||
                currentLocation.indexOf('/trades') === 0 ||
                currentLocation.indexOf('trade.html') >= 0 ||
                currentLocation.indexOf('trades.html') >= 0 ||
                currentLocation.indexOf('user-profile') >= 0 ||
                currentLocation.indexOf('moderation') >= 0) {
                link.classList.add('active');
            }
        }
    });

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    function getTheme() {
        if (htmlElement.classList.contains('navy-mode')) return 'navy';
        if (htmlElement.classList.contains('dark-mode')) return 'dark';
        return 'light';
    }

    function applyTheme(theme) {
        htmlElement.classList.remove('dark-mode', 'navy-mode');
        if (theme === 'dark') {
            htmlElement.classList.add('dark-mode');
            htmlElement.style.colorScheme = 'dark';
        } else if (theme === 'navy') {
            htmlElement.classList.add('navy-mode');
            htmlElement.style.colorScheme = 'dark';
        } else {
            htmlElement.style.colorScheme = 'light';
            theme = 'light';
        }
        try { localStorage.setItem('theme', theme); } catch (_) {}
        syncThemeIcons();
    }

    function syncThemeIcons() {
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        const navyIcon = document.querySelector('.navy-icon');
        const theme = getTheme();
        if (sunIcon) sunIcon.style.display = theme === 'light' ? 'block' : 'none';
        if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
        if (navyIcon) navyIcon.style.display = theme === 'navy' ? 'block' : 'none';
        if (themeToggle) {
            themeToggle.setAttribute('title',
                theme === 'light' ? 'Theme: Light (click for Dark)' :
                theme === 'dark' ? 'Theme: Dark (click for Navy)' :
                'Theme: Navy (click for Light)');
        }
    }

    var savedTheme = 'light';
    try { savedTheme = localStorage.getItem('theme') || 'light'; } catch (_) {}
    applyTheme(savedTheme);

    if (themeToggle) themeToggle.addEventListener('click', function() {
        var cur = getTheme();
        var next = cur === 'light' ? 'dark' : (cur === 'dark' ? 'navy' : 'light');
        applyTheme(next);
    });
});


document.addEventListener('click', function(e) {
    const tgt = e.target.closest('.auth-pw-toggle');
    if (tgt) {
        const id = tgt.getAttribute('data-target');
        const input = document.getElementById(id);
        if (input) {
            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            tgt.classList.toggle('is-on', !showing);
        }
        return;
    }
    const sw = e.target.closest('[data-tab-switch]');
    if (sw) {
        e.preventDefault();
        const which = sw.getAttribute('data-tab-switch');
        const tabBtn = document.querySelector('.auth-modal-tab[data-tab="' + which + '"]');
        if (tabBtn) tabBtn.click();
    }
});


(function () {
  var TM_DRAFTS_KEY = 'sixershoops_trade_drafts_v1';
  var TM_DRAFT_KEY = 'sixershoops_trade_post_draft_v1';

  function getDrafts() {
    try {
      var list = JSON.parse(localStorage.getItem(TM_DRAFTS_KEY) || '[]');
      if (!Array.isArray(list)) list = [];
      try {
        var legacy = localStorage.getItem(TM_DRAFT_KEY);
        if (legacy) {
          var one = JSON.parse(legacy);
          if (one && (one.machineHash || one.title)) {
            list.unshift({
              id: 'd' + Date.now().toString(36),
              title: one.title || 'Untitled draft',
              notes: one.notes || '',
              machineHash: one.machineHash || '',
              teamAbbrs: one.teamAbbrs || [],
              updatedAt: one.updatedAt || Date.now()
            });
            localStorage.setItem(TM_DRAFTS_KEY, JSON.stringify(list));
            localStorage.removeItem(TM_DRAFT_KEY);
          }
        }
      } catch (_) {}
      return list;
    } catch (e) { return []; }
  }
  function setDrafts(list) {
    try { localStorage.setItem(TM_DRAFTS_KEY, JSON.stringify((list || []).slice(0, 25))); } catch (_) {}
  }
  function timeLabel(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    if (sec < 604800) return Math.floor(sec / 86400) + 'd ago';
    return d.toLocaleDateString();
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeGlobalDraftsPanel() {
    var ov = document.getElementById('globalDraftsOverlay');
    if (ov) ov.style.display = 'none';
    try { document.body.style.overflow = ''; } catch (_) {}
  }

  function renderGlobalDraftsList() {
    var body = document.getElementById('globalDraftsBody');
    if (!body) return;
    var list = getDrafts();
    if (!list.length) {
      body.innerHTML = '<div style="padding:2rem 1.25rem;text-align:center;color:#64748b;font-size:.9rem;font-weight:500;">No saved drafts yet. Build a trade and hit Save Draft.</div>';
      return;
    }
    body.innerHTML = list.map(function (d) {
      var teams = (d.teamAbbrs || []).join(' · ');
      return '<div style="display:flex;gap:.75rem;align-items:flex-start;padding:.9rem 1.15rem;border-bottom:1px solid #f1f5f9;">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:800;font-size:.95rem;color:#0f172a;margin-bottom:.2rem;">' + esc(d.title || 'Untitled draft') + '</div>' +
        '<div style="font-size:.75rem;color:#64748b;font-weight:500;">' + esc(teams || 'No teams') +
        (d.updatedAt ? ' · ' + esc(timeLabel(d.updatedAt)) : '') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:.4rem;flex-shrink:0;">' +
        '<button type="button" class="g-draft-open" data-id="' + esc(d.id) + '" style="border:none;background:#006BB6;color:#fff;font-weight:700;font-size:.75rem;padding:.4rem .75rem;border-radius:8px;cursor:pointer;font-family:inherit;">Open</button>' +
        '<button type="button" class="g-draft-del" data-id="' + esc(d.id) + '" style="border:1px solid #fecaca;background:#fff;color:#dc2626;font-weight:700;font-size:.75rem;padding:.4rem .65rem;border-radius:8px;cursor:pointer;font-family:inherit;">Delete</button>' +
        '</div></div>';
    }).join('');

    body.querySelectorAll('.g-draft-open').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        location.href = '/nba-trade-machine.html#draft=' + encodeURIComponent(id);
      };
    });
    body.querySelectorAll('.g-draft-del').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var list = getDrafts();
        var d = list.find(function (x) { return x.id === id; });
        var title = d ? (d.title || 'this draft') : 'this draft';
        if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
        setDrafts(list.filter(function (x) { return x.id !== id; }));
        renderGlobalDraftsList();
      };
    });
  }

  window.openGlobalDraftsPanel = function () {
    if (typeof window.__tmOpenTradeDrafts === 'function' && /nba-trade-machine\.html/i.test(location.pathname || '')) {
      window.__tmOpenTradeDrafts();
      return;
    }
    if (/nba-trade-machine\.html/i.test(location.pathname || '') && window.__onTradeMachineDrafts) {
      window.__onTradeMachineDrafts();
      return;
    }
    var ov = document.getElementById('globalDraftsOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'globalDraftsOverlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10050;display:none;align-items:center;justify-content:center;padding:1rem;';
      ov.innerHTML =
        '<div style="background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:min(80vh,640px);overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.25);display:flex;flex-direction:column;font-family:Lexend,system-ui,sans-serif;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.15rem;border-bottom:1px solid #e2e8f0;">' +
        '<div style="font-weight:800;font-size:1.05rem;color:#0f172a;">View Drafts</div>' +
        '<button type="button" id="globalDraftsClose" style="border:none;background:transparent;font-size:1.35rem;cursor:pointer;color:#64748b;line-height:1;">×</button>' +
        '</div>' +
        '<div id="globalDraftsBody" style="overflow:auto;flex:1;"></div>' +
        '</div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function (e) { if (e.target === ov) closeGlobalDraftsPanel(); });
      document.getElementById('globalDraftsClose').onclick = closeGlobalDraftsPanel;
    }
    ov.style.display = 'flex';
    try { document.body.style.overflow = 'hidden'; } catch (_) {}
    renderGlobalDraftsList();
  };

  if (typeof window.openTradeDrafts !== 'function') {
    window.openTradeDrafts = window.openGlobalDraftsPanel;
  } else {
    var _existing = window.openTradeDrafts;
    window.openTradeDrafts = function () {
      if (/nba-trade-machine\.html/i.test(location.pathname || '')) return _existing();
      return window.openGlobalDraftsPanel();
    };
  }
})();
