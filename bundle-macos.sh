#!/bin/bash
set -e

# Load environment variables from .env.release if it exists
if [ -f ".env.release" ]; then
    echo "📋 Loading credentials from .env.release..."
    export $(grep -v '^#' .env.release | xargs)
    # Load the signing key separately since it's a file path
    export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/writecraft.key)"
fi

# Configuration
APP_NAME="WriteCraft"
BUNDLE_ID="com.writecraft.app"
SIGNING_IDENTITY="Developer ID Application: Tony Sheng (MN84M3F6WZ)"
TEAM_ID="MN84M3F6WZ"
BUNDLE_DIR="src-tauri/target/release/bundle/macos"
APP_BUNDLE="$BUNDLE_DIR/$APP_NAME.app"
ENTITLEMENTS="src-tauri/entitlements.plist"

# Get version from tauri.conf.json
VERSION=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
echo "Building version: $VERSION"

# Check if bundle exists (created by npm run tauri build)
if [ ! -d "$APP_BUNDLE" ]; then
    echo "ERROR: App bundle not found at $APP_BUNDLE"
    echo "Run 'npm run tauri build' first to create the bundle with frontend assets"
    exit 1
fi

echo "📦 Using existing Tauri bundle at $APP_BUNDLE"

# Update Info.plist to add URL scheme (Tauri doesn't do this automatically)
echo "📝 Adding URL scheme to Info.plist..."
/usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes" "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$APP_BUNDLE/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$APP_BUNDLE/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string $BUNDLE_ID" "$APP_BUNDLE/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$APP_BUNDLE/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string fizz" "$APP_BUNDLE/Contents/Info.plist"

# Strip ALL extended attributes recursively (important!)
echo "🧹 Stripping extended attributes..."
xattr -cr "$APP_BUNDLE" 2>/dev/null || true

# Find and sign all nested binaries/frameworks first
echo "🔏 Signing nested components..."
find "$APP_BUNDLE" -type f -perm +111 -not -name ".*" | while read binary; do
    if file "$binary" | grep -q "Mach-O"; then
        xattr -cr "$binary" 2>/dev/null || true
        codesign --force --options runtime --sign "$SIGNING_IDENTITY" --entitlements "$ENTITLEMENTS" "$binary" 2>/dev/null || true
    fi
done

# Strip xattrs again
xattr -cr "$APP_BUNDLE" 2>/dev/null || true

# Sign the main bundle
echo "🔏 Signing bundle with: $SIGNING_IDENTITY"
codesign --force --options runtime --sign "$SIGNING_IDENTITY" --entitlements "$ENTITLEMENTS" "$APP_BUNDLE" 2>&1 || true

# Verify signature - this is what matters
echo "✅ Verifying signature..."
if ! codesign --verify --verbose "$APP_BUNDLE"; then
    echo "ERROR: Signature verification failed!"
    exit 1
fi

echo ""
echo "🎉 App bundle signed at:"
echo "   $APP_BUNDLE"
echo ""

# Notarization (if credentials are set)
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_PASSWORD" ]; then
    echo "📤 Submitting for notarization..."

    # Create zip for notarization
    ZIP_PATH="$BUNDLE_DIR/$APP_NAME.zip"
    ditto -c -k --keepParent "$APP_BUNDLE" "$ZIP_PATH"

    # Submit for notarization
    xcrun notarytool submit "$ZIP_PATH" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$TEAM_ID" \
        --wait

    # Staple the notarization ticket
    echo "📎 Stapling notarization ticket..."
    xcrun stapler staple "$APP_BUNDLE"

    # Clean up notarization zip
    rm "$ZIP_PATH"

    echo ""
    echo "✅ Notarization complete!"
else
    echo "⚠️  Skipping notarization (APPLE_ID and APPLE_PASSWORD not set)"
fi

# Create DMG for distribution with Applications folder symlink
echo ""
echo "📀 Creating DMG..."
DMG_PATH="$BUNDLE_DIR/$APP_NAME-$VERSION.dmg"
DMG_STAGING="$BUNDLE_DIR/dmg-staging"

# Clean up any previous staging folder
rm -rf "$DMG_STAGING"
mkdir -p "$DMG_STAGING"

# Copy app and create Applications symlink
cp -R "$APP_BUNDLE" "$DMG_STAGING/"
ln -s /Applications "$DMG_STAGING/Applications"

# Create the DMG
rm -f "$DMG_PATH"
hdiutil create -volname "$APP_NAME" -srcfolder "$DMG_STAGING" -ov -format UDZO "$DMG_PATH"

# Clean up staging folder
rm -rf "$DMG_STAGING"

echo "✅ DMG created at: $DMG_PATH"

# Create update artifacts (if signing key is set)
if [ -n "$TAURI_SIGNING_PRIVATE_KEY" ]; then
    echo ""
    echo "📦 Creating update artifacts..."

    # Create tar.gz of the app
    UPDATE_TAR="$BUNDLE_DIR/$APP_NAME.app.tar.gz"
    tar -czf "$UPDATE_TAR" -C "$BUNDLE_DIR" "$APP_NAME.app"

    # Sign the update with Tauri signer
    echo "🔐 Signing update..."
    SIGNATURE=$(npx @tauri-apps/cli signer sign "$UPDATE_TAR" --private-key "$TAURI_SIGNING_PRIVATE_KEY" --password "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" 2>/dev/null | tail -1)

    # Get file size
    UPDATE_SIZE=$(stat -f%z "$UPDATE_TAR")

    # Get current date in ISO format
    PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Create latest.json for the updater
    cat > "$BUNDLE_DIR/latest.json" << EOF
{
  "version": "$VERSION",
  "notes": "See release notes on GitHub",
  "pub_date": "$PUB_DATE",
  "platforms": {
    "darwin-x86_64": {
      "signature": "$SIGNATURE",
      "url": "https://github.com/tonyyont/writecraft/releases/download/v$VERSION/$APP_NAME.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "$SIGNATURE",
      "url": "https://github.com/tonyyont/writecraft/releases/download/v$VERSION/$APP_NAME.app.tar.gz"
    }
  }
}
EOF

    echo "✅ Update artifacts created:"
    echo "   - $UPDATE_TAR"
    echo "   - $BUNDLE_DIR/latest.json"
else
    echo ""
    echo "⚠️  Skipping update artifacts (TAURI_SIGNING_PRIVATE_KEY not set)"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Build complete! Files ready for release:"
echo "  📀 DMG:     $DMG_PATH"
if [ -n "$TAURI_SIGNING_PRIVATE_KEY" ]; then
    echo "  📦 Update:  $UPDATE_TAR"
    echo "  📄 Manifest: $BUNDLE_DIR/latest.json"
fi
echo "═══════════════════════════════════════════════════════"
