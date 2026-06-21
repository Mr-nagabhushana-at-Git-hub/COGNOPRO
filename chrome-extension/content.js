// This script runs on the FocusFlow web app page.
// It listens for `window.postMessage` from the React frontend and forwards it to the Chrome Extension background worker.

window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data.source === "FOCUS_FLOW_APP") {
    if (event.data.type === "START_MONK_MODE") {
      chrome.runtime.sendMessage({ 
        type: "START_MONK_MODE", 
        payload: event.data.payload 
      });
      console.log("Extension received START_MONK_MODE command for domains:", event.data.payload.domains);
    } else if (event.data.type === "STOP_MONK_MODE") {
      chrome.runtime.sendMessage({ 
        type: "STOP_MONK_MODE" 
      });
      console.log("Extension received STOP_MONK_MODE command.");
    }
  }
});

// Let the web app know the extension is installed and ready
window.postMessage({ source: "FOCUS_FLOW_EXTENSION", type: "EXTENSION_READY" }, "*");
console.log("FocusFlow Chrome Extension Injected Successfully.");
