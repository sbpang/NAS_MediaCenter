import { Item, getFanartUrl } from '../api'
import './ItemPage.css'

interface ItemPageProps {
  item: Item
  children?: React.ReactNode
}

export default function ItemPage({ item, children }: ItemPageProps) {
  return (
    <div className="item-page">
      {item.fanart_path && (
        <div
          className="item-fanart"
          style={{ backgroundImage: `url(${getFanartUrl(item.id)})` }}
        />
      )}
      <div className="item-content">
        {children}
      </div>
    </div>
  )
}

