/**
 * Açaí Prime - Auth JavaScript
 * auth.js - Gerencia autenticação e cadastro
 */

// ==================== ESTADO ====================
let currentUser = null;
let saasManager = null;

function buildSessionFromFirebaseUser(user, extras = {}) {
    return {
        id: user.uid,
        name: user.displayName || user.email || 'Usuário Açaí',
        email: user.email || '',
        provider: user.providerData?.[0]?.providerId || 'firebase',
        loginAt: new Date().toISOString(),
        lastAuthSync: new Date().toISOString(),
        ...extras
    };
}

function setCurrentSession(user, extras = {}) {
    const session = buildSessionFromFirebaseUser(user, extras);
    currentUser = session;
    localStorage.setItem('acai_current_session', JSON.stringify(session));
    return session;
}

function initializeAuthState() {
    if (localStorage.getItem('acai_current_session')) {
        return;
    }

    if (window.firebaseAuth && window.firebaseOnAuthStateChanged) {
        window.firebaseOnAuthStateChanged(window.firebaseAuth, user => {
            if (user) {
                setCurrentSession(user, { isPersistent: true });
                window.location.href = 'index.html';
            }
        });
    }
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    saasManager = new SAASManager();
    checkExistingSession();
    setupEventListeners();
});

// Verificar sessão existente
function checkExistingSession() {
    const session = localStorage.getItem('acai_current_session');
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    if (window.firebaseAuth && window.firebaseOnAuthStateChanged) {
        window.firebaseOnAuthStateChanged(window.firebaseAuth, user => {
            if (user) {
                setCurrentSession(user, { isPersistent: true });
                window.location.href = 'index.html';
            }
        });
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Tabs de autenticação
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchAuthTab(tabName);
        });
    });

    // Formulário de login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Formulário de cadastro
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Botão Google
    document.querySelector('.btn-social.google').addEventListener('click', handleGoogleLogin);
}

// ==================== AUTENTICAÇÃO ====================
function switchAuthTab(tabName) {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    if (tabName === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;

    if (!email || !password) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }

    try {
        // Tentar Firebase Auth
        if (window.firebaseSignIn) {
            const userCredential = await window.firebaseSignIn(window.firebaseAuth, email, password);
            const user = userCredential.user;

            // Criar sessão
            currentUser = setCurrentSession(user, { plan: 'firebase' });

            // Log access
            const accessLogs = JSON.parse(localStorage.getItem('acai_access_logs') || '[]');
            const isFirstAccess = accessLogs.length === 0;
            accessLogs.push({
                user: currentUser.email,
                timestamp: new Date().toISOString(),
                type: isFirstAccess ? 'first_access' : 'login'
            });
            localStorage.setItem('acai_access_logs', JSON.stringify(accessLogs));

            showToast('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showToast('Firebase não carregado. Verifique a inicialização do Firebase.', 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showToast('Erro no login: ' + error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const companyName = document.getElementById('companyName').value;
    const userName = document.getElementById('userName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const plan = document.querySelector('input[name="plan"]:checked')?.value || 'free';

    if (!companyName || !userName || !email || !phone || !password) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }

    try {
        // Tentar Firebase Auth
        if (window.firebaseSignUp) {
            const userCredential = await window.firebaseSignUp(window.firebaseAuth, email, password);
            const user = userCredential.user;

            // Atualizar display name
            if (window.firebaseUpdateProfile) {
                await window.firebaseUpdateProfile(user, {
                    displayName: userName
                });
            }

            // Criar sessão
            currentUser = setCurrentSession(user, {
                companyName: companyName,
                phone: phone,
                plan: plan,
                createdAt: new Date().toISOString()
            });

            // Log access
            const accessLogs = JSON.parse(localStorage.getItem('acai_access_logs') || '[]');
            const isFirstAccess = accessLogs.length === 0;
            accessLogs.push({
                user: currentUser.email,
                timestamp: new Date().toISOString(),
                type: 'register'
            });
            localStorage.setItem('acai_access_logs', JSON.stringify(accessLogs));

            showToast('Conta criada com sucesso!', 'success');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showToast('Firebase não carregado. Verifique a inicialização do Firebase.', 'error');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        showToast('Erro no cadastro: ' + error.message, 'error');
    }
}

async function handleGoogleLogin() {
    try {
        console.log('Iniciando login com Google...');
        console.log('Firebase disponível:', !!window.firebaseSignInWithGoogle);
        console.log('Firebase Auth:', !!window.firebaseAuth);

        if (!window.firebaseSignInWithGoogle) {
            throw new Error('Firebase Google Sign-In não está carregado');
        }

        if (!window.firebaseAuth) {
            throw new Error('Firebase Auth não está inicializado');
        }

        const result = await window.firebaseSignInWithGoogle();
        console.log('Resultado do login Google:', result);

        const user = result.user;
        console.log('Usuário autenticado:', user);

        // Criar sessão
        currentUser = setCurrentSession(user, { plan: 'firebase-google' });
        console.log('Sessão criada:', currentUser);

        // Log access
        const accessLogs = JSON.parse(localStorage.getItem('acai_access_logs') || '[]');
        const isFirstAccess = accessLogs.length === 0;
        accessLogs.push({
            user: currentUser.email,
            timestamp: new Date().toISOString(),
            type: 'google-login'
        });
        localStorage.setItem('acai_access_logs', JSON.stringify(accessLogs));

        showToast('Login com Google realizado!', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Erro completo no login Google:', error);
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);

        let errorMessage = 'Erro no login Google: ' + error.message;

        // Tratamento específico de erros comuns
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelado pelo usuário';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Popup bloqueado pelo navegador. Permita popups para este site.';
        } else if (error.code === 'auth/configuration-not-found') {
            errorMessage = 'Configuração do Google Sign-In não encontrada. Verifique se está habilitado no Firebase Console.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Google Sign-In não está habilitado. Vá para Firebase Console > Authentication > Sign-in method e habilite Google.';
        } else if (error.code === 'auth/invalid-api-key') {
            errorMessage = 'Chave da API inválida. Verifique a configuração do Firebase.';
        }

        showToast(errorMessage, 'error');
    }
}

// ==================== UTILITÁRIOS ====================
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? 'var(--error)' : 'var(--success)'};
        color: white;
        padding: 16px 32px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 1000;
        animation: fadeInUp 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Adicionar animação
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Função de logout
function logout() {
    localStorage.removeItem('acai_current_session');
    localStorage.removeItem('acai_current_company');
    window.location.href = 'auth.html';
}

// Verificar sessão
function checkSession() {
    const session = localStorage.getItem('acai_current_session');
    if (!session) {
        window.location.href = 'auth.html';
        return null;
    }
    return JSON.parse(session);
}

// Obter empresa atual
function getCurrentCompany() {
    const companyId = localStorage.getItem('acai_current_company');
    if (!companyId) return null;
    return saasManager.getCompany(companyId);
}