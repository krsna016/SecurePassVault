// Elements
const loginScreen = document.getElementById('login-screen');
const vaultScreen = document.getElementById('vault-screen');
const masterPwdInput = document.getElementById('master-password');
const unlockBtn = document.getElementById('unlock-btn');
const lockBtn = document.getElementById('lock-btn');
const resetVaultBtn = document.getElementById('reset-vault-btn');

const modalOverlay = document.getElementById('modal-overlay');
const addNewBtn = document.getElementById('add-new-btn');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const generatePwdBtn = document.getElementById('generate-pwd-btn');
const searchInput = document.getElementById('search-input');
const passwordList = document.getElementById('password-list');

const entryPlatform = document.getElementById('entry-platform');
const entryUsername = document.getElementById('entry-username');
const entryPassword = document.getElementById('entry-password');

// State
let masterKey = null; 
let vaultData = [];

// ==========================================
// Cryptography Engine (Web Crypto API)
// ==========================================

// Derive a strong AES-GCM key from the master password using PBKDF2
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptData(data, key) {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipher = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(JSON.stringify(data))
    );
    return {
        iv: Array.from(iv),
        cipher: Array.from(new Uint8Array(cipher))
    };
}

async function decryptData(encryptedObj, key) {
    try {
        const iv = new Uint8Array(encryptedObj.iv);
        const cipher = new Uint8Array(encryptedObj.cipher);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            cipher
        );
        const dec = new TextDecoder();
        return JSON.parse(dec.decode(decrypted));
    } catch (e) {
        throw new Error("Invalid Master Password");
    }
}

// ==========================================
// Core Logic
// ==========================================

// Attempt to unlock vault
unlockBtn.addEventListener('click', async () => {
    const pwd = masterPwdInput.value;
    if (!pwd) return;

    try {
        let storedData = localStorage.getItem('SecurePassData');
        
        if (!storedData) {
            // First time setup
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            masterKey = await deriveKey(pwd, salt);
            vaultData = [];
            await saveVault(salt);
        } else {
            // Existing vault
            const parsed = JSON.parse(storedData);
            const salt = new Uint8Array(parsed.salt);
            masterKey = await deriveKey(pwd, salt);
            if (parsed.encryptedObj.cipher.length > 0) {
                vaultData = await decryptData(parsed.encryptedObj, masterKey);
            } else {
                vaultData = [];
            }
        }
        
        // Success
        masterPwdInput.value = '';
        loginScreen.classList.remove('active');
        vaultScreen.classList.add('active');
        renderVault();
    } catch (e) {
        masterPwdInput.style.borderColor = 'var(--danger)';
        setTimeout(() => masterPwdInput.style.borderColor = 'var(--border-glass)', 1000);
        masterPwdInput.value = '';
        masterPwdInput.placeholder = 'Wrong Password!';
    }
});

async function saveVault(saltArray) {
    let salt = saltArray;
    if (!salt) {
        const storedData = JSON.parse(localStorage.getItem('SecurePassData'));
        salt = new Uint8Array(storedData.salt);
    }
    const encryptedObj = await encryptData(vaultData, masterKey);
    const dataToStore = {
        salt: Array.from(salt),
        encryptedObj: encryptedObj
    };
    localStorage.setItem('SecurePassData', JSON.stringify(dataToStore));
}

// Lock vault
lockBtn.addEventListener('click', () => {
    masterKey = null;
    vaultData = [];
    passwordList.innerHTML = '';
    vaultScreen.classList.remove('active');
    loginScreen.classList.add('active');
});

// Factory Reset Vault
resetVaultBtn.addEventListener('click', () => {
    if (confirm("WARNING: This will permanently delete your entire encrypted vault. This action cannot be undone. Are you absolutely sure?")) {
        localStorage.removeItem('SecurePassData');
        masterPwdInput.value = '';
        masterPwdInput.placeholder = 'Vault Erased. Enter a new password.';
        alert("Your vault has been factory reset. You may now create a new master password.");
    }
});

// ==========================================
// UI & CRUD Logic
// ==========================================

function renderVault(filter = '') {
    passwordList.innerHTML = '';
    
    if (vaultData.length === 0) {
        passwordList.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:2rem;">Your vault is empty. Add a credential.</p>';
        return;
    }

    const filtered = vaultData.filter(item => item.platform.toLowerCase().includes(filter.toLowerCase()));
    
    filtered.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'credential-card';
        card.innerHTML = `
            <div class="cred-info">
                <h4>${item.platform}</h4>
                <p>${item.username}</p>
            </div>
            <div class="cred-actions">
                <button class="secondary-btn small-btn" onclick="copyPassword(${index})">Copy</button>
                <button class="text-btn" style="color:var(--danger)" onclick="deleteItem(${index})">Delete</button>
            </div>
        `;
        passwordList.appendChild(card);
    });
}

addNewBtn.addEventListener('click', () => {
    entryPlatform.value = '';
    entryUsername.value = '';
    entryPassword.value = '';
    modalOverlay.classList.remove('hidden');
});

cancelBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

saveBtn.addEventListener('click', async () => {
    if (!entryPlatform.value || !entryPassword.value) return;
    
    vaultData.push({
        platform: entryPlatform.value,
        username: entryUsername.value,
        password: entryPassword.value
    });
    
    await saveVault();
    renderVault();
    modalOverlay.classList.add('hidden');
});

generatePwdBtn.addEventListener('click', () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pwd = "";
    const randomArray = new Uint32Array(16);
    window.crypto.getRandomValues(randomArray);
    for (let i = 0; i < 16; i++) {
        pwd += chars[randomArray[i] % chars.length];
    }
    entryPassword.value = pwd;
});

searchInput.addEventListener('input', (e) => {
    renderVault(e.target.value);
});

// Global functions for inline HTML event handlers
window.copyPassword = (index) => {
    navigator.clipboard.writeText(vaultData[index].password);
    const btn = event.target;
    btn.innerText = 'Copied!';
    setTimeout(() => btn.innerText = 'Copy', 1500);
};

window.deleteItem = async (index) => {
    vaultData.splice(index, 1);
    await saveVault();
    renderVault();
};
