function getFilteredJobs(message) {
  console.log("Filtering jobs with criteria:", message);
  const jobCards = document.querySelectorAll('.job-card-container');
  const { keyword, location } = message;

  const jobs = Array.from(jobCards).map(card => {
    const title = card.querySelector('.job-card-container__link span strong')?.innerText.trim();
    const company = card.querySelector('.artdeco-entity-lockup__subtitle')?.innerText.trim();
    const logo = card.querySelector('img[alt*="logo"]')?.src;
    const link = card.querySelector('a.job-card-container__link')?.href;
    const postedTime = card.querySelector('time')?.innerText.trim() ?? "";
    const connectionInfo = card.querySelector('.job-card-container__job-insight-text')?.innerText.trim();

    const matchesKeyword = keyword ? title?.toLowerCase().includes(keyword.toLowerCase()) : true;
    const matchesLocation = location ? company?.toLowerCase().includes(location.toLowerCase()) : true;
    const matchesExperience = true; // Placeholder for future logic

    if (!(matchesKeyword && matchesLocation && matchesExperience)) {
      card.style.display = 'none';
      return null;
    }

    card.style.display = 'block';
    return { title, company, logo, link, postedTime, connectionInfo };
  });

  return jobs.filter(job => job !== null);
}

// Detect if we're on the collections page
const isCollectionsPage = window.location.href.includes('/jobs/collections/recommended');

if (!isCollectionsPage) {
  console.log("Not on collections page, navigating...");
  const showAllLink = document.querySelector('a.discovery-templates-jobs-home-vertical-list__footer');
  if (showAllLink) {
    showAllLink.click();
    console.log("Clicked 'Show all recommended jobs' link.");

    // Wait for navigation and job cards
    const waitForCards = setInterval(() => {
      const jobCards = document.querySelectorAll('.job-card-container');
      console.log(`Waiting for job cards... Found: ${jobCards.length}`);
      if (jobCards.length > 0) {
        clearInterval(waitForCards);
      }
    }, 1000);
  }
} else {
  // Already on collections page — listen for filters
  console.log("On collections page, ready to filter.");

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scrapeHiddenJobs") {
      const filteredJobs = getFilteredJobs(message);
      chrome.runtime.sendMessage({
        action: "jobsScraped",
        jobs: filteredJobs
      });
    }

    if (message.action === "getFilteredJobs") {
      const filteredJobs = getFilteredJobs(message);
      sendResponse(filteredJobs);
    }
  });
}
