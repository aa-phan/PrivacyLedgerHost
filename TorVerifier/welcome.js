
document.getElementById('retryBtn').addEventListener('click', () => {
  const statusText = document.getElementById('status');
  statusText.textContent = "Pinging Native Host...";
  statusText.style.color = "blue";

  chrome.runtime.sendMessage({ action: "STATUS" });

  setTimeout(checkStatus, 500); 
});

function checkStatus() {
  chrome.storage.local.get(['torStatus'], (result) => {
    const status = result.torStatus; 
    console.log("Current Status:", status);

    // "Idle" means Host replied but Tor is off (GOOD).
    // "Running" means Host replied and Tor is on (GOOD).
    if (status === "Idle" || status === "Running" || status === "Starting") {
      document.getElementById('status').style.display = 'none';
      document.getElementById('successMsg').style.display = 'block';
      document.getElementById('retryBtn').style.display = 'none';
    } 
    else if (status === "Host Disconnected") {
       document.getElementById('status').textContent = "Error: Native Host not found. Did you run the executable?";
       document.getElementById('status').style.color = "red";
    }
    else {
       document.getElementById('status').textContent = "Status: " + status + ". Try clicking again.";
       document.getElementById('status').style.color = "orange";
    }
  });
}
