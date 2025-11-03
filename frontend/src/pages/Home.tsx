import { useEffect, useState } from 'react'
import { getArtists, triggerScan, Artist } from '../api'
import Header from '../components/Header'
import ArtistList from '../components/ArtistList'
import './Home.css'

export default function Home() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    loadArtists()
  }, [])

  const loadArtists = async () => {
    try {
      setLoading(true)
      const data = await getArtists()
      setArtists(data)
    } catch (error) {
      console.error('Failed to load artists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    try {
      setScanning(true)
      const result = await triggerScan()
      console.log('Scan completed:', result)
      await loadArtists()  // Reload after scan
    } catch (error) {
      console.error('Scan failed:', error)
      alert('Scan failed. Check console for details.')
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <div className="home-actions">
        <button
          onClick={handleScan}
          disabled={scanning}
          className="scan-button"
        >
          {scanning ? 'Scanning...' : 'Scan Media Library'}
        </button>
      </div>
      {artists.length === 0 ? (
        <div className="empty-state">
          <p>No artists found. Click "Scan Media Library" to populate.</p>
        </div>
      ) : (
        <ArtistList artists={artists} />
      )}
    </div>
  )
}

