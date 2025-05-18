// Select the play/pause button and the GIF container
const playPauseBtn = document.getElementById("playPauseBtn");
const gifContainer = document.querySelector(".gif-container");
const audio = document.getElementById('audio');
const gif = document.querySelector('.animated-gif');
const songInfo = document.getElementById('currentSong');
let currentSong = '';
let isPlaying = false;

// Load songs from JSON file
let allSongs = [];

// Fetch songs from JSON file
fetch('/static/js/songs.json')
    .then(response => response.json())
    .then(data => {
        allSongs = data.songs;
        console.log('Songs loaded:', allSongs);
    })
    .catch(error => console.error('Error loading songs:', error));

// Add this function to fetch the Google Drive direct link
async function getPlayableAudioUrl(audioId) {
    if (!audioId || typeof audioId !== 'string') {
        return null;
    }
    // Always use the proxy endpoint for moods
    return `/proxy_drive_audio/${audioId}/`;
}

// Function to get songs by mood
function getSongsByMood(mood) {
    return allSongs.filter(song => song.mood.toLowerCase() === mood.toLowerCase());
}

// Function to display songs
function displaySongs(songs) {
    const songsContainer = document.getElementById('songs-container');
    songsContainer.innerHTML = '';
    
    // Filter out songs with null or undefined audio_url
    const playableSongs = songs.filter(song => song.audio_url && typeof song.audio_url === 'string');
    if (playableSongs.length === 0) {
        songsContainer.innerHTML = '<p>No songs found for this mood</p>';
        return;
    }
    
    playableSongs.forEach(song => {
        const songElement = document.createElement('div');
        songElement.className = 'song-card';
        songElement.innerHTML = `
            <img src="${song.image}" alt="${song.title}">
            <h3>${song.title}</h3>
            <p>${song.artist}</p>
            <div class="play-btn">
                <span><i class="fa-solid fa-play"></i></span>
            </div>
        `;
        
        // Add click event to play button
        const playBtn = songElement.querySelector('.play-btn');
        playBtn.addEventListener('click', async () => {
            try {
                // Defensive check for audio_url
                const audioUrl = await getPlayableAudioUrl(song.audio_url);
                if (!audioUrl) {
                    alert('No audio available for this song.');
                    return;
                }
                // Reset all play buttons to play icon
                document.querySelectorAll('.play-btn').forEach(btn => {
                    btn.innerHTML = '<span><i class="fa-solid fa-play"></i></span>';
                });
                // Use the proxy endpoint for audio
                console.log('Setting audio src to (proxy):', audioUrl);
                audio.src = audioUrl;
                await audio.play();
                currentSong = song.audio_url;
                songInfo.textContent = `Playing: ${song.title} - ${song.artist}`;
                gif.classList.add('playing');
                playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                isPlaying = true;
                playBtn.innerHTML = '<span><i class="fa-solid fa-pause"></i></span>';
            } catch (error) {
                console.error('Error playing song:', error);
                alert('Error playing song. Please try again later.');
            }
        });
        
        // Defensive check for image
        const imgSrc = song.image ? song.image : '/static/images/default.jpg';
        songElement.querySelector('img').src = imgSrc;
        
        songsContainer.appendChild(songElement);
    });
}

// Add click event listeners to mood buttons
document.addEventListener('DOMContentLoaded', () => {
    const moodButtons = document.querySelectorAll('.mood-button');
    moodButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mood = button.getAttribute('data-mood');
            console.log('Clicked mood:', mood);
            // Filter for valid audio_url before displaying
            const songs = getSongsByMood(mood).filter(song => song.audio_url && typeof song.audio_url === 'string');
            console.log('Found valid songs:', songs);
            displaySongs(songs);
        });
    });
});

// Play/Pause button functionality
playPauseBtn.addEventListener('click', function () {
    togglePlayPause();
});

function togglePlayPause() {
    try {
        if (audio.paused) {
            audio.play();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            gif.classList.add('playing');
            isPlaying = true;
        } else {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            gif.classList.remove('playing');
            isPlaying = false;
        }
    } catch (error) {
        console.error('Error toggling play/pause:', error);
        alert('Error controlling playback. Please try again.');
    }
}

// Update GIF when audio ends
audio.addEventListener('ended', () => {
    gif.classList.remove('playing');
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    isPlaying = false;
});

// Add time update event listener
audio.addEventListener('timeupdate', () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    document.getElementById('musicTracker').value = progress;
    
    // Update time display
    document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
    document.getElementById('totalTime').textContent = formatTime(audio.duration);
});

// Format time function
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Add progress bar event listener
document.getElementById('musicTracker').addEventListener('input', (e) => {
    const seekTime = (audio.duration * e.target.value) / 100;
    audio.currentTime = seekTime;
});

// Add error handling for audio
audio.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    alert('Error playing audio. Please try another track.');
});

audio.addEventListener('stalled', () => {
    console.warn('Audio stalled - trying to reload');
    audio.load();
});