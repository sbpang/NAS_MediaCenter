import { Link } from 'react-router-dom'
import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="header-title">
        <h1>LAN Media Center</h1>
      </Link>
      <nav className="header-nav">
        <Link to="/">Home</Link>
      </nav>
    </header>
  )
}

