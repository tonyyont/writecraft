#!/bin/bash

# WriteCraft macOS Build Script
# This script builds, signs, and notarizes the app for distribution

set -e

# Code signing and notarization credentials
export APPLE_SIGNING_IDENTITY="Developer ID Application: Tony Sheng (MN84M3F6WZ)"
export APPLE_TEAM_ID="MN84M3F6WZ"

# For notarization - set these environment variables before running:
#   export APPLE_ID="your@email.com"
#   export APPLE_PASSWORD="your-app-specific-password"
#
# Or store in Keychain (more secure):
#   xcrun notarytool store-credentials "WriteCraft" --apple-id "your@email.com" --team-id "MN84M3F6WZ"

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ]; then
    echo "⚠️  APPLE_ID and APPLE_PASSWORD environment variables not set."
    echo "   Set them before running, or notarization will be skipped."
    echo ""
fi

echo "🔨 Building WriteCraft for macOS..."
echo ""

# Build the app with Tauri
npm run tauri build

echo ""
echo "✅ Build complete!"
echo ""
echo "Your signed and notarized app is in:"
echo "  src-tauri/target/release/bundle/dmg/"
echo ""
