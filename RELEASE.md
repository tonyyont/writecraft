# WriteCraft Release Guide

This guide walks you through releasing a new version of WriteCraft.

## Prerequisites

Before your first release, complete these one-time setup steps:

### 1. Generate Updater Signing Keys

The auto-updater needs a signing keypair to verify updates are authentic.

```bash
npx @tauri-apps/cli signer generate -w ~/.tauri/writecraft.key
```

This will:
- Prompt you for a password (remember this!)
- Save the private key to `~/.tauri/writecraft.key`
- Output a public key - copy this!

### 2. Add the Public Key to tauri.conf.json

Replace `REPLACE_WITH_YOUR_PUBLIC_KEY` in `src-tauri/tauri.conf.json` with your actual public key:

```json
"plugins": {
  "updater": {
    "endpoints": [
      "https://github.com/tonyyont/writecraft/releases/latest/download/latest.json"
    ],
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6..."
  }
}
```

### 3. Store Credentials Securely

For the release build, you'll need these environment variables:

```bash
# Apple notarization
export APPLE_ID="tonyysheng@gmail.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password

# Tauri update signing
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/writecraft.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-key-password"
```

**Security tip**: Consider storing these in a `.env.release` file (already gitignored) or use a secrets manager.

---

## Release Process

### Step 1: Update Version Number

Edit `src-tauri/tauri.conf.json`:
```json
"version": "0.2.0"
```

Also update `package.json` if you want them in sync.

### Step 2: Build the Frontend and Backend

```bash
npm run build
cd src-tauri && cargo build --release && cd ..
```

### Step 3: Run the Bundle Script

```bash
# Set environment variables first (see Prerequisites)
./bundle-macos.sh
```

This creates:
- `src-tauri/target/release/bundle/macos/WriteCraft-0.2.0.dmg` - For new users
- `src-tauri/target/release/bundle/macos/WriteCraft.app.tar.gz` - For auto-updates
- `src-tauri/target/release/bundle/macos/latest.json` - Update manifest

### Step 4: Create GitHub Release

1. Go to https://github.com/tonyyont/writecraft/releases/new

2. Create a new tag: `v0.2.0`

3. Set the release title: `WriteCraft v0.2.0`

4. Write release notes describing what's new

5. Upload these files:
   - `WriteCraft-0.2.0.dmg`
   - `WriteCraft.app.tar.gz`
   - `latest.json`

6. Publish the release!

---

## How Auto-Updates Work

1. When users click "Check for Updates" (or on app launch), the app fetches:
   ```
   https://github.com/tonyyont/writecraft/releases/latest/download/latest.json
   ```

2. The `latest.json` contains the version number and download URLs

3. If a newer version exists, the user is prompted to update

4. The update is downloaded, signature verified (using your public key), and installed

5. The app relaunches with the new version

---

## Troubleshooting

### "Invalid signature" errors
- Make sure you're using the same keypair for signing that matches the pubkey in the config
- The password must match when signing

### Notarization fails
- Regenerate your app-specific password if it's been revoked
- Make sure your Developer ID certificate is valid

### Users get Gatekeeper warnings
- The app may not be properly notarized
- Run `spctl --assess --verbose /path/to/WriteCraft.app` to check

---

## Quick Release Checklist

- [ ] Update version in `tauri.conf.json`
- [ ] Build frontend: `npm run build`
- [ ] Build Rust: `cd src-tauri && cargo build --release`
- [ ] Set environment variables
- [ ] Run `./bundle-macos.sh`
- [ ] Create GitHub release with tag `vX.Y.Z`
- [ ] Upload DMG, tar.gz, and latest.json
- [ ] Test the update on a machine with the old version
