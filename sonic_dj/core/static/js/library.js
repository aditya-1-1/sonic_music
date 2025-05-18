

let playlists = {};

// Player state
let currentPlaylist = [];
let currentSongIndex = 0;
const audioPlayer = document.getElementById("audioPlayer");
const progressBar = document.getElementById("musicTracker");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

// Fetch liked songs from server and update playlists.liked.songs
async function fetchLikedSongs() {
    try {
        const response = await fetch("/liked_songs/");
        if (!response.ok) throw new Error('Network response was not ok');

        const songs = await response.json();
        // Update liked songs playlist songs array
        if (!playlists.liked) {
            playlists.liked = {
                title: "Liked Songs",
                info: "Your favorite songs",
                image: "https://i.pinimg.com/originals/86/53/b7/8653b7adfef02f644c40131104fa1b10.jpg",
                songs: []
            };
        }
        playlists.liked.songs = songs;
        renderAllPlaylists(); // Re-render all playlists to update liked songs
    } catch (error) {
        console.error("Error fetching liked songs:", error);
        showError("Failed to load liked songs");
    }
}

// Render all playlists and their songs in the library section
function renderAllPlaylists() {
    const container = document.getElementById("library-playlists");
    container.innerHTML = "";
    console.log("Rendering playlists:", Object.keys(playlists));

    for (const [key, playlist] of Object.entries(playlists)) {
        console.log("Rendering playlist:", key, playlist.title);
        const section = document.createElement("div");
        section.className = "playlist-section";
        section.id = `playlist-${key}`;

        // Playlist header
        const header = document.createElement("div");
        header.className = "playlist-header";
        header.onclick = () => togglePlaylistSongs(key);

        const img = document.createElement("img");
        img.src = playlist.image;
        img.alt = playlist.title;
        img.loading = "lazy";

        const title = document.createElement("h3");
        title.textContent = playlist.title;

        header.appendChild(img);
        header.appendChild(title);
        section.appendChild(header);

        // Song list table
        const table = document.createElement("table");
        table.className = "song-list-table";
        table.id = `song-list-${key}`;

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>#</th>
                <th>Song</th>
                <th>Artist</th>
                <th>Play</th>
                <th>Like</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        if (!playlist.songs || playlist.songs.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5">No songs available.</td>`;
            tbody.appendChild(tr);
        } else {
            playlist.songs.forEach((song, index) => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div class="song-item">
                            <img src="${song.image}" alt="${song.title}" class="song-image" loading="lazy" />
                            <span>${song.title}</span>
                        </div>
                    </td>
                    <td>${song.artist}</td>
                    <td><button class="play-btn" data-playlist="${key}" data-index="${index}"><i class="fa-solid fa-play"></i></button></td>
                    <td><button class="like-btn" data-playlist="${key}" data-index="${index}"><i class="fa-regular fa-heart"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        table.appendChild(tbody);
        section.appendChild(table);

        container.appendChild(section);
    }
}

// Toggle visibility of songs list for a playlist
function togglePlaylistSongs(key) {
    const table = document.getElementById(`song-list-${key}`);
    if (!table) return;
    if (table.style.display === "none" || table.style.display === "") {
        table.style.display = "table";
    } else {
        table.style.display = "none";
    }
}

// Play selected song from a given playlist and index
function playSong(playlistKey, index) {
    const playlist = playlists[playlistKey];
    if (!playlist || index < 0 || index >= playlist.songs.length) return;

    currentPlaylist = playlist.songs;
    currentSongIndex = index;
    const song = currentPlaylist[index];

    audioPlayer.src = song.audio;
    audioPlayer.play()
        .then(() => {
            updateNowPlaying(song);
            document.getElementById("playbar").style.display = "flex";
            document.getElementById("playPauseButton").innerHTML = '<i class="fa-solid fa-pause"></i>';
        })
        .catch(error => {
            console.error("Playback failed:", error);
            showError("Could not play the song");
        });
}

// Update now playing info
function updateNowPlaying(song) {
    document.getElementById("nowPlayingTitle").textContent = song.title;
    document.getElementById("nowPlayingArtist").textContent = song.artist;
    document.getElementById("nowPlayingImage").src = song.image;
}

// Format time (seconds to MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" + secs : secs}`;
}

// Filter songs based on search input across all playlists
function filterSongs() {
    const searchValue = document.getElementById("searchInput").value.toLowerCase();

    for (const key of Object.keys(playlists)) {
        const table = document.getElementById(`song-list-${key}`);
        if (!table) continue;
        const rows = table.querySelectorAll("tbody tr");

        rows.forEach(row => {
            const songNameSpan = row.querySelector("td:nth-child(2) span");
            const artistTd = row.querySelector("td:nth-child(3)");
            if (!songNameSpan || !artistTd) return;

            const songName = songNameSpan.textContent.toLowerCase();
            const artistName = artistTd.textContent.toLowerCase();

            if (songName.includes(searchValue) || artistName.includes(searchValue)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }
}

// Show error message
function showError(message) {
    console.error(message);
    // You could implement a proper error display here
}

function updatePlaylistView(playlistName) {
    const playlist = playlists[playlistName];
    const songListEl = document.getElementById("song-list");

    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        songListEl.innerHTML = '<tr><td colspan="5">No songs available in this playlist.</td></tr>';
        return;
    }

    songListEl.innerHTML = playlist.songs.map((song, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <div class="song-item">
                    <img src="${song.image}" alt="${song.title}" class="song-image" loading="lazy">
                    <span>${song.title}</span>
                </div>
            </td>
            <td>${song.artist}</td>
            <td><button onclick="playSong('${playlistName}', ${index})" class="play-btn"><i class="fa-solid fa-play"></i></button></td>
            <td><button class="like-btn" data-playlist="${playlistName}" data-index="${index}"><i class="fa-regular fa-heart"></i></button></td>
        </tr>
    `).join("");

    document.getElementById("playlist-title").textContent = playlist.title;
    document.getElementById("playlist-info").textContent = playlist.info;
    document.getElementById("playlist-image").src = playlist.image;
}

// Attach event listeners to all playlist boxes
function attachPlaylistListeners() {
    document.querySelectorAll(".box").forEach(box => {
        const playlistName = box.getAttribute("onclick").match(/\'(.*?)\'/)[1];
        box.addEventListener("click", () => updatePlaylistView(playlistName));
    });
    // Add listener for liked songs playlist if exists
    const likedPlaylistElement = document.getElementById("playlist-liked-songs");
    if (likedPlaylistElement) {
        likedPlaylistElement.addEventListener("click", () => {
            updatePlaylistView("liked");
        });
    }
}

// Initialize the library page
function initializeLibrary() {
    attachPlaylistListeners();
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded");
    // Initialize built-in playlists
    playlists = {
        "liked-songs": {
            title: "Liked Songs",
            info: "Your favorite songs",
            image: "https://i.pinimg.com/originals/86/53/b7/8653b7adfef02f644c40131104fa1b10.jpg",
            songs: []
        },
        "recommended": {
            title: "Recommended",
            info: "Recommended songs for you",
            image: "https://via.placeholder.com/150?text=Recommended",
            songs: []
        },
        "top-artists": {
            title: "Top Artists",
            info: "Top artists trending now",
            image: "https://via.placeholder.com/150?text=Top+Artists",
            songs: []
        },
        "top-songs": {
            title: "Top Songs",
            info: "Popular songs right now",
            image: "https://via.placeholder.com/150?text=Top+Songs",
            songs: []
        },
        "chill-vibes": {
            title: "Chill Vibes",
            info: "Relaxing chill music",
            image: "https://via.placeholder.com/150?text=Chill+Vibes",
            songs: []
        },
        "workout-beats": {
            title: "Workout Beats",
            info: "Energetic workout music",
            image: "https://via.placeholder.com/150?text=Workout+Beats",
            songs: []
        }
    };
    // Merge backend playlists if any
    if (typeof backendPlaylists !== "undefined") {
        backendPlaylists.forEach((playlist) => {
            const key = playlist.name.toLowerCase().replace(/\s+/g, '-');
            playlists[key] = {
                title: playlist.name,
                info: playlist.description || "",
                image: playlist.image || "https://via.placeholder.com/150",
                songs: []
            };
        });
    }
    // Fetch liked songs after playlists initialized
    fetchLikedSongs();
    renderAllPlaylists();
    initializeLibrary();

    // Add event listener for like buttons
    document.addEventListener("click", async (event) => {
        console.log("Click event detected");
        const likeBtn = event.target.closest(".like-btn");
        if (likeBtn) {
            console.log("Like button clicked");
            const playlistKey = likeBtn.getAttribute("data-playlist");
            const index = parseInt(likeBtn.getAttribute("data-index"));
            console.log("Playlist key:", playlistKey, "Index:", index);
            
            if (!playlistKey || isNaN(index)) {
                console.log("Invalid playlist key or index");
                return;
            }

            const playlist = playlists[playlistKey];
            if (!playlist || index < 0 || index >= playlist.songs.length) {
                console.log("Invalid playlist or index");
                return;
            }

            const song = playlist.songs[index];
            console.log("Song to like:", song);

            try {
                console.log("Sending like request...");
                const response = await fetch("/like_song/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCookie("csrftoken")
                    },
                    body: JSON.stringify(song)
                });
                console.log("Response status:", response.status);
                if (!response.ok) throw new Error("Failed to like song");
                const data = await response.json();
                console.log("Response data:", data);
                alert(data.message);

                // Refresh liked songs playlist
                console.log("Refreshing liked songs...");
                await fetchLikedSongs();
            } catch (error) {
                console.error("Error liking song:", error);
                alert("Error liking song");
            }
        }
    });

    // Add event listeners for audio controls
    if (audioPlayer && progressBar && currentTimeEl && durationEl) {
        // Update progress bar as audio plays
        audioPlayer.addEventListener("timeupdate", () => {
            if (!isNaN(audioPlayer.duration)) {
                const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                progressBar.value = progress;
                currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
                durationEl.textContent = formatTime(audioPlayer.duration);
            }
        });

        // Allow seeking through the song
        progressBar.addEventListener("input", () => {
            if (!isNaN(audioPlayer.duration)) {
                audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
            }
        });

        // Play/Pause button
        document.getElementById("playPauseButton").addEventListener("click", () => {
            if (audioPlayer.paused) {
                audioPlayer.play();
                document.getElementById("playPauseButton").innerHTML = '<i class="fa-solid fa-pause"></i>';
            } else {
                audioPlayer.pause();
                document.getElementById("playPauseButton").innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        });

        // Previous/Next buttons
        document.getElementById("prevButton").addEventListener("click", () => {
            playSongAtIndex(currentSongIndex - 1);
        });

        document.getElementById("nextButton").addEventListener("click", () => {
            playSongAtIndex(currentSongIndex + 1);
        });

        // Auto-play next song when current ends
        audioPlayer.addEventListener("ended", () => {
            playSongAtIndex(currentSongIndex + 1);
        });
    } else {
        console.error("Audio controls not found in DOM");
    }
});

// Helper to get CSRF token cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Helper to play song at index in currentPlaylist with bounds check
function playSongAtIndex(index) {
    if (index < 0) index = currentPlaylist.length - 1;
    if (index >= currentPlaylist.length) index = 0;
    playSongByIndex(index);
}

// Play song by index in currentPlaylist
function playSongByIndex(index) {
    if (index < 0 || index >= currentPlaylist.length) return;
    currentSongIndex = index;
    const song = currentPlaylist[index];
    audioPlayer.src = song.audio;
    audioPlayer.play()
        .then(() => {
            updateNowPlaying(song);
            document.getElementById("playbar").style.display = "flex";
            document.getElementById("playPauseButton").innerHTML = '<i class="fa-solid fa-pause"></i>';
        })
        .catch(error => {
            console.error("Playback failed:", error);
            showError("Could not play the song");
        });
}
