const API_BASE = '/api';

// State management
let currentArtist = null;
let allArtists = [];
let allVideos = [];

// DOM Elements
const artistsSection = document.getElementById('artistsSection');
const videosSection = document.getElementById('videosSection');
const artistsGrid = document.getElementById('artistsGrid');
const videosGrid = document.getElementById('videosGrid');
const backButton = document.getElementById('backButton');
const searchInput = document.getElementById('searchInput');
const playerModal = document.getElementById('playerModal');
const videoPlayer = document.getElementById('videoPlayer');
const audioPlayer = document.getElementById('audioPlayer');
const playerInfo = document.getElementById('playerInfo');
const loadingSpinner = document.getElementById('loadingSpinner');
const closeModal = document.querySelector('.close-modal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadArtists();
    setupEventListeners();
});

function setupEventListeners() {
    backButton.addEventListener('click', () => {
        showArtists();
    });

    closeModal.addEventListener('click', () => {
        closePlayer();
    });

    playerModal.addEventListener('click', (e) => {
        if (e.target === playerModal) {
            closePlayer();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && playerModal.style.display === 'block') {
            closePlayer();
        }
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query === '') {
            renderArtists(allArtists);
        } else {
            const filtered = allArtists.filter(artist => 
                artist.name.toLowerCase().includes(query)
            );
            renderArtists(filtered);
        }
    });
}

async function loadArtists() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/artists`);
        if (!response.ok) throw new Error('Failed to load artists');
        
        allArtists = await response.json();
        renderArtists(allArtists);
        hideLoading();
    } catch (error) {
        console.error('Error loading artists:', error);
        artistsGrid.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 20px;">
            Error loading artists: ${error.message}
        </div>`;
        hideLoading();
    }
}

function renderArtists(artists) {
    artistsGrid.innerHTML = artists.map(artist => `
        <div class="artist-card" onclick="selectArtist('${artist.name}')">
            ${artist.icon ? 
                `<img src="${artist.icon}" alt="${artist.name}" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\'>🎤</div><div class=\\'card-info\\'><h3>${artist.name}</h3></div>'">` :
                `<div class="card-placeholder">🎤</div>`
            }
            <div class="card-info">
                <h3>${artist.name}</h3>
            </div>
        </div>
    `).join('');
}

async function selectArtist(artistName) {
    try {
        showLoading();
        currentArtist = artistName;
        
        const response = await fetch(`${API_BASE}/artists/${encodeURIComponent(artistName)}/videos`);
        if (!response.ok) throw new Error('Failed to load videos');
        
        allVideos = await response.json();
        renderVideos(allVideos);
        
        document.getElementById('currentArtistName').textContent = artistName;
        artistsSection.style.display = 'none';
        videosSection.style.display = 'block';
        searchInput.value = '';
        hideLoading();
    } catch (error) {
        console.error('Error loading videos:', error);
        hideLoading();
        alert('Failed to load videos: ' + error.message);
    }
}

function renderVideos(videos) {
    videosGrid.innerHTML = videos.map(video => {
        const primaryMedia = video.media[0];
        const poster = video.poster || video.fanart;
        
        return `
            <div class="video-card" onclick="playVideo('${currentArtist}', '${video.code}', '${primaryMedia.filename}', '${primaryMedia.type}')">
                ${poster ? 
                    `<img src="${poster}" alt="${video.code}" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\'>🎬</div><div class=\\'card-info\\'><h3>${video.code}</h3><p>${video.media.length} file(s)</p></div>'">` :
                    `<div class="card-placeholder">🎬</div>`
                }
                <div class="card-info">
                    <h3>${video.code}</h3>
                    <p>${video.media.length} file(s)</p>
                </div>
            </div>
        `;
    }).join('');
}

function playVideo(artistName, videoCode, filename, mediaType) {
    const streamUrl = `${API_BASE}/stream/${encodeURIComponent(artistName)}/${encodeURIComponent(videoCode)}/${encodeURIComponent(filename)}`;
    
    playerInfo.textContent = `${artistName} - ${videoCode} - ${filename}`;
    
    if (mediaType === 'video') {
        videoPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        videoPlayer.src = streamUrl;
        videoPlayer.load();
    } else {
        audioPlayer.style.display = 'block';
        videoPlayer.style.display = 'none';
        audioPlayer.src = streamUrl;
        audioPlayer.load();
    }
    
    playerModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePlayer() {
    playerModal.style.display = 'none';
    videoPlayer.pause();
    audioPlayer.pause();
    videoPlayer.src = '';
    audioPlayer.src = '';
    document.body.style.overflow = 'auto';
}

function showArtists() {
    artistsSection.style.display = 'block';
    videosSection.style.display = 'none';
    currentArtist = null;
    allVideos = [];
    searchInput.value = '';
}

function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

// Make functions global for onclick handlers
window.selectArtist = selectArtist;
window.playVideo = playVideo;

