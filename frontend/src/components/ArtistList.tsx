import { Link } from 'react-router-dom'
import { Artist, getCoverUrl } from '../api'
import './ArtistList.css'

interface ArtistListProps {
  artists: Artist[]
}

export default function ArtistList({ artists }: ArtistListProps) {
  return (
    <div className="artist-list">
      <h2 className="section-title">Artists</h2>
      <div className="artist-grid">
        {artists.map((artist) => (
          <Link
            key={artist.id}
            to={`/artist/${artist.id}`}
            className="artist-card"
          >
            {artist.cover_path ? (
              <img
                src={getCoverUrl(artist.id)}
                alt={artist.name}
                className="artist-cover"
              />
            ) : (
              <div className="artist-placeholder">
                <span>{artist.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="artist-info">
              <h3>{artist.name}</h3>
              <p>{artist.item_count || 0} items</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

