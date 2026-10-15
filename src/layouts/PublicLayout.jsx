import React from 'react'
import { Outlet } from 'react-router-dom'
import Navigation from '../components/public/Navigation'
import Footer from '../components/public/Footer'

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <div className="grain" aria-hidden="true" />
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
