import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getItem, Item as ItemType, getItemProgress } from '../api'
import Header from '../components/Header'
import ItemPage from '../components/ItemPage'
import Player from '../components/Player'
import './Item.css'

export default function Item() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<ItemType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadItem(parseInt(id))
    }
  }, [id])

  const loadItem = async (itemId: number) => {
    try {
      setLoading(true)
      const data = await getItem(itemId)
      setItem(data)
    } catch (error) {
      console.error('Failed to load item:', error)
    } finally {
      setLoading(false)
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

  if (!item) {
    return (
      <div>
        <Header />
        <div className="error">Item not found</div>
      </div>
    )
  }

  const savedProgress = getItemProgress(item.id)
  const hasProgress = savedProgress > 5

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'Unknown'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div>
      <Header />
      <ItemPage item={item}>
        <div className="item-details">
          <Link to={`/artist/${item.artist_id}`} className="back-link">
            ← Back to {item.artist_name || 'Artist'}
          </Link>
          
          <div className="item-header">
            <h1>{item.title || item.video_code}</h1>
            {hasProgress && (
              <div className="progress-badge">Continue Watching</div>
            )}
          </div>

          <div className="item-metadata">
            {item.duration_sec && (
              <div className="meta-item">
                <strong>Duration:</strong> {formatDuration(item.duration_sec)}
              </div>
            )}
            {item.width && item.height && (
              <div className="meta-item">
                <strong>Resolution:</strong> {item.width}x{item.height}
              </div>
            )}
            {item.vcodec && (
              <div className="meta-item">
                <strong>Video:</strong> {item.vcodec}
              </div>
            )}
            {item.acodec && (
              <div className="meta-item">
                <strong>Audio:</strong> {item.acodec}
              </div>
            )}
            {item.mtime && (
              <div className="meta-item">
                <strong>Modified:</strong> {new Date(item.mtime).toLocaleDateString()}
              </div>
            )}
          </div>

          <Player itemId={item.id} />
        </div>
      </ItemPage>
    </div>
  )
}

