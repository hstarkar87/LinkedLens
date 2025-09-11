let pendingFilters = null;

console.log("Background script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scrapeHiddenJobs") {
    pendingFilters = {
      keyword: message.keyword || "",
      location: message.location || ""
    };

    console.log("Opening new tab to scrape jobs with filters:", pendingFilters);

    chrome.tabs.create({
      url: "https://www.linkedin.com/jobs/collections/recommended",
      active: false
    }, function (tab) {
      const tabId = tab.id;

      const listener = function (updatedTabId, changeInfo, updatedTab) {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
          }).then(() => {
            let responded = false;

            chrome.tabs.sendMessage(tabId, {
              action: "getFilteredJobs",
              ...pendingFilters
            }, response => {
              responded = true;

              if (chrome.runtime.lastError) {
                console.error("Failed to send message to content.js:", chrome.runtime.lastError.message);
                chrome.runtime.sendMessage({
                  action: "scrapeFailed",
                  error: chrome.runtime.lastError.message
                });
              } else {
                console.log("Filtered jobs received from content.js:", response);
                chrome.runtime.sendMessage({
                  action: "jobsScraped",
                  jobs: response
                });
              }

              pendingFilters = null;
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.tabs.remove(tabId);
            });

            // Fallback timeout
            setTimeout(() => {
              if (!responded) {
                console.error("Timeout: No response from content.js");
                chrome.runtime.sendMessage({
                  action: "scrapeFailed",
                  error: "Timeout waiting for response from content.js"
                });
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.tabs.remove(tabId);
              }
            }, 5000);
          }).catch(err => {
            console.error("Script injection failed:", err);
            chrome.runtime.sendMessage({
              action: "scrapeFailed",
              error: err.message
            });
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.remove(tabId);
          });
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });

    return true; // Required to keep the message channel open
  }
});