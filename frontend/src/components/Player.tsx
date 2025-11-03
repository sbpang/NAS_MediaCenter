import { useEffect, useRef } from 'react'
import { getStreamUrl, getItemProgress, saveWatchProgress } from '../api'
import './Player.css'

interface PlayerProps {
  itemId: number
}

export default function Player({ itemId }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Restore progress
    const savedTime = getItemProgress(itemId)
    if (savedTime > 0) {
      video.currentTime = savedTime
    }

    // Save progress periodically
    const handleTimeUpdate = () => {
      if (video.currentTime > 5) {  // Only save if watched more than 5 seconds
        saveWatchProgress(itemId, video.currentTime)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [itemId])

  return (
    <div className="player-container">
      <video
        ref={videoRef}
        controls
        className="video-player"
        src={getStreamUrl(itemId)}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

