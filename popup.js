
document.getElementById('filterForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const keyword = document.getElementById('keyword');
  const location = document.getElementById('location');
  // Clear previous error styles
  keyword.classList.remove('error');
  location.classList.remove('error');

  // Validation: at least one field must be filled
  if (!keyword.value.trim() && !location.value.trim()) {
    keyword.classList.add('error');
    location.classList.add('error');    
    return; // Stop further execution
  }
  
  const container = document.getElementById("results");
  const spinner = document.getElementById("spinner");

  spinner.style.display = "block";
  container.innerHTML = "";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const url = currentTab?.url || "";
    console.log("Current tab URL:", url);
    //clear local storage
    chrome.storage.local.remove("linkedLensResponse");
    if (url.includes("/jobs/collections/recommended")) {
      // Scrape only recommended jobs
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ["content.js"]
      }, () => {
        chrome.tabs.sendMessage(currentTab.id, {
          action: "getFilteredJobs",
          keyword:keyword.value,
          location:location.value
        }, (jobs) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError.message);
            showError("Could not connect to LinkedIn jobs page. Try refreshing the tab.");
            spinner.style.display = "none";
            return;
          }
          //session storage
          
          saveToChromeStorage("linkedLensResponse", jobs, () => {
            console.log("Jobs saved successfully.");
          });

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
          keyword:keyword.value,
          location:location.value
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
            keyword:keyword.value,
            location:location.value
          });

          // Wait for background response
          chrome.runtime.onMessage.addListener(function listener(message) {
            if (message.action === "jobsScraped") {
              chrome.runtime.onMessage.removeListener(listener);
              const combinedJobs = [...visibleJobs, ...message.jobs];
               saveToChromeStorage("linkedLensResponse", combinedJobs, () => {
                console.log("Jobs saved successfully.");
                });
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
    const html = `<h3>Filtered Jobs</h3>`
    container.innerHTML = html+ jobs.map(job => `      
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
    container.innerText = html + "No jobs matched your filter.";
  }
}

function showError(message) {
  const container = document.getElementById("results");
  container.innerHTML = `<div class="error-message">${message}</div>`;
}
document.addEventListener("DOMContentLoaded", () => {
  
getFromChromeStorage("linkedLensResponse", (data) => {
  if (data) {
    console.log("Filtered jobs:", data);
    renderJobs(data);
    // You can now render this in your popup UI
  } else {
    console.log("No data found for LinkedLens.");
  }
});
  
});

function saveToChromeStorage(key, data, callback) {
  
// Check if data is valid and not empty
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn("Empty or invalid data. Skipping save.");
      return;
    }

  chrome.storage.local.set({ [key]: data }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving to storage:", chrome.runtime.lastError);
    } else {
      console.log(`Saved '${key}' to chrome.storage.local`);
      if (callback) callback();
    }
  });  
}


function getFromChromeStorage(key, callback) {
  chrome.storage.local.get(key, (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error reading from storage:", chrome.runtime.lastError);
      callback(null);
    } else {
      console.log(`Retrieved '${key}' from chrome.storage.local`);
      callback(result[key] || null);
    }
  });
}


