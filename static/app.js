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
    setupSwipeGestures();
    setupPWA();
    checkUrlForArtist();
});

// Check URL to see if we should show a specific artist's videos
function checkUrlForArtist() {
    const pathname = window.location.pathname;
    const pathParts = pathname.split('/').filter(p => p);
    
    // Check if URL is /artist/<artist_name>
    if (pathParts.length === 2 && pathParts[0] === 'artist') {
        const artistName = decodeURIComponent(pathParts[1]);
        // Wait for artists to load, then select the artist
        if (allArtists.length > 0) {
            selectArtist(artistName);
        } else {
            // If artists haven't loaded yet, wait for them
            const checkInterval = setInterval(() => {
                if (allArtists.length > 0) {
                    clearInterval(checkInterval);
                    selectArtist(artistName);
                }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => clearInterval(checkInterval), 5000);
        }
    }
}

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
    
    // Lock orientation for video playback (optional)
    // Note: This requires user gesture, so we'll handle it in playVideo
}

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
            // Sort filtered results by name
            filtered.sort((a, b) => a.name.localeCompare(b.name));
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
        // Sort artists by name
        allArtists.sort((a, b) => a.name.localeCompare(b.name));
        renderArtists(allArtists);
        hideLoading();
        
        // After artists are loaded, check if we need to show a specific artist
        checkUrlForArtist();
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

// Swipe gesture state
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;
let swipeLastX = 0;
let swipeLastTime = 0;
let isSwipeActive = false;
let accumulatedPixels = 0; // Track total pixels swiped
let lastSeekTime = 0; // Track when we last applied a seek (for throttling)
let lastSeekPosition = 0; // Track last seek position to avoid excessive updates
let swipeStartPlayerTime = 0; // Track player time when swipe started
const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
const MIN_SEEK_AMOUNT = 5; // Minimum seconds to seek
const MAX_SEEK_AMOUNT = 60; // Maximum seconds to seek
const BASE_VELOCITY = 300; // Base velocity (pixels per second) for minimum seek - tripled to require more pixels
const PIXELS_PER_MINUTE = 600; // Pixels needed to seek 1 minute (reduced to 1/3: 1800 / 3 = 600)
const SEEK_UPDATE_INTERVAL = 100; // Update seek every 100ms to avoid excessive updates

function setupSwipeGestures() {
    const playerContainer = document.querySelector('.player-container');
    
    // Helper function to attach swipe listeners to an element
    function attachSwipeListeners(element) {
        // Touch events for mobile
        element.addEventListener('touchstart', handleSwipeStart, { passive: false });
        element.addEventListener('touchmove', handleSwipeMove, { passive: false });
        element.addEventListener('touchend', handleSwipeEnd, { passive: false });
        
        // Mouse events for desktop (click and drag)
        let isMouseDown = false;
        element.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                isMouseDown = true;
                handleSwipeStart(e);
            }
        });
        
        element.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                handleSwipeMove(e);
            }
        });
        
        element.addEventListener('mouseup', (e) => {
            if (isMouseDown) {
                isMouseDown = false;
                handleSwipeEnd(e);
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (isMouseDown) {
                isMouseDown = false;
                handleSwipeEnd(new MouseEvent('mouseup'));
            }
        });
    }
    
    // Attach to container (for normal mode)
    attachSwipeListeners(playerContainer);
    
    // Attach to video element (for fullscreen mode)
    attachSwipeListeners(videoPlayer);
    
    // Also attach to audio player
    attachSwipeListeners(audioPlayer);
    
    // Re-attach to video when it enters fullscreen (in case events are lost)
    videoPlayer.addEventListener('fullscreenchange', () => {
        // Events should persist, but this ensures they're attached
    });
    
    videoPlayer.addEventListener('webkitfullscreenchange', () => {});
    videoPlayer.addEventListener('mozfullscreenchange', () => {});
    videoPlayer.addEventListener('MSFullscreenChange', () => {});
}

function handleSwipeStart(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const now = Date.now();
    
    swipeStartX = clientX;
    swipeStartY = clientY;
    swipeStartTime = now;
    swipeLastX = clientX;
    swipeLastTime = now;
    accumulatedPixels = 0;
    lastSeekTime = now;
    lastSeekPosition = 0;
    isSwipeActive = true;
    
    // Store player's current time when swipe starts
    const player = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
    if (player && player.readyState > 0) {
        swipeStartPlayerTime = player.currentTime;
    } else {
        swipeStartPlayerTime = 0;
    }
}

function handleSwipeMove(e) {
    if (!isSwipeActive) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const now = Date.now();
    
    const deltaX = clientX - swipeStartX;
    const deltaY = clientY - swipeStartY;
    
    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.preventDefault(); // Prevent scrolling
        
        // Update accumulated pixels based on total movement from start
        accumulatedPixels = Math.abs(deltaX);
        
        // Update last position and time for velocity calculation
        swipeLastX = clientX;
        swipeLastTime = now;
        
        // Get player
        const player = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
        // Check if player is playing - relaxed check for fullscreen compatibility
        const isPlaying = player && player.readyState > 0 && !player.ended;
        
        if (isPlaying && Math.abs(deltaX) > SWIPE_THRESHOLD) {
            // Calculate seek amount based on accumulated pixels from start
            // PIXELS_PER_MINUTE pixels = 60 seconds
            const pixelsRatio = accumulatedPixels / PIXELS_PER_MINUTE;
            const seekAmountSeconds = pixelsRatio * 60; // Convert to seconds
            
            // Apply min/max bounds (but allow unlimited if user keeps swiping)
            const seekAmount = Math.max(seekAmountSeconds, MIN_SEEK_AMOUNT);
            
            const duration = player.duration;
            
            // Calculate target time based on swipe direction from original start position
            let newTime;
            let icon;
            if (deltaX > 0) {
                newTime = Math.min(swipeStartPlayerTime + seekAmount, duration);
                icon = '⏩';
            } else {
                newTime = Math.max(swipeStartPlayerTime - seekAmount, 0);
                icon = '⏪';
            }
            
            const actualSeek = Math.abs(newTime - swipeStartPlayerTime);
            
            // Update preview dynamically with current seek amount (increasing/decreasing)
            // Always show preview if we have meaningful seek amount
            showSeekPreview(icon, actualSeek, newTime, duration);
            
            // Apply seek continuously (throttled to avoid excessive updates)
            if (now - lastSeekTime >= SEEK_UPDATE_INTERVAL) {
                // Only seek if position changed significantly to avoid jitter
                const seekDelta = Math.abs(newTime - lastSeekPosition);
                if (seekDelta >= 0.5) { // Seek at least 0.5 seconds at a time for smoother updates
                    player.currentTime = newTime;
                    lastSeekPosition = newTime;
                    lastSeekTime = now;
                }
            }
        }
    }
}

function handleSwipeEnd(e) {
    if (!isSwipeActive) return;
    
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const now = Date.now();
    
    const deltaX = clientX - swipeStartX;
    const deltaY = clientY - swipeStartY;
    const deltaTime = now - swipeStartTime;
    
    // Hide preview after a short delay to allow final update
    setTimeout(() => {
        hideSeekPreview();
    }, 100);
    
    isSwipeActive = false;
    
    // Check if it's a valid horizontal swipe (no time limit)
    if (Math.abs(deltaX) > Math.abs(deltaY) && 
        Math.abs(deltaX) > SWIPE_THRESHOLD) {
        
        const player = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
        
        // Check if player is playing - relaxed check for fullscreen compatibility
        const isPlaying = player && player.readyState > 0 && !player.ended;
        
        if (isPlaying) {
            // Calculate final seek amount based on accumulated pixels from start
            const pixelsRatio = accumulatedPixels / PIXELS_PER_MINUTE;
            const seekAmountSeconds = pixelsRatio * 60;
            
            const seekAmount = Math.max(seekAmountSeconds, MIN_SEEK_AMOUNT);
            
            const duration = player.duration;
            
            if (deltaX > 0) {
                // Swipe right = fast forward
                const newTime = Math.min(swipeStartPlayerTime + seekAmount, duration);
                const actualSeek = newTime - swipeStartPlayerTime;
                // Final seek to exact position
                player.currentTime = newTime;
                showSeekFeedback('⏩', `+${Math.round(actualSeek)}s`, newTime, duration);
            } else {
                // Swipe left = rewind
                const newTime = Math.max(swipeStartPlayerTime - seekAmount, 0);
                const actualSeek = swipeStartPlayerTime - newTime;
                // Final seek to exact position
                player.currentTime = newTime;
                showSeekFeedback('⏪', `-${Math.round(actualSeek)}s`, newTime, duration);
            }
        }
    } else {
        // Not a valid swipe, just hide preview
        hideSeekPreview();
    }
    
    // Reset accumulated pixels
    accumulatedPixels = 0;
    lastSeekTime = 0;
    lastSeekPosition = 0;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getFullscreenElement() {
    return document.fullscreenElement || 
           document.webkitFullscreenElement || 
           document.mozFullScreenElement || 
           document.msFullscreenElement;
}

// Keep reference to current preview element
let currentPreviewElement = null;
let previewUpdateTimeout = null;

function showSeekPreview(icon, seekAmount, targetTime, duration) {
    // Clear any pending update timeout
    if (previewUpdateTimeout) {
        clearTimeout(previewUpdateTimeout);
        previewUpdateTimeout = null;
    }
    
    // Check if preview element exists and is in DOM
    let feedback = currentPreviewElement;
    
    if (!feedback || !feedback.parentNode || !document.body.contains(feedback)) {
        // Remove any existing feedback first
        const existingFeedback = document.querySelector('.seek-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Create new feedback element
        feedback = document.createElement('div');
        feedback.className = 'seek-feedback preview';
        
        // Store reference
        currentPreviewElement = feedback;
        
        // Always append to body (position: fixed works from body)
        document.body.appendChild(feedback);
        
        // Force immediate visibility
        requestAnimationFrame(() => {
            feedback.classList.add('show');
            feedback.style.opacity = '1';
            feedback.style.display = 'flex';
            feedback.style.visibility = 'visible';
            feedback.style.zIndex = '2147483647';
            
            // Double-check after a frame
            requestAnimationFrame(() => {
                if (feedback.parentNode) {
                    feedback.style.opacity = '1';
                    feedback.style.display = 'flex';
                    feedback.style.visibility = 'visible';
                    feedback.style.zIndex = '2147483647';
                }
            });
        });
    }
    
    // Update content (always update, even if element exists)
    const seekText = `±${Math.round(seekAmount)}s`;
    const timeText = formatTime(targetTime);
    const durationText = formatTime(duration);
    
    feedback.innerHTML = `
        <span class="seek-icon">${icon}</span>
        <div class="seek-details">
            <span class="seek-amount">${seekText}</span>
            <span class="seek-time">${timeText} / ${durationText}</span>
        </div>
    `;
    
    // Ensure it's visible with forced styles
    feedback.classList.add('show');
    feedback.style.opacity = '1';
    feedback.style.display = 'flex';
    feedback.style.visibility = 'visible';
    feedback.style.zIndex = '2147483647';
    feedback.style.position = 'fixed';
    feedback.style.top = '50%';
    feedback.style.left = '50%';
    
    // Check if in fullscreen and adjust transform
    const fullscreenEl = getFullscreenElement();
    if (fullscreenEl) {
        feedback.style.transform = 'translate(-50%, -50%) scale(1)';
    } else {
        feedback.style.transform = 'translate(-50%, -50%) scale(1.333)';
    }
}

function hideSeekPreview() {
    // Clear update timeout
    if (previewUpdateTimeout) {
        clearTimeout(previewUpdateTimeout);
        previewUpdateTimeout = null;
    }
    
    // Only hide if swipe is not active (to prevent hiding during active swipe)
    if (!isSwipeActive) {
        // Hide and remove preview
        if (currentPreviewElement && currentPreviewElement.parentNode) {
            currentPreviewElement.classList.remove('show');
            currentPreviewElement.style.opacity = '0';
            setTimeout(() => {
                if (currentPreviewElement && currentPreviewElement.parentNode && !isSwipeActive) {
                    currentPreviewElement.remove();
                }
                if (!isSwipeActive) {
                    currentPreviewElement = null;
                }
            }, 300);
        } else {
            // Fallback: query selector
            const existingFeedback = document.querySelector('.seek-feedback.preview');
            if (existingFeedback && !isSwipeActive) {
                existingFeedback.classList.remove('show');
                existingFeedback.style.opacity = '0';
                setTimeout(() => {
                    if (existingFeedback.parentNode && !isSwipeActive) {
                        existingFeedback.remove();
                    }
                }, 300);
            }
        }
    }
}

function showSeekFeedback(icon, text, targetTime, duration) {
    // Clear preview reference
    if (currentPreviewElement) {
        if (currentPreviewElement.parentNode) {
            currentPreviewElement.remove();
        }
        currentPreviewElement = null;
    }
    
    // Remove existing preview if any (fallback)
    const existingPreview = document.querySelector('.seek-feedback.preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Remove existing feedback if any
    const existingFeedback = document.querySelector('.seek-feedback:not(.preview)');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Create feedback element with final time
    const feedback = document.createElement('div');
    feedback.className = 'seek-feedback';
    const timeText = targetTime !== undefined ? formatTime(targetTime) : '';
    const durationText = duration !== undefined ? formatTime(duration) : '';
    
    if (timeText && durationText) {
        feedback.innerHTML = `
            <span class="seek-icon">${icon}</span>
            <div class="seek-details">
                <span class="seek-amount">${text}</span>
                <span class="seek-time">${timeText} / ${durationText}</span>
            </div>
        `;
    } else {
        feedback.innerHTML = `<span class="seek-icon">${icon}</span><span class="seek-text">${text}</span>`;
    }
    
    // Check if in fullscreen mode
    const fullscreenEl = getFullscreenElement();
    
    if (fullscreenEl) {
        // In fullscreen, append to the fullscreen element itself
        fullscreenEl.appendChild(feedback);
    } else {
        // In normal mode, append to body
        document.body.appendChild(feedback);
    }
    
    // Animate in
    setTimeout(() => {
        feedback.classList.add('show');
    }, 10);
    
    // Remove after animation
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => {
            feedback.remove();
        }, 300);
    }, 1500);
}

function playVideo(artistName, videoCode, filename, mediaType) {
    // Navigate to player page instead of showing modal
    const playerUrl = `/player/${encodeURIComponent(artistName)}/${encodeURIComponent(videoCode)}`;
    window.location.href = playerUrl;
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
