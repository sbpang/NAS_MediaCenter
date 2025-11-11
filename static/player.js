const API_BASE = '/api';

// DOM Elements
const videoPlayerPage = document.getElementById('videoPlayerPage');
const audioPlayerPage = document.getElementById('audioPlayerPage');
const playerInfoHeader = document.getElementById('playerInfoHeader');
const backButtonPlayer = document.getElementById('backButtonPlayer');

// Swipe gesture state
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;
let swipeLastX = 0;
let swipeLastTime = 0;
let isSwipeActive = false;
let accumulatedPixels = 0;
let lastSeekTime = 0;
let lastSeekPosition = 0;
let swipeStartPlayerTime = 0;
const SWIPE_THRESHOLD = 50;
const MIN_SEEK_AMOUNT = 5;
const MAX_SEEK_AMOUNT = 60;
const BASE_VELOCITY = 300;
const PIXELS_PER_MINUTE = 600; // Reduced to 1/3: 1800 / 3 = 600 (swipe 1/3 shorter for same seconds)
const SEEK_UPDATE_INTERVAL = 100;

// Keep reference to current preview element
let currentPreviewElement = null;
let previewUpdateTimeout = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if DOM elements exist
    if (!videoPlayerPage || !audioPlayerPage || !playerInfoHeader) {
        console.error('Required DOM elements not found');
        if (playerInfoHeader) {
            playerInfoHeader.textContent = 'Page initialization error';
        }
        return;
    }
    
    loadPlayerData();
    setupSwipeGestures();
});

function loadPlayerData() {
    try {
        // Get artist name and video code from URL
        const pathname = window.location.pathname;
        console.log('Current pathname:', pathname);
        
        const pathParts = pathname.split('/').filter(p => p);
        console.log('Path parts:', pathParts);
        
        // Expected format: /player/<artist_name>/<video_code>
        if (pathParts.length >= 2 && pathParts[0] === 'player') {
            const artistName = decodeURIComponent(pathParts[1]);
            const videoCode = pathParts.length >= 3 ? decodeURIComponent(pathParts[2]) : '';
            
            console.log('Artist:', artistName, 'Video Code:', videoCode);
            
            // Update back button to go to artist's video page
            if (backButtonPlayer) {
                backButtonPlayer.href = `/artist/${encodeURIComponent(artistName)}`;
            }
            
            if (!videoCode) {
                playerInfoHeader.textContent = 'Invalid URL: Missing video code';
                return;
            }
            
            // Load video data
            const apiUrl = `${API_BASE}/artists/${encodeURIComponent(artistName)}/videos`;
            console.log('Fetching:', apiUrl);
            
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(videos => {
                    console.log('Videos loaded:', videos.length);
                    const video = videos.find(v => v.code === videoCode);
                    if (video) {
                        console.log('Video found:', video);
                        // Find primary media file
                        const primaryMedia = video.media && video.media.length > 0 ? video.media[0] : null;
                        if (primaryMedia) {
                            const displayTitle = video.title || videoCode;
                            const fullTitle = `${artistName} - ${displayTitle}`;
                            // Truncate title if too long (max 60 characters)
                            const maxLength = 30;
                            const truncatedTitle = fullTitle.length > maxLength 
                                ? fullTitle.substring(0, maxLength - 3) + '...' 
                                : fullTitle;
                            playerInfoHeader.textContent = truncatedTitle;
                            // Add title attribute for full title on hover
                            playerInfoHeader.setAttribute('title', fullTitle);
                            
                            const streamUrl = `${API_BASE}/stream/${encodeURIComponent(artistName)}/${encodeURIComponent(videoCode)}/${encodeURIComponent(primaryMedia.filename)}`;
                            console.log('Stream URL:', streamUrl);
                            
                            if (primaryMedia.type === 'video') {
                                videoPlayerPage.style.display = 'block';
                                audioPlayerPage.style.display = 'none';
                                videoPlayerPage.src = streamUrl;
                                videoPlayerPage.load();
                                
                                videoPlayerPage.addEventListener('error', (e) => {
                                    console.error('Video load error:', e);
                                    playerInfoHeader.textContent = 'Error loading video file';
                                });
                            } else {
                                audioPlayerPage.style.display = 'block';
                                videoPlayerPage.style.display = 'none';
                                audioPlayerPage.src = streamUrl;
                                audioPlayerPage.load();
                                
                                audioPlayerPage.addEventListener('error', (e) => {
                                    console.error('Audio load error:', e);
                                    playerInfoHeader.textContent = 'Error loading audio file';
                                });
                            }
                        } else {
                            console.error('No media file found in video object');
                            playerInfoHeader.textContent = 'No media file found';
                        }
                    } else {
                        console.error('Video not found in list. Looking for:', videoCode);
                        console.log('Available videos:', videos.map(v => v.code));
                        playerInfoHeader.textContent = 'Video not found';
                    }
                })
                .catch(error => {
                    console.error('Error loading video:', error);
                    playerInfoHeader.textContent = `Error: ${error.message}`;
                });
        } else {
            console.error('Invalid URL format. Path parts:', pathParts);
            playerInfoHeader.textContent = 'Invalid URL format';
        }
    } catch (error) {
        console.error('Error in loadPlayerData:', error);
        if (playerInfoHeader) {
            playerInfoHeader.textContent = `Error: ${error.message}`;
        }
    }
}

function setupSwipeGestures() {
    const playerContainer = document.querySelector('.player-wrapper');
    
    function attachSwipeListeners(element) {
        element.addEventListener('touchstart', handleSwipeStart, { passive: false });
        element.addEventListener('touchmove', handleSwipeMove, { passive: false });
        element.addEventListener('touchend', handleSwipeEnd, { passive: false });
        
        let isMouseDown = false;
        element.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
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
    
    attachSwipeListeners(playerContainer);
    attachSwipeListeners(videoPlayerPage);
    attachSwipeListeners(audioPlayerPage);
    
    videoPlayerPage.addEventListener('fullscreenchange', () => {});
    videoPlayerPage.addEventListener('webkitfullscreenchange', () => {});
    videoPlayerPage.addEventListener('mozfullscreenchange', () => {});
    videoPlayerPage.addEventListener('MSFullscreenChange', () => {});
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
    
    const player = videoPlayerPage.style.display !== 'none' ? videoPlayerPage : audioPlayerPage;
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
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.preventDefault();
        
        accumulatedPixels = Math.abs(deltaX);
        swipeLastX = clientX;
        swipeLastTime = now;
        
        const player = videoPlayerPage.style.display !== 'none' ? videoPlayerPage : audioPlayerPage;
        const isPlaying = player && player.readyState > 0 && !player.ended;
        
        if (isPlaying && Math.abs(deltaX) > SWIPE_THRESHOLD) {
            const pixelsRatio = accumulatedPixels / PIXELS_PER_MINUTE;
            const seekAmountSeconds = pixelsRatio * 60;
            const seekAmount = Math.max(seekAmountSeconds, MIN_SEEK_AMOUNT);
            const duration = player.duration;
            
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
            showSeekPreview(icon, actualSeek, newTime, duration);
            
            if (now - lastSeekTime >= SEEK_UPDATE_INTERVAL) {
                const seekDelta = Math.abs(newTime - lastSeekPosition);
                if (seekDelta >= 0.5) {
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
    
    const deltaX = clientX - swipeStartX;
    const deltaY = clientY - swipeStartY;
    
    setTimeout(() => {
        hideSeekPreview();
    }, 100);
    
    isSwipeActive = false;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        const player = videoPlayerPage.style.display !== 'none' ? videoPlayerPage : audioPlayerPage;
        const isPlaying = player && player.readyState > 0 && !player.ended;
        
        if (isPlaying) {
            const pixelsRatio = accumulatedPixels / PIXELS_PER_MINUTE;
            const seekAmountSeconds = pixelsRatio * 60;
            const seekAmount = Math.max(seekAmountSeconds, MIN_SEEK_AMOUNT);
            const duration = player.duration;
            
            if (deltaX > 0) {
                const newTime = Math.min(swipeStartPlayerTime + seekAmount, duration);
                const actualSeek = newTime - swipeStartPlayerTime;
                player.currentTime = newTime;
                showSeekFeedback('⏩', `+${Math.round(actualSeek)}s`, newTime, duration);
            } else {
                const newTime = Math.max(swipeStartPlayerTime - seekAmount, 0);
                const actualSeek = swipeStartPlayerTime - newTime;
                player.currentTime = newTime;
                showSeekFeedback('⏪', `-${Math.round(actualSeek)}s`, newTime, duration);
            }
        }
    } else {
        hideSeekPreview();
    }
    
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

function showSeekPreview(icon, seekAmount, targetTime, duration) {
    if (previewUpdateTimeout) {
        clearTimeout(previewUpdateTimeout);
        previewUpdateTimeout = null;
    }
    
    let feedback = currentPreviewElement;
    
    if (!feedback || !feedback.parentNode || !document.body.contains(feedback)) {
        const existingFeedback = document.querySelector('.seek-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        feedback = document.createElement('div');
        feedback.className = 'seek-feedback preview';
        currentPreviewElement = feedback;
        document.body.appendChild(feedback);
        
        requestAnimationFrame(() => {
            feedback.classList.add('show');
            feedback.style.opacity = '1';
            feedback.style.display = 'flex';
            feedback.style.visibility = 'visible';
            feedback.style.zIndex = '2147483647';
            
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
    
    feedback.classList.add('show');
    feedback.style.opacity = '1';
    feedback.style.display = 'flex';
    feedback.style.visibility = 'visible';
    feedback.style.zIndex = '2147483647';
    feedback.style.position = 'fixed';
    feedback.style.top = '50%';
    feedback.style.left = '50%';
    
    const fullscreenEl = getFullscreenElement();
    if (fullscreenEl) {
        feedback.style.transform = 'translate(-50%, -50%) scale(1)';
    } else {
        feedback.style.transform = 'translate(-50%, -50%) scale(1.333)';
    }
}

function hideSeekPreview() {
    if (previewUpdateTimeout) {
        clearTimeout(previewUpdateTimeout);
        previewUpdateTimeout = null;
    }
    
    if (!isSwipeActive) {
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
    if (currentPreviewElement) {
        if (currentPreviewElement.parentNode) {
            currentPreviewElement.remove();
        }
        currentPreviewElement = null;
    }
    
    const existingPreview = document.querySelector('.seek-feedback.preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    const existingFeedback = document.querySelector('.seek-feedback:not(.preview)');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
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
    
    const fullscreenEl = getFullscreenElement();
    
    if (fullscreenEl) {
        fullscreenEl.appendChild(feedback);
    } else {
        document.body.appendChild(feedback);
    }
    
    setTimeout(() => {
        feedback.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => {
            feedback.remove();
        }, 300);
    }, 1500);
}

