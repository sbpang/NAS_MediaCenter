import { Link } from 'react-router-dom'
import { Item, getPosterUrl } from '../api'
import './ItemGrid.css'

interface ItemGridProps {
  items: Item[]
}

export default function ItemGrid({ items }: ItemGridProps) {
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return ''
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="item-grid">
      {items.map((item) => (
        <Link key={item.id} to={`/item/${item.id}`} className="item-card">
          {item.poster_path ? (
            <img
              src={getPosterUrl(item.id)}
              alt={item.title || item.video_code}
              className="item-poster"
            />
          ) : (
            <div className="item-placeholder">
              <span>{(item.title || item.video_code).charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="item-info">
            <h3>{item.title || item.video_code}</h3>
            {item.duration_sec && (
              <p className="item-duration">{formatDuration(item.duration_sec)}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

