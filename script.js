const form = document.getElementById("form");
const search = document.getElementById("search");
const result = document.getElementById("result");
const more = document.getElementById("more");

const apiURL = "https://api.lyrics.ovh";
let lastResultsData = null; // full array of tracks
let currentPage = 0;
const pageSize = 10;

function showLoading() {
  result.innerHTML = `<p class="loading">Loading…</p>`;
  more.innerHTML = "";
}

// Fetch helper without abort timeout
async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

// Search by song or artist
async function searchSongs(term) {
  try {
    showLoading();
    const data = await fetchJson(
      `${apiURL}/suggest/${encodeURIComponent(term)}`
    );
    console.log(data);

    // store only the array of tracks for client-side paging
    lastResultsData = Array.isArray(data.data) ? data.data : [];
    currentPage = 0;
    renderResultsPage();
  } catch (error) {
    console.error("searchSongs error:", error);
    result.innerHTML = `<p>Something went wrong loading results.</p>`;
    more.innerHTML = "";
  }
}

// Format seconds as mm:ss
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const padded = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}:${padded}`;
}

// Render current page of results
function renderResultsPage() {
  if (!Array.isArray(lastResultsData)) {
    result.innerHTML = `<p>No results</p>`;
    more.innerHTML = "";
    return;
  }

  const total = lastResultsData.length;
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageItems = lastResultsData.slice(start, end);

  result.innerHTML = `
    <ul class="songs">
      ${pageItems
        .map(
          (song) => ` <li>
      <div class="song">
        <img src="${
          song.album?.cover_medium || song.album?.cover || ""
        }" alt="${song.album?.title || "Album cover"}" />
        <div class="meta">
          <span><strong>${song.artist?.name || ""}</strong> - ${
            song.title || ""
          }</span>
          <span class="duration">${formatDuration(song.duration || 0)}</span>
          ${
            song.preview ? `<audio controls src="${song.preview}"></audio>` : ""
          }
        </div>
        <button class="btn" data-artist="${
          song.artist?.name || ""
        }" data-songtitle="${song.title || ""}">Get Lyrics</button>
      </div>
    </li>`
        )
        .join("")}
    </ul>
  `;

  // pager buttons
  const totalPages = Math.ceil(total / pageSize);
  const hasPrev = currentPage > 0;
  const hasNext = end < total;
  const showFirstLast = totalPages >= 3;
  const hasMultiplePages = totalPages > 1;

  if (hasMultiplePages) {
    more.innerHTML = `
      ${
        showFirstLast && hasPrev
          ? `<button class="btn pager" data-action="first"><< First</button>`
          : ""
      }
      ${
        hasPrev
          ? `<button class="btn pager" data-action="prev">< Previous</button>`
          : ""
      }
      ${
        hasNext
          ? `<button class="btn pager" data-action="next">Next ></button>`
          : ""
      }
      ${
        showFirstLast && hasNext
          ? `<button class="btn pager" data-action="last">Last >></button>`
          : ""
      }
    `;
  } else {
    more.innerHTML = "";
  }
}

// Show song and artist in DOM (kept for compatibility, delegates to render)
function showData(data) {
  lastResultsData = Array.isArray(data.data) ? data.data : [];
  currentPage = 0;
  renderResultsPage();
}

// Get lyrics for song
async function getLyrics(artist, songTitle) {
  try {
    const data = await fetchJson(
      `${apiURL}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(
        songTitle
      )}`
    );

    const lyrics = data.lyrics.replace(/(\r\n|\r|\n)/g, "<br>");

    result.innerHTML = `<h2><strong>${artist}</strong> - ${songTitle}</h2>
  <span>${lyrics}</span>`;
    more.innerHTML = `<button class="btn" id="backBtn">Back to Results</button>`;
  } catch (error) {
    console.error("getLyrics error:", error);
    result.innerHTML = `<p>Couldn't load lyrics. Please try again.</p>`;
    more.innerHTML = `<button class="btn" id="backBtn">Back to Results</button>`;
  }
}

// Event Listeners
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const searchTerm = search.value.trim();

  if (!searchTerm) {
    alert("Please type in a search term");
  } else {
    searchSongs(searchTerm);
  }
});

// Get lyrics button click
result.addEventListener("click", (e) => {
  const clicked = e.target.closest("button");
  if (!clicked) return;

  const artist = clicked.getAttribute("data-artist");
  const songTitle = clicked.getAttribute("data-songtitle");
  if (artist && songTitle) {
    getLyrics(artist, songTitle);
  }
});

// Back to search results and pager click handling
more.addEventListener("click", (e) => {
  const clicked = e.target.closest("button");
  if (!clicked) return;

  if (clicked.id === "backBtn") {
    renderResultsPage();
    return;
  }

  const action = clicked.getAttribute("data-action");
  if (!action) return;

  const total = Array.isArray(lastResultsData) ? lastResultsData.length : 0;
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  if (action === "first") currentPage = 0;
  if (action === "prev") currentPage = Math.max(0, currentPage - 1);
  if (action === "next") currentPage = Math.min(lastPage, currentPage + 1);
  if (action === "last") currentPage = lastPage;

  renderResultsPage();
});
