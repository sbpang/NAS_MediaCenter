const API_BASE = '/api';

// State management
let currentArtist = null;
let allVideos = [];

// DOM Elements
const videosGrid = document.getElementById('videosGrid');
const searchInput = document.getElementById('searchInput');
const artistNameHeader = document.getElementById('artistNameHeader');
const loadingSpinner = document.getElementById('loadingSpinner');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadArtistVideos();
    setupEventListeners();
    setupPWA();
});

// PWA setup - hide browser UI on mobile
function setupPWA() {
    // Prevent address bar from showing on scroll (works in some browsers)
    window.addEventListener('scroll', () => {
        if (window.scrollY === 0) {
            window.scrollTo(0, 1);
        }
    });
    
    // Hide address bar on load (works in some mobile browsers)
    setTimeout(() => {
        window.scrollTo(0, 1);
    }, 100);
}

function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query === '') {
            renderVideos(allVideos);
        } else {
            const filtered = allVideos.filter(video => {
                const title = (video.title || video.code).toLowerCase();
                const code = video.code.toLowerCase();
                return title.includes(query) || code.includes(query);
            });
            renderVideos(filtered);
        }
    });
}

async function loadArtistVideos() {
    try {
        // Get artist name from URL
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(p => p);
        
        if (pathParts.length >= 2 && pathParts[0] === 'artist') {
            const artistName = decodeURIComponent(pathParts[1]);
            currentArtist = artistName;
            artistNameHeader.textContent = artistName;
            
            showLoading();
            
            const response = await fetch(`${API_BASE}/artists/${encodeURIComponent(artistName)}/videos`);
            if (!response.ok) throw new Error('Failed to load videos');
            
            allVideos = await response.json();
            renderVideos(allVideos);
            
            // Auto-check for missing titles and update
            await autoUpdateMissingTitles(artistName, true); // true = scrape real titles!
            
            hideLoading();
        } else {
            artistNameHeader.textContent = 'Invalid URL';
        }
    } catch (error) {
        console.error('Error loading videos:', error);
        hideLoading();
        artistNameHeader.textContent = 'Error loading videos';
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
        
        card.appendChild(cardInfo);
        
        // Add click handler
        card.addEventListener('click', () => {
            playVideo(currentArtist, video.code, primaryMedia.filename, primaryMedia.type);
        });
        
        videosGrid.appendChild(card);
    });
}

function playVideo(artistName, videoCode, filename, mediaType) {
    // Navigate to player page
    const playerUrl = `/player/${encodeURIComponent(artistName)}/${encodeURIComponent(videoCode)}`;
    window.location.href = playerUrl;
}

function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

