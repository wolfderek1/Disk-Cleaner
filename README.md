# Disk Cleaner

A lightweight macOS disk space manager with a hacker-themed UI.

## Features

- Scans 35+ locations across your Mac for reclaimable space
- Color-coded risk levels: Safe / Caution / Protected
- Live terminal view showing exact commands during scan and delete
- Checks GitHub releases for updates automatically
- Built with Swift + WKWebView — **~160 KB** app bundle (no Electron)

## Usage

Double-click **Disk Cleaner.app** or open it from Launchpad.

1. Click **[ SCAN ]** to analyse your disk
2. Select items to remove (use **[ SELECT SAFE ]** to auto-pick safe targets)
3. Click **[ DELETE ]** to free space

## Building from source

Requires: macOS 13+, Node.js, Swift (Xcode Command Line Tools)

```bash
# Compile the Swift launcher
swiftc DiskCleaner.swift -o DiskCleanerBin -framework Cocoa -framework WebKit

# Assemble the .app bundle
mkdir -p "Disk Cleaner.app/Contents/MacOS"
mkdir -p "Disk Cleaner.app/Contents/Resources/public"
cp DiskCleanerBin "Disk Cleaner.app/Contents/MacOS/DiskCleaner"
cp server.js "Disk Cleaner.app/Contents/Resources/"
cp public/index.html "Disk Cleaner.app/Contents/Resources/public/"
cp Info.plist "Disk Cleaner.app/Contents/"
chmod +x "Disk Cleaner.app/Contents/MacOS/DiskCleaner"
```

## Releases

To trigger an update notification in the app, publish a GitHub release with a tag like `v2.1.0`.
