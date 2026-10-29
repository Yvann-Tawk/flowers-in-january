#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Builds "Flowers in January.app" (macOS, Apple silicon + Intel) and a zip to share.
#  Needs only Apple's Command Line Tools (swiftc). Run from anywhere:
#      bash mac/build.sh
#  Output: dist/Flowers in January.app and dist/Flowers-in-January-mac.zip
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="Flowers in January"
DIST="$ROOT/dist"
APP="$DIST/$NAME.app"
PHASER_URL="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"
VERSION="$(cd "$ROOT" && git rev-list --count HEAD 2>/dev/null || echo 1)"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/game"

# 1. the app shell (universal binary)
echo "Compiling…"
TMP="$(mktemp -d)"
for arch in arm64 x86_64; do
  swiftc -O -target "$arch-apple-macos12.0" -o "$TMP/app-$arch" "$ROOT/mac/FlowersInJanuary.swift"
done
lipo -create "$TMP/app-arm64" "$TMP/app-x86_64" -output "$APP/Contents/MacOS/$NAME"
rm -rf "$TMP"

# 2. the game files
echo "Copying the game…"
G="$APP/Contents/Resources/game"
cp "$ROOT/index.html" "$G/"
cp -R "$ROOT/css" "$ROOT/js" "$ROOT/data" "$G/"
rsync -a --exclude 'interiors/' --exclude '.DS_Store' "$ROOT/assets/" "$G/assets/"
mkdir -p "$G/assets/interiors"   # raw interior tilesets aren't used by the game

# 3. Phaser inside the app (so it works offline); cached in mac/vendor
mkdir -p "$ROOT/mac/vendor"
if [ ! -s "$ROOT/mac/vendor/phaser.min.js" ]; then
  echo "Fetching Phaser 3.60.0…"
  curl -fsSL "$PHASER_URL" -o "$ROOT/mac/vendor/phaser.min.js"
fi
mkdir -p "$G/js/vendor"
cp "$ROOT/mac/vendor/phaser.min.js" "$G/js/vendor/"
sed -i '' "s#$PHASER_URL#js/vendor/phaser.min.js#" "$G/index.html"

# 4. icon + Info.plist
cp "$ROOT/mac/AppIcon.icns" "$APP/Contents/Resources/"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundleDisplayName</key><string>$NAME</string>
  <key>CFBundleExecutable</key><string>$NAME</string>
  <key>CFBundleIdentifier</key><string>com.yvanntawk.flowersinjanuary</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.adventure-games</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>Made by Yvann, for Jana.</string>
</dict></plist>
PLIST

# 5. ad-hoc signature (lets it run on this Mac; see README for other Macs)
codesign --force --deep --sign - "$APP" >/dev/null

# 6. zip for sharing
rm -f "$DIST/Flowers-in-January-mac.zip"
(cd "$DIST" && ditto -c -k --sequesterRsrc --keepParent "$NAME.app" "Flowers-in-January-mac.zip")
echo "Built: $APP"
du -sh "$APP" "$DIST/Flowers-in-January-mac.zip"
