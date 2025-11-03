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
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ef4444';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.padding = '20px';
        errorDiv.textContent = `Error loading artists: ${error.message}`;
        artistsGrid.innerHTML = '';
        artistsGrid.appendChild(errorDiv);
        hideLoading();
    }
}

function renderArtists(artists) {
    // Clear grid
    artistsGrid.innerHTML = '';
    
    artists.forEach(artist => {
        // Create card container
        const card = document.createElement('div');
        card.className = 'artist-card';
        card.setAttribute('data-artist', artist.name);
        
        // Create image if icon exists
        if (artist.icon) {
            const img = document.createElement('img');
            img.className = 'artist-icon';
            img.src = artist.icon;
            img.alt = artist.name;
            img.addEventListener('error', function() {
                this.style.display = 'none';
                placeholder.style.display = 'flex';
            });
            card.appendChild(img);
        }
        
        // Create placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder';
        placeholder.textContent = '🎤';
        if (artist.icon) {
            placeholder.style.display = 'none';
        } else {
            placeholder.style.display = 'flex';
        }
        card.appendChild(placeholder);
        
        // Create card info
        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';
        
        const h3 = document.createElement('h3');
        h3.textContent = artist.name;
        cardInfo.appendChild(h3);
        
        card.appendChild(cardInfo);
        
        // Add click handler
        card.addEventListener('click', () => {
            selectArtist(artist.name);
        });
        
        artistsGrid.appendChild(card);
    });
}

async function selectArtist(artistName) {
    try {
        showLoading();
        currentArtist = artistName;
        
        const response = await fetch(`${API_BASE}/artists/${encodeURIComponent(artistName)}/videos`);
        if (!response.ok) throw new Error('Failed to load videos');
        
        allVideos = await response.json();
        renderVideos(allVideos);
        
        // Auto-check for missing titles and update
        await autoUpdateMissingTitles(artistName, true); // true = scrape real titles!
        
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

async function autoUpdateMissingTitles(artistName, scrapeReal = false) {
    try {
        // Check for missing titles
        const checkResponse = await fetch(`${API_BASE}/titles/${encodeURIComponent(artistName)}/missing`);
        if (!checkResponse.ok) return;
        
        const checkData = await checkResponse.json();
        
        // If there are missing titles, auto-update
        if (checkData.missing_count > 0) {
            if (scrapeReal) {
                console.log(`Found ${checkData.missing_count} videos without titles, scraping real titles (JavSP-style)...`);
            } else {
                console.log(`Found ${checkData.missing_count} videos without titles, auto-updating with placeholder...`);
            }
            
            const updateResponse = await fetch(`${API_BASE}/titles/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    artist_name: artistName,
                    placeholder: '[Title Missing - Update Needed]',
                    scrape_real_titles: scrapeReal
                })
            });
            
            if (updateResponse.ok) {
                const updateData = await updateResponse.json();
                if (scrapeReal && updateData.scraped > 0) {
                    console.log(`Successfully scraped ${updateData.scraped} real titles (JavSP-style)`);
                    if (updateData.placeholder_added > 0) {
                        console.log(`Added ${updateData.placeholder_added} placeholders for failed scrapes`);
                    }
                } else {
                    console.log(`Auto-updated ${updateData.updated || updateData.total_updated} missing titles`);
                }
                
                // Reload videos to show updated titles
                const videosResponse = await fetch(`${API_BASE}/artists/${encodeURIComponent(artistName)}/videos`);
                if (videosResponse.ok) {
                    allVideos = await videosResponse.json();
                    renderVideos(allVideos);
                }
            }
        }
    } catch (error) {
        console.error('Error auto-updating titles:', error);
        // Fail silently - don't interrupt user experience
    }
}

function renderVideos(videos) {
    // Clear grid
    videosGrid.innerHTML = '';
    
    videos.forEach(video => {
        const primaryMedia = video.media[0];
        const poster = video.poster || video.fanart;
        const displayTitle = video.title || video.code;
        const showCode = video.title && video.title !== video.code;
        
        // Create card container
        const card = document.createElement('div');
        card.className = 'video-card';
        card.setAttribute('data-artist', currentArtist);
        card.setAttribute('data-code', video.code);
        card.setAttribute('data-filename', primaryMedia.filename);
        card.setAttribute('data-type', primaryMedia.type);
        
        // Create image if poster exists
        if (poster) {
            const img = document.createElement('img');
            img.className = 'video-poster';
            img.src = poster;
            img.alt = displayTitle;
            img.addEventListener('error', function() {
                this.style.display = 'none';
                placeholder.style.display = 'flex';
            });
            card.appendChild(img);
        }
        
        // Create placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder';
        placeholder.textContent = '🎬';
        if (poster) {
            placeholder.style.display = 'none';
        } else {
            placeholder.style.display = 'flex';
        }
        card.appendChild(placeholder);
        
        // Create card info
        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';
        
        const h3 = document.createElement('h3');
        h3.textContent = displayTitle;
        cardInfo.appendChild(h3);
        
        // Add code line if needed
        if (showCode) {
            const codeP = document.createElement('p');
            codeP.className = 'video-code';
            codeP.textContent = video.code;
            cardInfo.appendChild(codeP);
        }
        
        // Add date display if available
        if (video.year) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'video-date';
            if (video.month && video.day) {
                dateSpan.textContent = `${video.year}-${String(video.month).padStart(2, '0')}-${String(video.day).padStart(2, '0')}`;
            } else if (video.month) {
                dateSpan.textContent = `${video.year}-${String(video.month).padStart(2, '0')}`;
            } else {
                dateSpan.textContent = String(video.year);
            }
            cardInfo.appendChild(dateSpan);
        }
        
        // Add file count
        const fileCountP = document.createElement('p');
        fileCountP.textContent = `${video.media.length} file(s)`;
        cardInfo.appendChild(fileCountP);
        
        card.appendChild(cardInfo);
        
        // Add click handler
        card.addEventListener('click', () => {
            playVideo(currentArtist, video.code, primaryMedia.filename, primaryMedia.type);
        });
        
        videosGrid.appendChild(card);
    });
}

function playVideo(artistName, videoCode, filename, mediaType) {
    const streamUrl = `${API_BASE}/stream/${encodeURIComponent(artistName)}/${encodeURIComponent(videoCode)}/${encodeURIComponent(filename)}`;
    
    // Find video title for display
    const video = allVideos.find(v => v.code === videoCode);
    const displayTitle = video && video.title ? video.title : videoCode;
    playerInfo.textContent = `${artistName} - ${displayTitle}`;
    
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

// Make functions global if needed
window.selectArtist = selectArtist;
window.playVideo = playVideo;
