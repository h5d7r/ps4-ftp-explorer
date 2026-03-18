<div align="center">

# 🎮 PS4 FTP Explorer

**Advanced PS4 File Manager & Payload Sender**

[![Telegram](https://img.shields.io/badge/Telegram-@C2__9H-2CA5E0?logo=telegram)](https://t.me/C2_9H)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](#)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Mac%20%7C%20Linux-lightgrey)](#)

*Developed by **Mr. Velox***

</div>

---

## 📋 Overview

PS4 FTP Explorer is a professional desktop application for managing files on your PS4 via FTP connection, with a built-in Payload Sender for sending `.bin` / `.self` / `.pkg` payloads directly via TCP socket.

---

## ✨ Features

### 🗂️ File Explorer
- Connect to PS4 via FTP (custom IP, port, username, password)
- Netflix-style horizontal card browser
- Custom SVG icons per file type (PKG, BIN, SELF, image, video, audio, archive, key...)
- Navigate folders with back/forward history
- Drag & drop file upload directly into the browser

### 🖱️ Right-Click Context Menu
| On a File/Folder | On Empty Space |
|---|---|
| Open Folder | Upload Files… |
| Download | New Folder… |
| Rename (F2) | Select All (Ctrl+A) |
| Duplicate | Refresh (F5) |
| Move To… | Copy Current Path |
| Copy Path | |
| Properties | |
| Select All | |
| Delete (Del) | |

### ⚡ Payload Sender
- Separate tab with clean dedicated UI
- Enter PS4 IP + custom port (leave blank to type your own)
- Browse and select any `.bin`, `.self`, `.elf`, `.pkg` or custom file
- Real-time transmission log with timestamps
- Status indicator (Idle → Sending → Success/Failed)
- Shows bytes transferred on success

### ⌨️ Keyboard Shortcuts
| Key | Action |
|---|---|
| `F2` | Rename selected |
| `F5` | Refresh directory |
| `Ctrl+A` | Select all files |
| `Delete` | Delete selected |
| `Ctrl+Click` | Multi-select |
| `Escape` | Close menu/modal |

---

## 🚀 Getting Started

### Run in Development
```bash
npm install
npm start
```

### Build Setup Installer (Windows .exe)
```bash
npm install
npm run build
```
> Output: `dist/PS4 FTP Explorer Setup 1.0.0.exe`

### Other Platforms
```bash
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux .AppImage
```

---

## 📡 Payload Sender — How to Use

1. Make sure your PS4 is jailbroken and has a payload listener running
2. Switch to the **Payload Sender** tab
3. Enter your PS4's IP address
4. Enter the port your payload listener is using (e.g. `9021`, `9090`)
5. Click **Browse File** and select your `.bin` payload
6. Click **Send Payload** — watch the log for confirmation

---

## 🔌 FTP Connection — How to Use

1. On your PS4, enable FTP server (via exploit, GoldHEN, etc.)
2. Note the IP shown on screen
3. Enter IP in the **PS4 IP Address** field (default port: `21`)
4. Click **Connect**
5. Browse, upload, download, rename, delete files freely

---

## 📦 Tech Stack

| Component | Library |
|---|---|
| Desktop Framework | Electron v28 |
| FTP Client | basic-ftp v5 |
| File System | fs-extra v11 |
| TCP Socket | Node.js `net` (built-in) |
| Installer | electron-builder (NSIS) |

---

## 👤 Developer

**Mr. Velox**
- Telegram: [@C2_9H](https://t.me/C2_9H)

---

## ⚠️ Disclaimer

This tool is intended for personal use on your own PS4 system.
Use responsibly and in accordance with local laws.

---

<div align="center">
© 2025 Mr. Velox — All rights reserved
</div>
