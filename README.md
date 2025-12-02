# 🧅 Privacy Ledger & Tor Controller

**Privacy Ledger** is a comprehensive browser security tool that combines real-time data tracking transparency with a one-click anonymity network.

Unlike standard ad-blockers that simply hide threats, Privacy Ledger quantifies your exposure by calculating a real-time **Privacy Score** and provides an integrated, one-click bridge to the **Tor Network** for true origin masking.

## 🚀 Key Features

* **Real-Time Tracker Detection:** Utilizes the massive [StevenBlack Unified Blocklist](https://github.com/StevenBlack/hosts) (100,000+ rules) to identify advertising, analytics, and social trackers.
* **Privacy Score Algorithm:** dynamic scoring system (0-100) that visually grades the safety of the current website based on the density of trackers found.
* **One-Click Tor Proxy:** A custom Native Host wrapper that launches a local Tor SOCKS5 proxy (`127.0.0.1:9050`) and automatically configures Chrome’s network stack to route traffic through it.
* **Origin Masking:** Hides your IP address from destination servers without requiring a paid VPN.
* **Data Visualization:** Provides a categorized "Ledger" of exactly which domains are tracking you on the current page.

---

## 🛠️ System Architecture

This project consists of two distinct components that communicate via Chrome's **Native Messaging API**:

1.  **The Extension (Frontend):**
    * Handles the UI (Popup), network request interception, score calculation, and proxy configuration.
2.  **The Native Host (Backend):**
    * A Python-based executable (`PrivacyLedgerHost`) that runs locally on your machine.
    * Manages the `tor` binary process, handles "Start/Stop" commands from the browser, and ensures the SOCKS5 proxy is active.

---

## 📥 Installation Guide

Because this project involves a Native Host (executable), installation is a two-step process.

### Phase 1: Install the Privacy Ledger Extension
1.  Download the TorVerifier folder from this Github repository, or clone the entire repository. If downloading just the TorVerifier folder, make sure it is unzipped and structured as `'/TorVerifier/[various js, json, html files]'`, not `'/TorVerifier/TorVerifier/[various js, json, html files]'`.
2.  Open Google Chrome (or a Chromium browser like Brave/Edge).
3.  Navigate to **`chrome://extensions/`**.
4.  Toggle **Developer mode** to **ON** (top right corner).
5.  Click the **Load unpacked** button (top left).
6.  Select the **TorVerifier** directory (the folder containing `manifest.json, welcome.js and background.js`).
7.  The extension should appear in your list, and a **"Welcome" tab** should open automatically.

### Phase 2: Install the Tor Proxy Wrapper (PrivacyLedgerHost)

*This step is required to enable the Tor functionality.*

1.  Download the **`PrivacyLedgerHost.zip`** file from the `dist/PrivacyLedgerHost/` folder (or via the link in the extension's Welcome page).
2.  **Unzip** the file. You should see a folder named `PrivacyLedgerHost`.
3.  Open the folder and double-click the **`install.command`** script.
    * **Note:** Do not double-click the executable directly yet. The command script handles permission fixes automatically.
    * *If prompted, enter your Mac password to allow the script to fix "Quarantine" attributes.*
4.  Once the terminal says **"Success! Permissions fixed,"** the host is registered.
---

## 🖥️ Usage

### 1. The Controller (Popup)
Click the **Onion Icon** in your browser toolbar to open the control panel.

* **Start Tor:** Launches the background process. The status will change from "Starting" to **"Tor is Active"** (Green) once the circuit is built (approx. 2-5 seconds).
* **Stop Tor:** Immediately terminates the background process and resets your browser to a direct connection.
* **Refresh Status:** Manually pings the Native Host to check connection status.

### 2. Reading the Ledger
Scroll down in the popup to view the report for the active tab:
* **Privacy Score:** 100 is perfect. The score drops by **1 point** for every unique tracker detected.
* **Tracker List:** A scrollable list of every specific tracking domain (e.g., `google-analytics.com`, `criteo.com`) found on the current page.

---

## ⚠️ Troubleshooting

### "File is damaged" or "Unidentified Developer"
Because this is an academic prototype, the executable is not cryptographically signed by Apple. macOS Gatekeeper may block it.
* **Fix:** Run the provided `install.command` script inside the host folder. It uses `xattr -cr` and ad-hoc signing to whitelist the app locally.

### "Access Denied" when running install.command
If you cannot run the setup script:
1.  Open Terminal.
2.  Type `chmod +x` (with a space).
3.  Drag the `install.command` file into the terminal window.
4.  Hit Enter.
5.  Try double-clicking the file again.

### Proxy seems stuck / No Internet
If you close the browser forcefully while Tor is running, Chrome might try to keep using the proxy configuration.
* **Fix:** Click the extension icon and hit **"Stop Tor"**. This sends an explicit command to reset Chrome's proxy settings to "System Default."

---

## ⚖️ License & Credits

* **Tor Project:** Uses the `tor` binary for SOCKS5 functionality.
* **StevenBlack Hosts:** Uses the Unified Hosts list for tracker detection.
* **Project Author:** Aaron Phan