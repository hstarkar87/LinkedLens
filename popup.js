
document.getElementById('filterForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const keyword = document.getElementById('keyword').value;
  const location = document.getElementById('location').value;
  const container = document.getElementById("results");
  const spinner = document.getElementById("spinner");

  spinner.style.display = "block";
  container.innerHTML = "";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const url = currentTab?.url || "";
    console.log("Current tab URL:", url);

    if (url.includes("/jobs/collections/recommended")) {
      // Scrape only recommended jobs
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ["content.js"]
      }, () => {
        chrome.tabs.sendMessage(currentTab.id, {
          action: "getFilteredJobs",
          keyword,
          location
        }, (jobs) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError.message);
            showError("Could not connect to LinkedIn jobs page. Try refreshing the tab.");
            spinner.style.display = "none";
            return;
          }

          renderJobs(jobs);
          spinner.style.display = "none";
        });
      });
    } else if (url.includes("/jobs")) {
      // Scrape visible jobs from current tab
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ["content.js"]
      }, () => {
        chrome.tabs.sendMessage(currentTab.id, {
          action: "getFilteredJobs",
          keyword,
          location
        }, (visibleJobs) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError.message);
            showError("Could not connect to LinkedIn jobs page. Try refreshing the tab.");
            spinner.style.display = "none";
            return;
          }

          // Scrape recommended jobs in background
          chrome.runtime.sendMessage({
            action: "scrapeHiddenJobs",
            keyword,
            location
          });

          // Wait for background response
          chrome.runtime.onMessage.addListener(function listener(message) {
            if (message.action === "jobsScraped") {
              chrome.runtime.onMessage.removeListener(listener);
              const combinedJobs = [...visibleJobs, ...message.jobs];
              renderJobs(combinedJobs);
              spinner.style.display = "none";
            }

            if (message.action === "scrapeFailed") {
              chrome.runtime.onMessage.removeListener(listener);
              showError("Failed to scrape recommended jobs.");
              spinner.style.display = "none";
            }
          });
        });
      });
    } else {
      showError("Please navigate to a LinkedIn jobs page to use LinkedLens.");
      spinner.style.display = "none";
    }
  });
});

function renderJobs(jobs) {
  const container = document.getElementById("results");

  if (jobs && jobs.length > 0) {
    container.innerHTML = jobs.map(job => `
      <div class="job-card">
        <img src="${job.logo}" alt="Company Logo" class="job-logo">
        <div class="job-details">
          <h3><a href="${job.link}" target="_blank">${job.title}</a></h3>
          <p>${job.company}</p>
          <small>${job.postedTime}</small>
          <p>${job.connectionInfo || ''}</p>
        </div>
      </div>
    `).join('');
  } else {
    container.innerText = "No jobs matched your filter.";
  }
}

function showError(message) {
  const container = document.getElementById("results");
  container.innerHTML = `<div class="error-message">${message}</div>`;
}
