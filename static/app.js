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
    artistsGrid.innerHTML = artists.map(artist => {
        const escapedName = escapeHtml(artist.name);
        const attrEscape = (str) => String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const attrName = attrEscape(artist.name);
        
        let imageHtml = '';
        if (artist.icon) {
            const escapedIcon = attrEscape(artist.icon);
            imageHtml = `<img src="${escapedIcon}" alt="${escapedName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`;
        }
        
        return `
        <div class="artist-card" data-artist="${attrName}">
            ${artist.icon ? imageHtml : ''}
            <div class="card-placeholder" style="${artist.icon ? 'display:none' : 'display:flex'}">🎤</div>
            <div class="card-info">
                <h3>${escapedName}</h3>
            </div>
        </div>
        `;
    }).join('');
    
    // Add click event listeners using event delegation (avoids quote issues)
    artistsGrid.querySelectorAll('.artist-card').forEach(card => {
        card.addEventListener('click', function() {
            const artistName = this.getAttribute('data-artist');
            selectArtist(artistName);
        });
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderVideos(videos) {
    videosGrid.innerHTML = videos.map(video => {
        const primaryMedia = video.media[0];
        const poster = video.poster || video.fanart;
        // Use title if available, fallback to code
        const displayTitle = video.title || video.code;
        const showCode = video.title && video.title !== video.code;
        
        // Format date display: show full date if available, otherwise year, otherwise nothing
        let dateDisplay = '';
        if (video.year) {
            if (video.month && video.day) {
                // Full date: YYYY-MM-DD
                dateDisplay = `<span class="video-date">${video.year}-${String(video.month).padStart(2, '0')}-${String(video.day).padStart(2, '0')}</span>`;
            } else if (video.month) {
                // Year and month: YYYY-MM
                dateDisplay = `<span class="video-date">${video.year}-${String(video.month).padStart(2, '0')}</span>`;
            } else {
                // Year only
                dateDisplay = `<span class="video-date">${video.year}</span>`;
            }
        }
        
        const escapedTitle = escapeHtml(displayTitle);
        const escapedCode = escapeHtml(video.code);
        const codeLine = showCode ? `<p class="video-code">${escapedCode}</p>` : '';
        
        // Use data attributes to avoid quote escaping issues in onclick
        const attrEscape = (str) => String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        return `
            <div class="video-card" 
                 data-artist="${attrEscape(currentArtist)}"
                 data-code="${attrEscape(video.code)}"
                 data-filename="${attrEscape(primaryMedia.filename)}"
                 data-type="${attrEscape(primaryMedia.type)}">
                ${poster ? `<img src="${attrEscape(poster)}" alt="${escapedTitle}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
                <div class="card-placeholder" style="${poster ? 'display:none' : 'display:flex'}">🎬</div>
                <div class="card-info">
                    <h3>${escapedTitle}</h3>
                    ${codeLine}
                    ${dateDisplay}
                    <p>${video.media.length} file(s)</p>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click event listeners using event delegation (avoids quote issues)
    videosGrid.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', function() {
            const artist = this.getAttribute('data-artist');
            const code = this.getAttribute('data-code');
            const filename = this.getAttribute('data-filename');
            const type = this.getAttribute('data-type');
            playVideo(artist, code, filename, type);
        });
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

// Make functions global if needed (though we use event delegation now)
window.selectArtist = selectArtist;
window.playVideo = playVideo;

