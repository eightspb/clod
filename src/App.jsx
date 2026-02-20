import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Mammology from './pages/Mammology'
import Gynecology from './pages/Gynecology'
import Endocrinology from './pages/Endocrinology'
import Neurology from './pages/Neurology'
import SecondOpinion from './pages/SecondOpinion'
import Prices from './pages/Prices'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Layout() {
  return (
    <div className="min-h-screen bg-clay-bg font-sans">
      <Header />
      <main>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mammology" element={<Mammology />} />
          <Route path="/gynecology" element={<Gynecology />} />
          <Route path="/endocrinology" element={<Endocrinology />} />
          <Route path="/neurology" element={<Neurology />} />
          <Route path="/second-opinion" element={<SecondOpinion />} />
          <Route path="/prices" element={<Prices />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
