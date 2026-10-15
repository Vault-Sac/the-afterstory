import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'

// Public Pages
import Home from './pages/public/Home'
import Journey from './pages/public/Journey'
import DestinationPage from './pages/public/DestinationPage'
import Gallery from './pages/public/Gallery'
import People from './pages/public/People'
import SubmitProfile from './pages/public/SubmitProfile'
import MemoryBoard from './pages/public/MemoryBoard'
import Soundtrack from './pages/public/Soundtrack'
import About from './pages/public/About'

// Admin Pages
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import JourneyAdmin from './pages/admin/JourneyAdmin'
import DestinationsAdmin from './pages/admin/DestinationsAdmin'
import GalleryAdmin from './pages/admin/GalleryAdmin'
import PeopleAdmin from './pages/admin/PeopleAdmin'
import SubmissionsAdmin from './pages/admin/SubmissionsAdmin'
import MemoriesAdmin from './pages/admin/MemoriesAdmin'
import PagesAdmin from './pages/admin/PagesAdmin'
import AdminSettings from './pages/admin/Settings'

import './styles.css'

function RequireAuth({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="loading-spinner" />
        <span>Verifying admin credentials…</span>
      </div>
    )
  }
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

function NotFound() {
  return (
    <div className="not-found-page section-wrap">
      <span className="eyebrow">404 · PAGE NOT FOUND</span>
      <h1>This path is not in the map.</h1>
      <p>The memories you are looking for might have moved or the link may be broken.</p>
      <a href="/" className="button button-light">Return to the Vault</a>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="journey" element={<Journey />} />
            <Route path="destinations/:slug" element={<DestinationPage />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="people" element={<People />} />
            <Route path="submit-your-story" element={<SubmitProfile />} />
            <Route path="memory-board" element={<MemoryBoard />} />
            <Route path="soundtrack" element={<Soundtrack />} />
            <Route path="about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin CMS */}
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="journey" element={<JourneyAdmin />} />
            <Route path="destinations" element={<DestinationsAdmin />} />
            <Route path="gallery" element={<GalleryAdmin />} />
            <Route path="people" element={<PeopleAdmin />} />
            <Route path="submissions" element={<SubmissionsAdmin />} />
            <Route path="memories" element={<MemoriesAdmin />} />
            <Route path="pages" element={<PagesAdmin />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
