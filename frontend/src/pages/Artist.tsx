import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getArtistItems, Item } from '../api'
import Header from '../components/Header'
import ItemGrid from '../components/ItemGrid'
import './Artist.css'

export default function Artist() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadItems(parseInt(id))
    }
  }, [id])

  const loadItems = async (artistId: number) => {
    try {
      setLoading(true)
      const data = await getArtistItems(artistId)
      setItems(data)
    } catch (error) {
      console.error('Failed to load items:', error)
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

  return (
    <div>
      <Header />
      <div className="artist-page">
        <Link to="/" className="back-link">← Back to Artists</Link>
        {items.length === 0 ? (
          <div className="empty-state">No items found.</div>
        ) : (
          <ItemGrid items={items} />
        )}
      </div>
    </div>
  )
}

