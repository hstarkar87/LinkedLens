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
    console.log("Current tab URL:", currentTab?.url);

    if (currentTab.url.includes("/jobs/collections/recommended")) {
      // Inject content script before sending message
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
    } else {
      chrome.runtime.sendMessage({
  action: "scrapeHiddenJobs",
  keyword,
  location
}, (response) => {
  if (chrome.runtime.lastError) {
    console.error("Error:", chrome.runtime.lastError.message);
    showError("Could not get jobs.");
    spinner.style.display = "none";
    return;
  }

  if (response?.jobs) {
    renderJobs(response.jobs);
  } else {
    showError("No jobs found.");
  }

  spinner.style.display = "none";
});

    }
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "jobsScraped") {
    renderJobs(message.jobs);
    document.getElementById("spinner").style.display = "none";
  }

  if (message.action === "scrapeFailed") {
    console.error("Scrape failed:", message.error);
    showError("LinkedLens couldn't scrape jobs. Please try again or refresh the LinkedIn tab.");
    document.getElementById("spinner").style.display = "none";
  }
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
