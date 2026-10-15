import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // In local demo mode: restore session if previously logged in as demo admin
      if (localStorage.getItem('mv-demo-admin') === 'true') {
        setUser({ id: 'demo-admin', email: 'admin@memoryvault.local', role: 'admin' })
      }
      setLoading(false)
      return
    }

    // Supabase Auth mode: check current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe?.()
  }, [])

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      // Local demo mode credentials
      if (email === 'admin@memoryvault.local' && password === 'demo-admin-2026') {
        const demoUser = { id: 'demo-admin', email, role: 'admin' }
        setUser(demoUser)
        localStorage.setItem('mv-demo-admin', 'true')
        return { error: null }
      }
      return { error: new Error('Supabase is not configured yet. For local preview, use admin@memoryvault.local / demo-admin-2026') }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data?.user) {
      setUser(data.user)
    }
    return { error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      localStorage.removeItem('mv-demo-admin')
      return
    }
    await supabase.auth.signOut()
    setUser(null)
  }

  // Admin evaluation:
  // In Supabase mode: any authenticated user is an administrator (admin-only project).
  // In Demo mode: only active if demo admin session was explicitly started.
  const isAdmin = isSupabaseConfigured
    ? (!!user && user.app_metadata?.role !== 'visitor')
    : (!!user && localStorage.getItem('mv-demo-admin') === 'true')

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isConfigured: isSupabaseConfigured, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
