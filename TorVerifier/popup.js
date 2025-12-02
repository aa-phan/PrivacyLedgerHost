function updateUI(status) {
  const statusDiv = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  if (status === "Running") {
    statusDiv.textContent = "Tor is Active\nProxy: 127.0.0.1:9050";
    statusDiv.className = "active";
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else if (status === "Starting") {
    statusDiv.textContent = "Tor is Starting...";
    statusDiv.className = "";
    startBtn.disabled = true;
    stopBtn.disabled = true;
  } else if (status === "Stopped" || status === "Terminated" || status === "Idle") {
    statusDiv.textContent = "Tor is Stopped\nDirect Connection";
    statusDiv.className = "inactive";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  } else {
    statusDiv.textContent = "Status: " + status;
    startBtn.disabled = false;
    stopBtn.disabled = false;
  }
}

// LISTENERS
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startBtn').disabled = true;
  document.getElementById('status').textContent = "⏳ Sending start command...";
  chrome.runtime.sendMessage({ action: "USER_START" });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  document.getElementById('stopBtn').disabled = true;
  document.getElementById('status').textContent = "⏳ Sending stop command...";
  chrome.runtime.sendMessage({ action: "USER_STOP" });
});

document.getElementById('verifyBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "STATUS" });
});

// SCORE LOGIC
function updateLedger() {
  chrome.runtime.sendMessage({ action: "GET_LEDGER_DATA" }, (data) => {
    if (!data) return;

    const trackerCount = data.trackers.length;

    let score = 100 - (trackerCount * 1);
    if (score < 0) score = 0;

    const scoreEl = document.getElementById('privacyScore');
    scoreEl.textContent = score;
    scoreEl.style.color = score > 70 ? "#28a745" : (score > 40 ? "#ffc107" : "#dc3545");

    const summaryEl = document.getElementById('summaryBox');
    if (trackerCount === 0) {
      summaryEl.textContent = "We have not detected any known trackers on this page.";
    } else {
      summaryEl.textContent = `This site is tracking you. We detected ${trackerCount} third-party tracker(s) collecting your activity.`;
    }

    const listEl = document.getElementById('trackerList');
    listEl.innerHTML = ""; 
    data.trackers.forEach(domain => {
      const li = document.createElement('li');
      li.textContent = domain;
      listEl.appendChild(li);
    });
  });
}

// UPDATE LOOP
chrome.storage.local.get(['torStatus'], (result) => updateUI(result.torStatus || "Idle"));
chrome.storage.onChanged.addListener((changes, ns) => {
  if (ns === 'local' && changes.torStatus) updateUI(changes.torStatus.newValue);
});

setInterval(updateLedger, 1000);
updateLedger();