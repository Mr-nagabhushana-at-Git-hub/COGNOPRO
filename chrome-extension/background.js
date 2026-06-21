// Listens for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "START_MONK_MODE") {
    const domains = request.payload.domains || [];
    enableBlocking(domains).then(() => sendResponse({ success: true }));
  } else if (request.type === "STOP_MONK_MODE") {
    disableBlocking().then(() => sendResponse({ success: true }));
  }
  return true; // Keep message channel open for async response
});

async function enableBlocking(domains) {
  // Generate declarativeNetRequest rules
  const rules = domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ["main_frame", "sub_frame"]
    }
  }));

  // Create an array of possible old rule IDs to remove
  const oldRuleIds = Array.from({length: 50}, (_, i) => i + 1);

  // Apply dynamic rules to Chrome
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: rules
  });
  
  console.log("FocusFlow Monk Mode Active. Blocking:", domains);
}

async function disableBlocking() {
  const oldRuleIds = Array.from({length: 50}, (_, i) => i + 1);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds
  });
  console.log("FocusFlow Monk Mode Deactivated. All domains unblocked.");
}
