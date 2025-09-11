let pendingFilters = null;

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

      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo, updatedTab) {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
          }).then(() => {
            // Send filters to content.js after injection
            chrome.tabs.sendMessage(tabId, {
              action: "getFilteredJobs",
              ...pendingFilters
            }, response => {
              if (chrome.runtime.lastError) {
                console.error("Failed to send message to content.js:", chrome.runtime.lastError.message);
                // Optional: notify popup or log to storage
                chrome.runtime.sendMessage({
                  action: "scrapeFailed",
                  error: chrome.runtime.lastError.message
                });
              } else {
                console.log("Message sent to content.js successfully:", response);
              }
            });

            pendingFilters = null;
            chrome.tabs.onUpdated.removeListener(listener);
          }).catch(err => {
            console.error("Script injection failed:", err);
            chrome.runtime.sendMessage({
              action: "scrapeFailed",
              error: err.message
            });
            chrome.tabs.onUpdated.removeListener(listener);
          });
        }
      });
    });
  }

  if (message.action === "jobsScraped") {
    chrome.runtime.sendMessage({
      action: "jobsScraped",
      jobs: message.jobs
    });

    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
});