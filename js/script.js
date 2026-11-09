// ==========================================================================
// NASA Space Explorer App
// ==========================================================================

// Array of fascinating random space facts
const spaceFacts = [
  "One day on Venus is longer than one year on Venus! It takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun.",
  "Neutron stars can spin at a mind-boggling rate of up to 600 rotations per second.",
  "Space is completely silent because there is no atmosphere or air for sound waves to travel through.",
  "Footprints left on the Moon by Apollo astronauts will stay there for at least 100 million years because there is no wind or water erosion.",
  "The Sun accounts for roughly 99.86% of all the mass in our entire solar system.",
  "Sunset on Mars appears blue to human eyes because fine Martian dust particles scatter red light away from observers.",
  "Jupiter's Great Red Spot is a colossal storm wider than Earth that has been raging for hundreds of years.",
  "Saturn's majestic rings are mostly composed of billions of chunks of pure water ice, ranging from tiny specks to mountain-sized blocks.",
  "Sunlight takes approximately 8 minutes and 20 seconds to travel 93 million miles across space to reach Earth.",
  "There are estimated to be more trees on Earth (about 3 trillion) than there are stars in the Milky Way galaxy (about 100 to 400 billion).",
  "The International Space Station travels at roughly 17,500 miles per hour, orbiting Earth once every 90 minutes (16 sunrises a day!).",
  "Olympus Mons on Mars is the largest volcano in our solar system—nearly three times the height of Mount Everest."
];

// Function to select and display a random space fact on page load or refresh
function displayRandomSpaceFact() {
  const factElement = document.getElementById('spaceFactText');
  if (factElement) {
    const randomIndex = Math.floor(Math.random() * spaceFacts.length);
    factElement.textContent = spaceFacts[randomIndex];
  }
}

// Display a random space fact immediately when the page loads
displayRandomSpaceFact();

// Find our date picker inputs, button, and gallery container on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');

// Find modal elements on the page
const modal = document.getElementById('imageModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalVideo = document.getElementById('modalVideo');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// Store the fetched items so we can look them up when clicked
let currentMediaItems = [];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Helper function to convert "YYYY-MM-DD" into legacy "YYMMDD" required by the APOD API
function formatDateForApi(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${year.slice(2)}${month}${day}`;
}

// Helper function to detect if an APOD entry has an embedded video and return its embed URL
function getVideoEmbedUrl(item) {
  // Check if media_type indicates a video or iframe
  const isVideo = item.media_type === 'video' || item.media_type === 'iframe';

  // 1. If basic_html contains an <iframe>, extract its src URL
  if (item.basic_html) {
    const iframeMatch = item.basic_html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch) {
      let src = iframeMatch[1];
      // Normalize protocol-relative URLs (e.g., //www.youtube.com/...)
      if (src.startsWith('//')) {
        src = 'https:' + src;
      }
      return src;
    }
  }

  // 2. If the URL points directly to YouTube, Vimeo, or a video file
  if (item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be') || item.url.includes('vimeo.com') || item.url.endsWith('.mp4'))) {
    if (item.url.includes('watch?v=')) {
      return item.url.replace('watch?v=', 'embed/');
    }
    return item.url;
  }

  // If marked as video and has a general URL, return it as fallback
  if (isVideo && item.url) {
    return item.url;
  }

  return null;
}

// Function to open the modal window and populate it with photo or video details
function openModal(item) {
  const videoUrl = getVideoEmbedUrl(item);

  if (videoUrl) {
    // If the entry is a video, show the video iframe and hide the image element
    modalImage.classList.add('hidden');
    modalImage.src = '';
    modalVideo.classList.remove('hidden');
    modalVideo.src = videoUrl;
  } else {
    // If the entry is a photo, show the image element and hide the video iframe
    modalVideo.classList.add('hidden');
    modalVideo.src = '';
    modalImage.classList.remove('hidden');
    modalImage.src = item.hdurl || item.url;
    modalImage.alt = item.title;
  }

  modalTitle.textContent = item.title;
  modalDate.textContent = `Date: ${item.date}`;
  modalExplanation.innerHTML = item.explanation;

  // Reveal the modal by removing the 'hidden' class
  modal.classList.remove('hidden');

  // Prevent background scrolling while the modal is open
  document.body.style.overflow = 'hidden';
}

// Function to close the modal window
function closeModal() {
  modal.classList.add('hidden');
  modalImage.src = '';
  modalVideo.src = ''; // Stops video playback and audio immediately
  document.body.style.overflow = '';
}

// Function to fetch APOD data from NASA's API and display it
async function getSpaceImages() {
  // Show a loading message while fetching data (replaces old gallery content)
  gallery.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">🚀</div>
      <p>Loading space images and videos from NASA...</p>
    </div>
  `;

  // Convert the start and end dates to legacy YYMMDD format
  const formattedStart = formatDateForApi(startInput.value);
  const formattedEnd = formatDateForApi(endInput.value);

  // Build the API URL with date_from and date_to parameters
  const apiUrl = `https://science.nasa.gov/wp-json/wp/v2/apod-basic?date_from=${formattedStart}&date_to=${formattedEnd}`;

  try {
    const response = await fetch(apiUrl);

    // Check if the network request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the JSON data from NASA's API
    const apodData = await response.json();

    // Keep items that have an image URL or an embedded video
    currentMediaItems = apodData.filter((item) => {
      return item.hdurl || getVideoEmbedUrl(item) || item.url;
    });

    // Variable to store the new cards HTML
    let cardsHtml = '';

    // Loop through each media item to build its card
    currentMediaItems.forEach((item, index) => {
      const title = item.title;
      const date = item.date;
      const imageUrl = item.hdurl;
      const videoUrl = getVideoEmbedUrl(item);

      if (videoUrl) {
        // Detect video: Embed the video iframe into the gallery card
        cardsHtml += `
          <div class="gallery-item">
            <iframe src="${videoUrl}" title="${title}" frameborder="0" allowfullscreen class="gallery-video"></iframe>
            <div class="card-details" data-index="${index}">
              <h3>${title}</h3>
              <p class="date">${date} <span class="media-tag">Video</span></p>
            </div>
          </div>
        `;
      } else if (imageUrl) {
        // Photo: Render image with click-to-view modal functionality
        cardsHtml += `
          <div class="gallery-item">
            <img src="${imageUrl}" alt="${title}" data-index="${index}" />
            <div class="card-details" data-index="${index}">
              <h3>${title}</h3>
              <p class="date">${date}</p>
            </div>
          </div>
        `;
      }
    });

    // Replace the gallery content with the newly generated cards
    if (cardsHtml !== '') {
      gallery.innerHTML = cardsHtml;
    } else {
      gallery.innerHTML = `
        <div class="placeholder">
          <div class="placeholder-icon">🔭</div>
          <p>No images or videos found for the selected date range. Try choosing different dates!</p>
        </div>
      `;
    }
  } catch (error) {
    // Display error message if the fetch fails
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <p>Could not load space media. Please check your network connection and try again.</p>
      </div>
    `;
    console.error('Error fetching NASA APOD data:', error);
  }
}

// Event Listeners

// 1. Fetch images and videos when clicking the "Get Space Images" button
getImagesButton.addEventListener('click', getSpaceImages);

// 2. Open modal when clicking on an image or the card details (title/date) in the gallery
gallery.addEventListener('click', (event) => {
  // Check if an image was clicked
  if (event.target.tagName === 'IMG') {
    const itemIndex = event.target.dataset.index;
    if (itemIndex !== undefined && currentMediaItems[itemIndex]) {
      openModal(currentMediaItems[itemIndex]);
    }
    return;
  }

  // Check if title/date card-details was clicked (especially useful for video cards!)
  const cardDetails = event.target.closest('.card-details');
  if (cardDetails) {
    const itemIndex = cardDetails.dataset.index;
    if (itemIndex !== undefined && currentMediaItems[itemIndex]) {
      openModal(currentMediaItems[itemIndex]);
    }
  }
});

// 3. Close modal when clicking the close (X) button
modalClose.addEventListener('click', closeModal);

// 4. Close modal when clicking on the dark background overlay
modalOverlay.addEventListener('click', closeModal);

// 5. Close modal when pressing the Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeModal();
  }
});
