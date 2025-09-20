
function getFilteredJobs(message) {
  try {
    console.log("Filtering jobs with criteria:", message);
    const jobCards = document.querySelectorAll('.job-card-container');
    const { keyword, location, locationType } = message;

    console.log("Total job cards found:", jobCards.length);

    const jobs = Array.from(jobCards).map(card => {
      const title = card.querySelector('.job-card-container__link span strong')?.innerText.trim();
      const company = card.querySelector('.artdeco-entity-lockup__subtitle')?.innerText.trim();
      const locationInfo = card.querySelector('.job-card-container__metadata-wrapper li span')?.innerText.trim();
      const logo = card.querySelector('img[alt*="logo"]')?.src;
      const link = card.querySelector('a.job-card-container__link')?.href;
      const postedTime = card.querySelector('time')?.innerText.trim() ?? "";
      const connectionInfo = card.querySelector('.job-card-container__job-insight-text')?.innerText.trim();
      const CompanyAndLocation = company +", "+ locationInfo;
      const matchesKeyword = keyword ? title?.toLowerCase().includes(keyword.toLowerCase()) : true;
      const matchesLocation = location ? CompanyAndLocation?.toLowerCase().includes(location.toLowerCase()) : true;
      const matchesLocationType = locationType ? CompanyAndLocation?.toLowerCase().includes(locationType.toLowerCase()) : true;
      const matchesExperience = true; // Placeholder for future logic

      if (!(matchesKeyword && matchesLocation && matchesExperience && matchesLocationType)) {
        return null;
      }

      return { title, company:CompanyAndLocation, logo, link, postedTime, connectionInfo };
    });

    return jobs.filter(job => job !== null);
  } catch (error) {
    console.error("Error filtering jobs:", error);
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  if (message.action === "getFilteredJobs") {
    (async () => {
      try {
        const filteredJobs = await getFilteredJobs(message);
        sendResponse(filteredJobs);
      } catch (err) {
        console.error("Failed to process getFilteredJobs:", err);
        sendResponse([]);
      }
    })();

    return true; // Keep the message channel open for async response
  }
});
