function getFilteredJobs(message) {
  try {
    console.log("Filtering jobs with criteria:", message);
    const jobCards = document.querySelectorAll('.job-card-container');
    const { keyword, location } = message;

    console.log("Total job cards found:", jobCards.length);

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
        return null;
      }

      return { title, company, logo, link, postedTime, connectionInfo };
    });

    return jobs.filter(job => job !== null);
  } catch (error) {
    console.error("Error filtering jobs:", error);
    // Send error back to background
    chrome.runtime.sendMessage({
      action: "scrapeFailed",
      error: error.message
    });
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getFilteredJobs") {
    try {
      const filteredJobs = getFilteredJobs(message);
      sendResponse(filteredJobs);
    } catch (err) {
      console.error("Failed to process getFilteredJobs:", err);
      chrome.runtime.sendMessage({
        action: "scrapeFailed",
        error: err.message
      });
      sendResponse([]);
    }
    return true;
  }
});
