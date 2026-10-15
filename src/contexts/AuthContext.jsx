import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      // Demo mode: accept hardcoded credentials for local dev only
      if (email === 'admin@memoryvault.local' && password === 'demo-admin-2026') {
        const demoUser = { id: 'demo', email, role: 'admin' }
        setUser(demoUser)
        localStorage.setItem('mv-demo-admin', 'true')
        return { error: null }
      }
      return { error: new Error('Supabase not configured. Use admin@memoryvault.local / demo-admin-2026 for demo.') }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      localStorage.removeItem('mv-demo-admin')
      return
    }
    await supabase.auth.signOut()
  }

  const isAdmin = !!user && (
    user.role === 'admin' ||
    user.app_metadata?.role === 'admin' ||
    localStorage.getItem('mv-demo-admin') === 'true'
  )

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
