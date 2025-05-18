// Global variables
let tracks = []
let currentTrackIndex = 0
let isPlaying = false
const audioElement = document.getElementById("audioPlayer")
const currentPlaylist = []
let likedSongs = []
let userPlaylists = []
let listenHistory = []
let audioContext = null
let analyser = null
let visualizerActive = false

// DOM elements
const playPauseBtn = document.getElementById("playPauseButton")
const prevBtn = document.getElementById("prevButton")
const nextBtn = document.getElementById("nextButton")
const musicTracker = document.getElementById("musicTracker")
const progressFill = document.getElementById("progressFill")
const currentTimeEl = document.getElementById("currentTime")
const durationEl = document.getElementById("duration")
const volumeControl = document.getElementById("volumeControl")
const muteBtn = document.getElementById("muteButton")
const playbar = document.getElementById("playbar")
const searchInput = document.getElementById("searchInput")
const searchButton = document.getElementById("searchButton")
const searchResults = document.getElementById("searchResults")
const resultsContainer = document.getElementById("resultsContainer")
const notificationBadge = document.getElementById("notificationBadge")
const toastNotification = document.getElementById("toastNotification")
const themeToggle = document.getElementById("themeToggle")
const visualizerToggle = document.getElementById("visualizerToggle")
const visualizer = document.getElementById("visualizer")
const visualizerCanvas = document.getElementById("visualizerCanvas")
const menuToggle = document.getElementById("menuToggle")
const sidebar = document.querySelector(".sidebar")
const main = document.querySelector(".main")
const topNav = document.querySelector(".top-nav")
const createPlaylistBtn = document.getElementById("createPlaylistBtn")
const createPlaylistModal = document.getElementById("createPlaylistModal")
const createPlaylistForm = document.getElementById("createPlaylistForm")
const addToPlaylistModal = document.getElementById("addToPlaylistModal")

// Initialize the application
document.addEventListener("DOMContentLoaded", initializeApp)

function initializeApp() {
  // Set theme from localStorage
  const savedTheme = localStorage.getItem("theme") || "dark"
  document.documentElement.setAttribute("data-theme", savedTheme)
  updateThemeToggle(savedTheme)

  // Fetch all songs
  fetchAllSongs()

  // Fetch liked songs if user is authenticated
  if (document.querySelector(".user-info")) {
    fetchLikedSongs()
    fetchUserPlaylists()
    fetchListenHistory()
    generateRecommendations()
  }

  // Attach event listeners
  attachEventListeners()

  // Initialize playbar
  initializePlaybar()

  // Initialize modals
  initializeModals()
}

// Fetch all songs from the API
function fetchAllSongs() {
  // For demo purposes, we'll create some sample tracks
  tracks = [
    {
      id: 1,
      title: "Summer Vibes",
      artist: "DJ Cool",
      image: "/static/images/default.jpg",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      id: 2,
      title: "Chill Beats",
      artist: "Lo-Fi Master",
      image: "/static/images/default.jpg",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
      id: 3,
      title: "Dance Party",
      artist: "Club Kings",
      image: "/static/images/default.jpg",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
  ]


  attachPlayButtonListeners()
  attachLikeButtonListeners()
  attachSongActionListeners()
}

function fetchLikedSongs() {
  fetch('/api/liked_songs/')
    .then(response => response.json())
    .then(data => {
      likedSongs = data;
      updateLikeButtons();
      updateNotificationBadge();
      updateLibraryWithLikedSongs();
    })
    .catch(error => {
      console.error('Error fetching liked songs:', error);
      const likedSongsContainer = document.getElementById('likedSongsContainer');
      if (likedSongsContainer) {
        likedSongsContainer.innerHTML = '<p>Error loading liked songs. Please try again later.</p>';
      }
    });
}

// Add song to liked playlist
function toggleLikeSong(title, artist, audio, image, button) {
    const isLiked = likedSongs.some(song => song.title === title);

    if (isLiked) {
        // Unlike the song
        fetch('/like_song/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ title, artist, image, audio })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Song unliked successfully') {
                likedSongs = likedSongs.filter(song => song.title !== title);
                button.classList.remove('active');
                button.querySelector('i').classList.remove('fa-solid');
                button.querySelector('i').classList.add('fa-regular');
                showToast('Removed from Liked Songs', 'info');
                updateLibraryWithLikedSongs();
            }
        })
        .catch(error => console.error('Error unliking song:', error));
    } else {
        // Like the song
        fetch('/like_song/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ title, artist, image, audio })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Song liked successfully') {
                const newSong = { title, artist, audio, image };
                likedSongs.push(newSong);
                button.classList.add('active');
                button.querySelector('i').classList.remove('fa-regular');
                button.querySelector('i').classList.add('fa-solid');
                showToast('Added to Liked Songs', 'success');
                updateLibraryWithLikedSongs();
            }
        })
        .catch(error => console.error('Error liking song:', error));
    }
}

// Update library with liked songs
function updateLibraryWithLikedSongs() {
    const likedSongsContainer = document.getElementById('likedSongsContainer');

    if (!likedSongsContainer) {
        console.error('Liked Songs container not found');
        return;
    }

    likedSongsContainer.innerHTML = '';

    if (likedSongs.length === 0) {
        likedSongsContainer.innerHTML = '<p>No liked songs yet.</p>';
        return;
    }

    likedSongs.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song';
        songElement.innerHTML = `
            <div class="song-image-container">
                <img src="${song.image}" alt="${song.title}" loading="lazy">
                <div class="song-overlay">
                    <div class="play-btn" data-audio="${song.audio}" data-title="${song.title}" data-artist="${song.artist}" data-image="${song.image}">
                        <i class="fa-solid fa-play"></i>
                    </div>
                </div>
            </div>
            <h4 class="song-title">${song.title}</h4>
            <p class="song-artist">${song.artist}</p>
        `;
        likedSongsContainer.appendChild(songElement);
    });

    // Reattach event listeners to new elements
    attachPlayButtonListeners();
}

// Fetch user playlists
function fetchUserPlaylists() {
    fetch('/api/playlists/', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch playlists');
        }
        return response.json();
    })
    .then(data => {
        userPlaylists = data.playlists || [];
        console.log('Fetched playlists:', userPlaylists); // Debugging log
    })
    .catch(error => {
        console.error('Error fetching playlists:', error);
    });
}

function fetchListenHistory() {
    fetch('/listen_history/')
        .then(response => response.json())
        .then(data => {
            listenHistory = data;
        })
        .catch(error => {
            console.error('Error fetching listen history:', error);
            showToast('Error fetching listen history. Please try again.', 'error');
        });
}

// Generate recommendations based on listening history
async function generateRecommendations() {
    console.log('Starting generateRecommendations...');
    const recommendationsContainer = document.getElementById("recommendationsContainer")
    if (!recommendationsContainer) {
        console.error('Recommendations container not found!');
        return;
    }
    console.log('Found recommendations container');

    // Show loading spinner
    recommendationsContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
        </div>
    `

    try {
        console.log('Fetching recommendations from server...');
        // Fetch recommendations from the server
        const response = await fetch('/get_recommendations/')
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch recommendations: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log('Received recommendations data:', data);
        
        if (data.error) {
            throw new Error(data.error)
        }

        // Clear loading spinner
        recommendationsContainer.innerHTML = ""

        if (!data.recommendations || data.recommendations.length === 0) {
            console.log('No recommendations available');
            recommendationsContainer.innerHTML = `
                <div class="no-recommendations">
                    <p>No recommendations available yet. Try listening to more songs!</p>
                </div>
            `
            return
        }

        console.log('Creating song elements for recommendations...');
        // Create and append song elements
        data.recommendations.forEach((song, index) => {
            console.log(`Creating song element ${index + 1}:`, song);
            const songElement = createSongElement(song)
            recommendationsContainer.appendChild(songElement)
        })

        // Attach event listeners to new elements
        attachPlayButtonListeners()
        attachLikeButtonListeners()
        attachSongActionListeners()
        console.log('Recommendations loaded successfully');

    } catch (error) {
        console.error('Error loading recommendations:', error)
        recommendationsContainer.innerHTML = `
            <div class="error-message">
                <p>Failed to load recommendations. Please try again later.</p>
                <p class="error-details">${error.message}</p>
            </div>
        `
    }
}

// Call generateRecommendations when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, calling generateRecommendations...');
    // Removing duplicate call since it's already called in initializeApp
})

// Create a song element
function createSongElement(song) {
    const songElement = document.createElement("div")
    songElement.className = "recommendation-item"
    songElement.setAttribute("data-song-id", song.id || song.title)
    
    songElement.innerHTML = `
        <div class="recommendation-info">
            <h4>${song.title}</h4>
            <p>${song.artist}</p>
        </div>
        <div class="recommendation-actions">
            <button class="play-btn" data-audio="${song.audio_url}" data-title="${song.title}" data-artist="${song.artist}">
                <i class="fa-solid fa-play"></i>
            </button>
            <button class="heart-btn" data-title="${song.title}" data-artist="${song.artist}" data-audio="${song.audio_url}">
                <i class="fa-regular fa-heart"></i>
            </button>
        </div>
    `

    // Add click event listener to the entire recommendation item
    songElement.addEventListener('click', function(e) {
        // Don't trigger if clicking on buttons
        if (e.target.closest('button')) return;
        
        const audioUrl = song.audio_url;
        const title = song.title;
        const artist = song.artist;
        
        playSong(audioUrl, title, artist);
    });

    return songElement
}

// Attach event listeners to various elements
function attachEventListeners() {
  // Play/Pause button
  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", togglePlayPause)
  }

  // Previous and Next buttons
  if (prevBtn) {
    prevBtn.addEventListener("click", playPrevious)
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", playNext)
  }

  // Music tracker (progress bar)
  if (musicTracker) {
    musicTracker.addEventListener("input", seekTrack)
  }

  // Volume control
  if (volumeControl) {
    volumeControl.addEventListener("input", adjustVolume)
  }

  if (muteBtn) {
    muteBtn.addEventListener("click", toggleMute)
  }

  // Audio element events
  if (audioElement) {
    audioElement.addEventListener("timeupdate", updateProgress)
    audioElement.addEventListener("ended", handleTrackEnd)
    audioElement.addEventListener("play", () => updatePlayPauseButton(true))
    audioElement.addEventListener("pause", () => updatePlayPauseButton(false))
    audioElement.addEventListener("loadedmetadata", updateDuration)
  }

  // Search functionality
  if (searchInput && searchButton) {
    searchInput.addEventListener("input", handleSearch)

    // Close search results when clicking outside
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    })
  }

  // Mood filter buttons
  document.querySelectorAll(".mood-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mood = btn.getAttribute("data-mood")
      fetchSongsByMood(mood)

      // Toggle active class
      document.querySelectorAll(".mood-btn").forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
    })
  })

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme)
  }

  // Visualizer toggle
  if (visualizerToggle) {
    visualizerToggle.addEventListener("click", toggleVisualizer)
  }

  // Menu toggle for mobile
  if (menuToggle) {
    menuToggle.addEventListener("click", toggleSidebar)
  }

  // History link
  const historyLink = document.getElementById("historyLink")
  if (historyLink) {
    historyLink.addEventListener("click", showHistoryModal)
  }

  // Create playlist button
  if (createPlaylistBtn) {
    createPlaylistBtn.addEventListener("click", showCreatePlaylistModal)
  }

  // View history button
  const viewHistoryBtn = document.getElementById("viewHistoryBtn")
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", showHistoryModal)
  }

  // Create playlist button in modal
  const createPlaylistBtnInModal = document.getElementById("createPlaylistBtnInModal")
  if (createPlaylistBtnInModal) {
    createPlaylistBtnInModal.addEventListener("click", showCreatePlaylistModal)
  }

  const createNewPlaylistBtn = document.getElementById("createNewPlaylistBtn")
  if (createNewPlaylistBtn) {
    createNewPlaylistBtn.addEventListener("click", showCreatePlaylistModal)
  }
}

// Fix playbar functionality
function initializePlaybar() {
  if (!audioElement || !volumeControl) return

  // Set initial volume
  audioElement.volume = volumeControl.value / 100

  // Update playbar visibility
  if (tracks.length > 0) {
    if (playbar) {
      playbar.classList.add("active")
    }
  }
}

// Initialize modals
function initializeModals() {
  // Close modal buttons
  document.querySelectorAll(".close-modal, .cancel-modal").forEach((btn) => {
    btn.addEventListener("click", closeAllModals)
  })


  // Share options
  document.querySelectorAll(".share-option").forEach((option) => {
    option.addEventListener("click", handleShare)
  })

  // Copy link button
  const copyLinkBtn = document.getElementById("copyLinkBtn")
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", copyShareLink)
  }

  // Clear history button
  const clearHistoryBtn = document.getElementById("clearHistoryBtn")
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory)
  }

  // History filter
  const historyFilter = document.getElementById("historyFilter")
  if (historyFilter) {
    historyFilter.addEventListener("change", filterHistory)
  }

  // Liked songs modal open button
  const likedSongsLink = document.getElementById("likedSongsLink");
  if (likedSongsLink) {
    likedSongsLink.addEventListener("click", (e) => {
      e.preventDefault();
      showLikedSongsModal();
    });
  }
}

// Show liked songs modal
function showLikedSongsModal() {
    const likedSongsModal = document.getElementById("likedSongsModal");

    if (!likedSongsModal) {
        console.error("Liked Songs modal not found");
        return;
    }

    // Populate liked songs
    const likedSongsContainerModal = document.getElementById("likedSongsContainerModal");

    if (likedSongsContainerModal) {
        likedSongsContainerModal.innerHTML = "";

        if (likedSongs.length === 0) {
            likedSongsContainerModal.innerHTML = "<p>No liked songs yet.</p>";
        } else {
            likedSongs.forEach((song, index) => {
                const songElement = document.createElement("div");
                songElement.className = "song";
                songElement.innerHTML = `
                    <div class="song-image-container">
                        <img src="${song.image}" alt="${song.title}" loading="lazy">
                        <div class="song-overlay">
                            <div class="play-btn" data-audio="${song.audio_url || song.audio}" data-title="${song.title}" data-artist="${song.artist}" data-image="${song.image}">
                                <i class="fa-solid fa-play"></i>
                            </div>
                            <div class="heart-btn" data-title="${song.title}" data-artist="${song.artist}" data-audio="${song.audio_url || song.audio}" data-image="${song.image}">
                                <i class="fa-solid fa-heart"></i>
                            </div>
                        </div>
                    </div>
                    <h4 class="song-title">${song.title}</h4>
                    <p class="song-artist">${song.artist}</p>
                `;
                likedSongsContainerModal.appendChild(songElement);
            });

            // Attach event listeners
            likedSongsContainerModal.querySelectorAll(".play-btn").forEach((btn) => {
                btn.addEventListener("click", function () {
                    const audioUrl = this.getAttribute("data-audio");
                    const title = this.getAttribute("data-title");
                    const artist = this.getAttribute("data-artist");
                    const image = this.getAttribute("data-image");

                    playSong(audioUrl, title, artist, image);
                    closeAllModals();
                });
            });

            likedSongsContainerModal.querySelectorAll(".heart-btn").forEach((btn) => {
                btn.addEventListener("click", function (e) {
                    e.stopPropagation();

                    const title = this.getAttribute("data-title");
                    const artist = this.getAttribute("data-artist");
                    const audio = this.getAttribute("data-audio");
                    const image = this.getAttribute("data-image");

                    toggleLikeSong(title, artist, audio, image, this);
                });
            });
        }
    }

    likedSongsModal.classList.add("active");
    document.body.classList.add("modal-open");
}

// Attach play button listeners to all play buttons
function attachPlayButtonListeners() {
  document.querySelectorAll(".play-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const audioUrl = this.getAttribute("data-audio")
      const title = this.getAttribute("data-title")
      const artist = this.getAttribute("data-artist")
      const image = this.getAttribute("data-image")

      playSong(audioUrl, title, artist, image)
    })
  })
}

// Attach like button listeners to all like buttons
function attachLikeButtonListeners() {
  document.querySelectorAll(".heart-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation()

      const title = this.getAttribute("data-title")
      const artist = this.getAttribute("data-artist")
      const audio = this.getAttribute("data-audio")
      const image = this.getAttribute("data-image")

      toggleLikeSong(title, artist, audio, image, this)
    })
  })
}

// Attach song action listeners
function attachSongActionListeners() {
  console.log("Attaching song action listeners..."); // Debugging log

  // Add to playlist buttons
  document.querySelectorAll(".add-to-playlist-btn").forEach((btn) => {
    console.log("Found add-to-playlist button:", btn); // Debugging log

    btn.addEventListener("click", function (e) {
      e.stopPropagation();

      const title = this.getAttribute("data-title");
      const artist = this.getAttribute("data-artist");
      const audio = this.getAttribute("data-audio");
      const image = this.getAttribute("data-image");

      console.log("Add to playlist clicked for:", { title, artist, audio, image }); // Debugging log

      showAddToPlaylistModal(title, artist, audio, image);
    });
  });
}

// Update like buttons based on liked songs
function updateLikeButtons() {
  document.querySelectorAll(".heart-btn").forEach((btn) => {
    const title = btn.getAttribute("data-title")
    const isLiked = likedSongs.some((song) => song.title === title)

    if (isLiked) {
      btn.classList.add("active")
      btn.querySelector("i").classList.remove("fa-regular")
      btn.querySelector("i").classList.add("fa-solid")
    } else {
      btn.classList.remove("active")
      btn.querySelector("i").classList.remove("fa-solid")
      btn.querySelector("i").classList.add("fa-regular")
    }
  })
}

// Play a song with the given details
function playSong(audioUrl, title, artist, image) {
  if (!audioElement) return

  // Update now playing info
  const nowPlayingTitle = document.getElementById("nowPlayingTitle")
  const nowPlayingArtist = document.getElementById("nowPlayingArtist")

  if (nowPlayingTitle) nowPlayingTitle.textContent = title
  if (nowPlayingArtist) nowPlayingArtist.textContent = artist

  // Set audio source and play
  audioElement.src = audioUrl
  audioElement
    .play()
    .then(() => {
      isPlaying = true
      updatePlayPauseButton(true)
      if (playbar) playbar.classList.add("active")

      // Add to listen history
      addToListenHistory(title, artist, audioUrl)

      // Initialize visualizer if active
      if (visualizerActive) {
        initializeVisualizer()
      }
    })
    .catch((error) => {
      console.error("Error playing audio:", error)
      showToast("Error playing audio. Please try again.", "error")
    })

  // Find the index of the current track
  currentTrackIndex = tracks.findIndex((track) => track.title === title && track.artist === artist)
}

// Add song to listen history
function addToListenHistory(title, artist, audio) {
  if (!document.querySelector(".user-info")) return

  listenHistory.unshift({
    id: Date.now(),
    title: title,
    artist: artist,
    audio_url: audio,
    timestamp: new Date().toISOString(),
  })
}

// Toggle play/pause
function togglePlayPause() {
  if (!audioElement) return

  if (audioElement.src) {
    if (audioElement.paused) {
      audioElement
        .play()
        .then(() => {
          isPlaying = true
          updatePlayPauseButton(true)
        })
        .catch((error) => {
          console.error("Error playing audio:", error)
          showToast("Error playing audio. Please try again.", "error")
        })
    } else {
      audioElement.pause()
      isPlaying = false
      updatePlayPauseButton(false)
    }
  }
}

// Update play/pause button icon
function updatePlayPauseButton(isPlaying) {
  if (!playPauseBtn) return

  if (isPlaying) {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'
  } else {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>'
  }
}

// Play previous track
function playPrevious() {
  if (tracks.length === 0) return

  currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length
  const track = tracks[currentTrackIndex]

  playSong(track.audio_url, track.title, track.artist, track.image)
}

// Play next track
function playNext() {
  if (tracks.length === 0) return

  currentTrackIndex = (currentTrackIndex + 1) % tracks.length
  const track = tracks[currentTrackIndex]

  playSong(track.audio_url, track.title, track.artist, track.image)
}

// Handle track end
function handleTrackEnd() {
  playNext()
}

// Update progress bar during playback
function updateProgress() {
  if (!audioElement || !musicTracker || !progressFill || !currentTimeEl) return

  if (isNaN(audioElement.duration)) return

  const progress = (audioElement.currentTime / audioElement.duration) * 100
  musicTracker.value = progress
  progressFill.style.width = `${progress}%`

  currentTimeEl.textContent = formatTime(audioElement.currentTime)

  // Update visualizer if active
  if (visualizerActive && analyser) {
    drawVisualizer()
  }
}

// Update duration when metadata is loaded
function updateDuration() {
  if (!audioElement || !durationEl) return

  if (!isNaN(audioElement.duration)) {
    durationEl.textContent = formatTime(audioElement.duration)
  }
}

// Seek to a specific position in the track
function seekTrack() {
  if (!audioElement || !musicTracker) return

  const seekTime = (audioElement.duration * musicTracker.value) / 100
  audioElement.currentTime = seekTime
}

// Adjust volume
function adjustVolume() {
  if (!audioElement || !volumeControl || !muteBtn) return

  audioElement.volume = volumeControl.value / 100
  if (audioElement.volume === 0) {
    muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>'
  } else {
    muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>'
  }
}

// Toggle mute
function toggleMute() {
  if (!audioElement || !volumeControl || !muteBtn) return

  if (audioElement.volume > 0) {
    audioElement.volume = 0
    volumeControl.value = 0
    muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>'
  } else {
    audioElement.volume = volumeControl.value / 100
    muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>'
  }
}

// Show toast notification
function showToast(message, type = "success") {
  if (!toastNotification) return

  const toastIcon = toastNotification.querySelector(".toast-icon")
  const toastMessage = toastNotification.querySelector(".toast-message")

  if (toastIcon) {
    if (type === "success") {
      toastIcon.className = "fa-solid fa-circle-check toast-icon"
      toastIcon.style.color = "var(--success-color)"
    } else if (type === "error") {
      toastIcon.className = "fa-solid fa-circle-xmark toast-icon"
      toastIcon.style.color = "var(--error-color)"
    } else if (type === "warning") {
      toastIcon.className = "fa-solid fa-triangle-exclamation toast-icon"
      toastIcon.style.color = "var(--warning-color)"
    } else if (type === "info") {
      toastIcon.className = "fa-solid fa-circle-info toast-icon"
      toastIcon.style.color = "var(--info-color)"
    }
  }

  if (toastMessage) {
    toastMessage.textContent = message
  }

  toastNotification.classList.add("show")

  setTimeout(() => {
    toastNotification.classList.remove("show")
  }, 3000)
}

// Update notification badge based on liked songs
function updateNotificationBadge() {
  if (!notificationBadge) return

  if (likedSongs.length > 0) {
    notificationBadge.textContent = likedSongs.length
    notificationBadge.classList.add("active")
  } else {
    notificationBadge.classList.remove("active")
  }
}

// Fix theme toggle functionality
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"

  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeToggle(newTheme)
}

function updateThemeToggle(theme) {
  if (!themeToggle) return

  const icon = themeToggle.querySelector("i")
  const label = themeToggle.querySelector("span")

  if (icon && label) {
    if (theme === "dark") {
      icon.className = "fa-solid fa-sun"
      label.textContent = "Light Mode"
    } else {
      icon.className = "fa-solid fa-moon"
      label.textContent = "Dark Mode"
    }
  }
}

// Toggle visualizer
function toggleVisualizer() {
  if (!visualizer) return

  visualizerActive = !visualizerActive
  visualizer.classList.toggle("active", visualizerActive)

  if (visualizerActive) {
    initializeVisualizer()
  } else {
    destroyVisualizer()
  }
}

function initializeVisualizer() {
  if (!audioElement || !visualizerCanvas) return

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    const source = audioContext.createMediaElementSource(audioElement)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    visualizerCanvas.width = visualizer.offsetWidth
    visualizerCanvas.height = visualizer.offsetHeight
  }
  drawVisualizer()
}

function drawVisualizer() {
  if (!analyser || !visualizerCanvas) return

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)

  const canvasCtx = visualizerCanvas.getContext("2d")
  canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height)

  const barWidth = (visualizerCanvas.width / bufferLength) * 2.5
  let barHeight
  let x = 0

  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i] / 2
    canvasCtx.fillStyle = `rgb(${barHeight + 100},50,50)`
    canvasCtx.fillRect(x, visualizerCanvas.height - barHeight / 2, barWidth, barHeight)
    x += barWidth + 1
  }

  if (visualizerActive) {
    requestAnimationFrame(drawVisualizer)
  }
}

function destroyVisualizer() {
  if (audioContext) {
    audioContext.close()
    audioContext = null
    analyser = null
  }
}

// Handle search input
function handleSearch(query) {
    if (!searchResults || !searchResultsList) return;

    if (query.trim() === "") {
        searchResults.style.display = 'none';
        return;
    }

    // Get all songs from the page
    const allSongs = [];
    
    // Get songs from all playlists
    document.querySelectorAll('.playlist-card .song').forEach(song => {
        const title = song.querySelector('.song-title')?.textContent;
        const artist = song.querySelector('.song-artist')?.textContent;
        const audio = song.querySelector('.play-btn')?.dataset.audio;
        const image = song.querySelector('img')?.src || '/static/images/default.jpg';
        
        if (title && artist && audio) {
            allSongs.push({ title, artist, audio, image });
        }
    });

    // Get songs from recommendations
    document.querySelectorAll('.recommendation-item').forEach(item => {
        const title = item.querySelector('h4').textContent;
        const artist = item.querySelector('p').textContent;
        const audio = item.querySelector('.play-btn').dataset.audio;
        const image = item.querySelector('img')?.src || '/static/images/default.jpg';
        
        allSongs.push({ title, artist, audio, image });
    });

    // Filter songs based on search query
    const results = allSongs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase()) || 
        song.artist.toLowerCase().includes(query.toLowerCase())
    );

    // Display results (limited to 5)
    if (results.length > 0) {
        searchResultsList.innerHTML = '';
        const limitedResults = results.slice(0, 5);
        
        limitedResults.forEach(song => {
            const songElement = document.createElement('div');
            songElement.className = 'search-result-item';
            songElement.innerHTML = `
                <div class="search-result-content">
                    <img src="${song.image}" alt="${song.title}" class="search-result-image">
                    <div class="search-result-info">
                        <h4>${song.title}</h4>
                        <p>${song.artist}</p>
                    </div>
                    <div class="search-result-actions">
                        <button class="play-btn" data-audio="${song.audio}" data-title="${song.title}" data-artist="${song.artist}" data-image="${song.image}">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <button class="heart-btn" data-title="${song.title}" data-artist="${song.artist}" data-audio="${song.audio}" data-image="${song.image}">
                            <i class="fa-regular fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Add click handler to the entire result item
            songElement.addEventListener('click', (e) => {
                if (!e.target.closest('.search-result-actions')) {
                    const audioUrl = song.audio;
                    const title = song.title;
                    const artist = song.artist;
                    const image = song.image;
                    playSong(audioUrl, title, artist, image);
                    searchResults.style.display = 'none';
                }
            });
            
            searchResultsList.appendChild(songElement);
        });

        document.querySelector('.search-results-count').textContent = 
            results.length > 5 ? `Showing 5 of ${results.length} results` : `${results.length} results found`;
        searchResults.style.display = 'block';
    } else {
        searchResultsList.innerHTML = '<div class="no-results">No songs found</div>';
        document.querySelector('.search-results-count').textContent = '0 results found';
        searchResults.style.display = 'block';
    }

    // Attach event listeners to new elements
    attachPlayButtonListeners();
    attachLikeButtonListeners();
}

// Add event listener for search input with debounce
const debouncedSearch = debounce((e) => {
    handleSearch(e.target.value);
}, 300);

document.getElementById('searchInput').addEventListener('input', debouncedSearch);

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
    }
});

// Close search results when clicking close button
document.getElementById('searchResultsCloseBtn').addEventListener('click', () => {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('searchInput').value = '';
});

function fetchSongsByMood(mood) {
  // For demo purposes, we'll filter the tracks array
  const results = tracks.filter((track) => track.mood === mood)



  displayMoodSongs(results.length > 0 ? results : tracks)
}

function displayMoodSongs(songs) {
  // Create a new playlist card for the mood
  const playlistsContainer = document.getElementById("playlistsContainer")

  if (!playlistsContainer) return

  // Check if there's already a mood playlist card
  const existingMoodCard = document.querySelector(".mood-playlist-card")
  if (existingMoodCard) {
    existingMoodCard.remove()
  }

  const moodCard = document.createElement("div")
  moodCard.className = "card playlist-card mood-playlist-card"
  moodCard.innerHTML = `
        <h3>Mood Selection</h3>
        <div class="item">
            ${songs
              .map(
                (song, index) => `
                <div class="song" data-song-id="${index}">
                    <div class="song-image-container">
                        <img src="${song.image}" alt="${song.title}" loading="lazy">
                        <div class="song-overlay">
                            <div class="play-btn" data-audio="${song.audio_url}" data-title="${song.title}" data-artist="${song.artist}" data-image="${song.image}">
                                <i class="fa-solid fa-play"></i>
                            </div>
                            <div class="heart-btn" data-title="${song.title}" data-artist="${song.artist}" data-audio="${song.audio_url}" data-image="${song.image}">
                                <i class="fa-regular fa-heart"></i>
                            </div>
                            <div class="song-actions">
                                <button class="song-action-btn share-btn" data-title="${song.title}" data-artist="${song.artist}" data-audio="${song.audio_url}">
                                    <i class="fa-solid fa-share-nodes"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <h4 class="song-title">${song.title}</h4>
                    <p class="song-artist">${song.artist}</p>
                </div>
            `,
              )
              .join("")}
        </div>
    `

  // Insert after the button container
  const buttonContainer = document.querySelector(".button-container")
  if (buttonContainer && buttonContainer.nextSibling) {
    playlistsContainer.insertBefore(moodCard, buttonContainer.nextSibling)
  } else {
    playlistsContainer.appendChild(moodCard)
  }

  // Attach event listeners to new elements
  attachPlayButtonListeners()
  attachLikeButtonListeners()
  attachSongActionListeners()
  updateLikeButtons()
}

// Toggle sidebar for mobile view
function toggleSidebar() {
  if (!sidebar || !main || !topNav || !menuToggle) return

  sidebar.classList.toggle("active")
  main.classList.toggle("active")
  topNav.classList.toggle("active")
  menuToggle.classList.toggle("active")
}

// Show create playlist modal
function showCreatePlaylistModal() {
  if (!createPlaylistModal) return

  createPlaylistModal.classList.add("active")
  document.body.classList.add("modal-open")
}

function closeAllModals() {
  const modals = document.querySelectorAll(".modal.active")
  modals.forEach((modal) => {
    modal.classList.remove("active")
    document.body.classList.remove("modal-open")
  })
}

function handleCreatePlaylist(event) {
    event.preventDefault()

    const playlistName = document.getElementById("playlistName").value
    const playlistDescription = document.getElementById("playlistDescription").value

    // Create new playlist object
    const newPlaylist = {
        id: Date.now(),
        name: playlistName,
        description: playlistDescription,
        songs: []
    }

    // Add to userPlaylists array
    userPlaylists.push(newPlaylist)

    // Create playlist card in DOM
    const playlistsContainer = document.getElementById("playlistsContainer")
    if (playlistsContainer) {
        const playlistCard = document.createElement("div")
        playlistCard.className = "card playlist-card"
        playlistCard.innerHTML = `
            <h3>${playlistName}</h3>
            <div class="item">
                <div class="song add-song">
                    <div class="song-image-container">
                        <div class="add-song-icon">
                            <i class="fa-solid fa-plus"></i>
                        </div>
                    </div>
                    <h4 class="song-title">Add Songs</h4>
                    <p class="song-artist">to this playlist</p>
                </div>
            </div>
        `

        // Add click event to the add song button
        const addSongBtn = playlistCard.querySelector(".add-song")
        if (addSongBtn) {
            addSongBtn.addEventListener("click", () => {
                showAddSongsToPlaylistModal(newPlaylist)
            })
        }

        playlistsContainer.appendChild(playlistCard)
    }

    showToast("Playlist created successfully!", "success")
    closeAllModals()

    // Reset form
    document.getElementById("playlistName").value = ""
    document.getElementById("playlistDescription").value = ""
}

function showAddToPlaylistModal(title, artist, audio, image) {
    const addToPlaylistModal = document.getElementById("addToPlaylistModal")
    if (!addToPlaylistModal) return

    // Set selected song info
    const selectedSongTitle = document.getElementById("selectedSongTitle")
    const selectedSongArtist = document.getElementById("selectedSongArtist")
    if (selectedSongTitle) selectedSongTitle.textContent = title
    if (selectedSongArtist) selectedSongArtist.textContent = artist

    // Populate playlists dropdown
    const playlistDropdown = document.getElementById("playlistDropdown")
    if (playlistDropdown) {
        playlistDropdown.innerHTML = "<option value=''>Select a playlist</option>"
        
        if (userPlaylists.length === 0) {
            playlistDropdown.innerHTML += "<option value='' disabled>No playlists available</option>"
        } else {
            userPlaylists.forEach(playlist => {
                const option = document.createElement("option")
                option.value = playlist.id
                option.textContent = playlist.name
                playlistDropdown.appendChild(option)
            })
        }
    }

    // Show the modal
    addToPlaylistModal.classList.add("active")
    document.body.classList.add("modal-open")

    // Handle Add to Playlist button click
    const addSongToPlaylistBtn = document.getElementById("addSongToPlaylistBtn")
    if (addSongToPlaylistBtn) {
        addSongToPlaylistBtn.onclick = function() {
            const selectedPlaylistId = playlistDropdown.value
            if (!selectedPlaylistId) {
                showToast("Please select a playlist", "warning")
                return
            }

            addSongToPlaylist(selectedPlaylistId, title, artist, audio, image)
        }
    }
}

function addSongToPlaylist(playlistId, title, artist, audio, image) {
    const playlist = userPlaylists.find(p => p.id === parseInt(playlistId))
    if (!playlist) {
        showToast("Playlist not found", "error")
        return
    }

    // Check if song already exists in playlist
    const songExists = playlist.songs.some(s => s.title === title && s.artist === artist)
    if (songExists) {
        showToast("Song already exists in this playlist", "warning")
        return
    }

    // Add song to playlist
    playlist.songs.push({
        id: Date.now(),
        title: title,
        artist: artist,
        audio_url: audio,
        image: image
    })

    showToast("Song added to playlist!", "success")
    closeAllModals()

    // Update the playlist in the DOM
    updatePlaylistInDOM(playlist)
}

function updatePlaylistInDOM(playlist) {
  const playlistCards = document.querySelectorAll(".playlist-card")

  playlistCards.forEach((card) => {
    const title = card.querySelector("h3")

    if (title && title.textContent === playlist.name) {
      const itemContainer = card.querySelector(".item")

      if (itemContainer) {
        // Keep the add song button
        const addSongBtn = itemContainer.querySelector(".add-song")

        itemContainer.innerHTML = ""

        if (addSongBtn) {
          itemContainer.appendChild(addSongBtn)
        }

        // Add songs
        playlist.songs.forEach((song, index) => {
          const songElement = document.createElement("div")
          songElement.className = "song"
          songElement.setAttribute("data-song-id", index)

          songElement.innerHTML = `
                        <div class="song-image-container">
                        <img src="${song.image}" alt="${song.title}" loading="lazy">
                        <div class="song-overlay">
                        <div class="play-btn" data-audio="${song.audio_url}" data-title="${song.title}" data-artist="${song.artist}" data-image="${song.image}">
                        <i class="fa-solid fa-play"></i>
                        </div>
                        <div class="heart-btn" data-title="${song.title}" data-artist="${song.artist}" data-audio="${song.audio_url}" data-image="${song.image}">
                        <i class="fa-regular fa-heart"></i>
                        </div>
                        <div class="song-actions">
                        <button class="song-action-btn remove-from-playlist-btn" data-playlist-id="${playlist.id}" data-song-index="${index}">
                        <i class="fa-solid fa-trash"></i>
                        </button>
                        <button class="song-action-btn share-btn" data-title="${song.title}" data-artist="${song.artist}" data-audio="${song.audio_url}">
                        <i class="fa-solid fa-share-nodes"></i>
                        </button>
                        </div>
                        </div>
                        </div>
                        <h4 class="song-title">${song.title}</h4>
                        <p class="song-artist">${song.artist}</p>
                        `

          itemContainer.appendChild(songElement)
        })

        // Attach event listeners to new elements
        attachPlayButtonListeners()
        attachLikeButtonListeners()
        attachSongActionListeners()
        updateLikeButtons()

        // Attach remove from playlist listeners
        itemContainer.querySelectorAll(".remove-from-playlist-btn").forEach((btn) => {
          btn.addEventListener("click", function (e) {
            e.stopPropagation()

            const playlistId = Number.parseInt(this.getAttribute("data-playlist-id"))
            const songIndex = Number.parseInt(this.getAttribute("data-song-index"))

            removeSongFromPlaylist(playlistId, songIndex)
          })
        })
      }
    }
  })
}

function removeSongFromPlaylist(playlistId, songIndex) {
  const playlist = userPlaylists.find((p) => p.id === playlistId)

  if (!playlist || songIndex < 0 || songIndex >= playlist.songs.length) return

  // Remove song from playlist
  playlist.songs.splice(songIndex, 1)



  showToast("Song removed from playlist!", "success")

  // Update the playlist in the DOM
  updatePlaylistInDOM(playlist)
}

function showShareModal(title, artist, audio) {
  const shareModal = document.getElementById("shareModal")

  if (!shareModal) return

  // Set share song info
  const shareSongImage = document.getElementById("shareSongImage")
  const shareSongTitle = document.getElementById("shareSongTitle")
  const shareSongArtist = document.getElementById("shareSongArtist")
  const shareLink = document.getElementById("shareLink")

  if (shareSongImage) shareSongImage.src = "/static/images/default.jpg"
  if (shareSongTitle) shareSongTitle.textContent = title
  if (shareSongArtist) shareSongArtist.textContent = artist
  if (shareLink) shareLink.value = audio

  // Set data attributes for share options
  document.querySelectorAll(".share-option").forEach((option) => {
    option.setAttribute("data-title", title)
    option.setAttribute("data-artist", artist)
    option.setAttribute("data-audio", audio)
  })

  shareModal.classList.add("active")
  document.body.classList.add("modal-open")
}

// Fix share functionality
function handleShare(event) {
  const platform = event.currentTarget.getAttribute("data-platform")
  const title = event.currentTarget.getAttribute("data-title")
  const artist = event.currentTarget.getAttribute("data-artist")
  const audio = event.currentTarget.getAttribute("data-audio")

  switch (platform) {
    case "facebook":
      shareOnFacebook(title, artist, audio)
      break
    case "twitter":
      shareOnTwitter(title, artist, audio)
      break
    case "whatsapp":
      shareOnWhatsApp(title, artist, audio)
      break
    case "telegram":
      shareOnTelegram(title, artist, audio)
      break
    default:
      break
  }
}



function showHistoryModal() {
    const historyModal = document.getElementById("historyModal");

    if (!historyModal) {
        console.error("History modal not found");
        return;
    }

    // Populate history
    const historyContainer = document.getElementById("historyContainer");

    if (historyContainer) {
        historyContainer.innerHTML = "";

        if (listenHistory.length === 0) {
            historyContainer.innerHTML = "<p>No listening history available.</p>";
        } else {
            listenHistory.forEach((item, index) => {
                const historyItem = document.createElement("div");
                historyItem.className = "history-item";

                const date = new Date(item.timestamp);
                const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

                historyItem.innerHTML = `
                    <img src="${item.image}" alt="${item.title}">
                    <div class="history-item-info">
                        <h4>${item.title}</h4>
                        <p>${item.artist}</p>
                    </div>
                    <div class="history-item-time">${formattedDate}</div>
                    <div class="history-item-actions">
                        <button class="play-history-btn" data-audio="${item.audio_url}" data-title="${item.title}" data-artist="${item.artist}" data-image="${item.image}">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <button class="remove-history-btn" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;

                historyContainer.appendChild(historyItem);
            });

            // Attach event listeners
            historyContainer.querySelectorAll(".play-history-btn").forEach((btn) => {
                btn.addEventListener("click", function () {
                    const audioUrl = this.getAttribute("data-audio");
                    const title = this.getAttribute("data-title");
                    const artist = this.getAttribute("data-artist");
                    const image = this.getAttribute("data-image");

                    playSong(audioUrl, title, artist, image);
                    closeAllModals();
                });
            });

            historyContainer.querySelectorAll(".remove-history-btn").forEach((btn) => {
                btn.addEventListener("click", function () {
                    const index = Number.parseInt(this.getAttribute("data-index"));
                    removeFromHistory(index);
                });
            });
        }
    }

    historyModal.classList.add("active");
    document.body.classList.add("modal-open");
}

function removeFromHistory(index) {
  if (index < 0 || index >= listenHistory.length) return

  // Remove from history
  listenHistory.splice(index, 1)



  showToast("Removed from history!", "success")

  // Update the history modal
  showHistoryModal()
}

function clearHistory() {
  // Clear history
  listenHistory = []



  showToast("History cleared!", "success")

  // Update the history modal
  showHistoryModal()
}

function filterHistory() {
  const historyFilter = document.getElementById("historyFilter")

  if (!historyFilter) return

  const filterValue = historyFilter.value
  let filteredHistory = [...listenHistory]

  const now = new Date()

  if (filterValue === "today") {
    filteredHistory = listenHistory.filter((item) => {
      const date = new Date(item.timestamp)
      return date.toDateString() === now.toDateString()
    })
  } else if (filterValue === "week") {
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)

    filteredHistory = listenHistory.filter((item) => {
      const date = new Date(item.timestamp)
      return date >= weekAgo
    })
  } else if (filterValue === "month") {
    const monthAgo = new Date(now)
    monthAgo.setMonth(now.getMonth() - 1)

    filteredHistory = listenHistory.filter((item) => {
      const date = new Date(item.timestamp)
      return date >= monthAgo
    })
  }

  // Update the history container
  const historyContainer = document.getElementById("historyContainer")

  if (historyContainer) {
    historyContainer.innerHTML = ""

    if (filteredHistory.length === 0) {
      historyContainer.innerHTML = "<p>No listening history available for this period.</p>"
    } else {
      filteredHistory.forEach((item, index) => {
        const historyItem = document.createElement("div")
        historyItem.className = "history-item"

        const date = new Date(item.timestamp)
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`

        historyItem.innerHTML = `
                    <img src="${item.image}" alt="${item.title}">
                    <div class="history-item-info">
                    <h4>${item.title}</h4>
                    <p>${item.artist}</p>
                    </div>
                    <div class="history-item-time">${formattedDate}</div>
                    <div class="history-item-actions">
                    <button class="play-history-btn" data-audio="${item.audio_url}" data-title="${item.title}" data-artist="${item.artist}" data-image="${item.image}">
                    <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="remove-history-btn" data-index="${index}">
                    <i class="fa-solid fa-trash"></i>
                    </button>
                    </div>
                    `

        historyContainer.appendChild(historyItem)
      })

      // Attach event listeners
      historyContainer.querySelectorAll(".play-history-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const audioUrl = this.getAttribute("data-audio")
          const title = this.getAttribute("data-title")
          const artist = this.getAttribute("data-artist")
          const image = this.getAttribute("data-image")

          playSong(audioUrl, title, artist, image)
          closeAllModals()
        })
      })

      historyContainer.querySelectorAll(".remove-history-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const index = Number.parseInt(this.getAttribute("data-index"))
          removeFromHistory(index)
        })
      })
    }
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function getCookie(name) {
  const cookieValue = document.cookie.split("; ").find((row) => row.startsWith(name + "="))
  return cookieValue ? decodeURIComponent(cookieValue.split("=")[1]) : null
}

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp)

