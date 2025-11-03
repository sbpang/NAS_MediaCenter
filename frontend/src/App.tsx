import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Artist from './pages/Artist'
import Item from './pages/Item'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/artist/:id" element={<Artist />} />
        <Route path="/item/:id" element={<Item />} />
      </Routes>
    </Router>
  )
}

export default App

