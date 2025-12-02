// background.js

// --- 1. CONFIGURATION ---
const HOST_NAME = "com.privacyscanner.torproxy";
const BLOCKLIST_URL = "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts";

// Fallback list
const DEFAULT_TRACKERS = [
  ///"google-analytics.com", "doubleclick.net", "facebook.com/tr", "hotjar.com",
  ///"criteo.com", "outbrain.com", "taboola.com", "adservice.google.com", 
  ///"google.com", "amazon.com", "reddit.com", "bing.com"
];

// --- 2. STATE ---
let trackerSet = new Set(DEFAULT_TRACKERS);
let ledgerData = {};
let nativePort = null;

// --- 3. BLOCKLIST ENGINE ---
async function updateBlocklist() {
  console.log("⏳ Downloading Full Blocklist...");
  try {
    const response = await fetch(BLOCKLIST_URL);
    const text = await response.text();
    const lines = text.split('\n');
    const newSet = new Set();
    
    for (const line of lines) {
      if (line.startsWith('#') || line.trim() === '') continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 2) newSet.add(parts[1]);
    }
    
    // Merge defaults back in so you can test with google/reddit
    DEFAULT_TRACKERS.forEach(domain => newSet.add(domain));

    trackerSet = newSet;
    const arrayToSave = Array.from(newSet).slice(0, 150000);
    await chrome.storage.local.set({ cachedBlocklist: arrayToSave, lastUpdate: Date.now() });
    
    console.log(`✅ Blocklist Updated! Loaded ${newSet.size} rules.`);
    chrome.action.setBadgeText({ text: "UP" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);

  } catch (err) {
    console.error("❌ Failed to update blocklist:", err);
  }
}

async function loadBlocklist() {
  const data = await chrome.storage.local.get(['cachedBlocklist']);
  if (data.cachedBlocklist && data.cachedBlocklist.length > 0) {
    trackerSet = new Set(data.cachedBlocklist);
    console.log(`📂 Loaded ${trackerSet.size} rules from cache.`);
  } else {
    updateBlocklist();
  }
}

// --- 4. INITIALIZATION ---
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.tabs.create({ url: 'welcome.html' });
    updateBlocklist(); 
  }
});

loadBlocklist();

// --- 5. DETECTION LOGIC ---
function isTrackerDomain(domain) {
  if (trackerSet.has(domain)) return true;
  const parts = domain.split('.');
  if (parts.length > 2) {
    const rootDomain = parts.slice(-2).join('.');
    if (trackerSet.has(rootDomain)) return true;
  }
  return false;
}

// --- 6. PROXY & HOST LOGIC ---
const PROXY_CONFIG = {
  mode: "fixed_servers",
  rules: {
    singleProxy: { scheme: "socks5", host: "127.0.0.1", port: 9050 },
    bypassList: ["localhost", "127.0.0.1", "::1"]
  }
};

function enableProxy() {
  console.log("enabling proxy settings...");
  chrome.proxy.settings.set({ value: PROXY_CONFIG, scope: 'regular' }, () => {
    console.log("✅ Proxy Enabled (Fixed Servers).");
  });
}

function disableProxy() {
  console.log("disabling proxy settings...");
  // FIX: Force 'system' mode to guarantee the proxy is cleared
  const config = { mode: "system"};
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    console.log("⏹️ Proxy Explicitly Reset to System.");
  });
}

function connectToHost() {
  if (nativePort) return;
  
  console.log("Connecting to Native Host wrapper...");
  nativePort = chrome.runtime.connectNative(HOST_NAME);

  nativePort.onMessage.addListener((msg) => {
    console.log("Received from Host:", msg);

    if (msg.data && msg.data.status) {
      const status = msg.data.status;
      chrome.storage.local.set({ torStatus: status });
      
      if (status === "Starting" || status === "Running") {
        enableProxy();
        if (status === "Starting") {
            setTimeout(() => {
                nativePort.postMessage({ command: "GET_STATUS" });
            }, 2000);
        }
      } 
      // FIX: Added 'Terminated' check so disableProxy() actually runs
      else if (status === "Stopped" || status === "Terminated") {
        disableProxy();
      }
    }
  });
  
  nativePort.onDisconnect.addListener(() => {
    console.log("Host disconnected.");
    chrome.storage.local.set({ torStatus: "Host Disconnected" });
    disableProxy();
    nativePort = null;
  });
}

// Logging
function logTracker(tabId, domain) {
  if (!ledgerData[tabId]) ledgerData[tabId] = { trackers: new Set() };
  ledgerData[tabId].trackers.add(domain);
  updateBadge(tabId);
}

function updateBadge(tabId) {
  const data = ledgerData[tabId];
  if (!data) return;
  const count = data.trackers.size;
  
  // FIX: Multiplier is 10, not 1
  let score = 100 - (count * 1);
  if (score < 0) score = 0;
  
  let color = score <= 40 ? "#dc3545" : (score <= 70 ? "#ffc107" : "#28a745");
  const text = count > 0 ? count.toString() : "";
  chrome.action.setBadgeText({ tabId: tabId, text: text });
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color });
}

// --- LISTENERS ---
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "USER_START" || req.action === "USER_STOP" || req.action === "STATUS") {
    if (!nativePort) connectToHost();

    if (req.action === "USER_START") setTimeout(() => nativePort.postMessage({ command: "START_TOR" }), 100);
    else if (req.action === "USER_STOP") setTimeout(() => nativePort.postMessage({ command: "STOP_TOR" }), 100);
    else if (req.action === "STATUS") setTimeout(() => nativePort.postMessage({ command: "GET_STATUS" }), 100);
  }
  
  else if (req.action === "GET_LEDGER_DATA") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
       if (tabs.length === 0) return;
       const data = ledgerData[tabs[0].id] || { trackers: new Set() };
       sendResponse({ trackers: Array.from(data.trackers) });
    });
    return true; 
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = new URL(details.url);
    const domain = url.hostname;
    const tabId = details.tabId;

    if (tabId === -1) return;

    if (isTrackerDomain(domain)) {
      logTracker(tabId, domain);
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onRemoved.addListener((tabId) => { if (ledgerData[tabId]) delete ledgerData[tabId]; });

// --- STARTUP ---
connectToHost();
chrome.storage.local.set({ torStatus: "Initializing" });