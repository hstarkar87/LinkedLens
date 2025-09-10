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

    if (currentTab.url.includes("/jobs/collections/recommended")) {
      chrome.tabs.sendMessage(currentTab.id, {
        action: "getFilteredJobs",
        keyword,
        location
      }, (jobs) => {
        renderJobs(jobs);
        spinner.style.display = "none";
      });
    } else {
      chrome.runtime.sendMessage({
        action: "scrapeHiddenJobs",
        keyword,
        location
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "jobsScraped") {
    renderJobs(message.jobs);
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
