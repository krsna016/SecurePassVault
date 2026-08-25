# SecurePass Vault

SecurePass Vault is a small browser-based credential vault that stores its
data locally. It derives an AES-256-GCM encryption key from a master password
with PBKDF2, encrypts the vault with a fresh IV, and stores the encrypted JSON
in browser `localStorage`.

## Features

- Create and unlock a local encrypted vault.
- Add, search, copy, and delete credentials.
- Generate random passwords with the Web Crypto API.
- Lock the vault by clearing the in-memory key and data.
- Factory-reset the local vault.

## Run locally

This is a static application. Open `index.html` in a modern browser, or serve
the directory with any local static server:

```bash
python3 -m http.server 8000
```

Then visit <http://127.0.0.1:8000>.

## Important security limitations

This project is a local demo, not a security-audited password manager. Data is
stored in browser `localStorage`, and the application has no sync, recovery,
backup, account, or tamper-detection system. A forgotten master password cannot
recover the vault. Do not use it for credentials whose loss or exposure would
cause serious harm without independently reviewing the implementation.

Never host this application on an untrusted origin or paste real credentials
into a modified copy.

## License

No license has been declared for this repository yet.
