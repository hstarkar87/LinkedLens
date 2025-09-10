let pendingFilters = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scrapeHiddenJobs") {
    // Store filters to pass to content.js later
    pendingFilters = {
      keyword: message.keyword || "",
      location: message.location || ""
    };

    chrome.tabs.create({
      url: "https://www.linkedin.com/jobs/collections/recommended",
      active: false
    }, function (tab) {
      const tabId = tab.id;

      // Wait for tab to finish loading
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo, updatedTab) {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
          });

          // Send filters to content.js after injection
          chrome.tabs.sendMessage(tabId, {
            action: "scrapeHiddenJobs",
            ...pendingFilters
          });

          // Clear stored filters and remove listener
          pendingFilters = null;
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  }

  // Receive scraped jobs from content.js
  if (message.action === "jobsScraped") {
    // Forward to popup
    chrome.runtime.sendMessage({
      action: "jobsScraped",
      jobs: message.jobs
    });

    // Close the tab that scraped jobs
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
});
