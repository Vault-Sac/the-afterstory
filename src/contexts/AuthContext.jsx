import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Explicit database-verified admin check
  const verifyAdminPrivileges = async (currentUser) => {
    if (!currentUser) {
      setIsAdmin(false)
      setAdminRole(null)
      return false
    }

    try {
      // 1. First attempt: call secure SECURITY DEFINER RPC function is_admin()
      const { data: isRpcAdmin, error: rpcError } = await supabase.rpc('is_admin')
      if (!rpcError && typeof isRpcAdmin === 'boolean') {
        setIsAdmin(isRpcAdmin)
        if (isRpcAdmin) setAdminRole('admin')
        return isRpcAdmin
      }

      // 2. Fallback attempt: query protected public.admin_users table directly
      const { data: adminRecord, error: tableError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (!tableError && adminRecord && (adminRecord.role === 'admin' || adminRecord.role === 'superadmin')) {
        setIsAdmin(true)
        setAdminRole(adminRecord.role)
        return true
      }

      // If user is not in admin_users, strictly deny admin access
      setIsAdmin(false)
      setAdminRole(null)
      return false
    } catch (err) {
      console.error('Error verifying admin authorization:', err)
      setIsAdmin(false)
      setAdminRole(null)
      return false
    }
  }

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      // Local demo mode: only active if demo admin session was explicitly signed in
      const isDemo = localStorage.getItem('mv-demo-admin') === 'true'
      if (isDemo) {
        setUser({ id: 'demo-admin', email: 'admin@memoryvault.local', role: 'admin' })
        setIsAdmin(true)
        setAdminRole('admin')
      } else {
        setUser(null)
        setIsAdmin(false)
        setAdminRole(null)
      }
      setLoading(false)
      return
    }

    // Supabase Auth mode
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        await verifyAdminPrivileges(sessionUser)
      } else {
        setIsAdmin(false)
        setAdminRole(null)
      }
      setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        await verifyAdminPrivileges(sessionUser)
      } else {
        setIsAdmin(false)
        setAdminRole(null)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe?.()
    }
  }, [])

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      if (email === 'admin@memoryvault.local' && password === 'demo-admin-2026') {
        const demoUser = { id: 'demo-admin', email, role: 'admin' }
        setUser(demoUser)
        setIsAdmin(true)
        setAdminRole('admin')
        localStorage.setItem('mv-demo-admin', 'true')
        return { error: null }
      }
      return { error: new Error('Supabase is not configured. For local demo, use admin@memoryvault.local / demo-admin-2026') }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }

    if (data?.user) {
      setUser(data.user)
      const isAuthorized = await verifyAdminPrivileges(data.user)
      if (!isAuthorized) {
        // Authenticated, but not in admin_users list
        await supabase.auth.signOut()
        setUser(null)
        setIsAdmin(false)
        setAdminRole(null)
        return { 
          error: new Error('Access Denied: Your account does not have administrator privileges. Please contact the vault owner.') 
        }
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      setIsAdmin(false)
      setAdminRole(null)
      localStorage.removeItem('mv-demo-admin')
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setAdminRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, adminRole, isConfigured: isSupabaseConfigured, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
