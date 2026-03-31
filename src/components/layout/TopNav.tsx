'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import { Bell, Menu, LogOut, Shield, Crown, User, Settings } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import ProfileModal from '@/components/ui/ProfileModal'

const ROLE_COLORS: Record<string, string> = {
  god: '#D4A843', moderator: '#F59E0B', user: '#4D8BFF',
}
const ROLE_LABELS: Record<string, string> = {
  god: 'GOD', moderator: 'MOD', user: 'USER',
}

const NOTIF_TYPE_COLOR: Record<string, string> = {
  success: '#25C292', info: '#4D8BFF', warning: '#F59E0B', admin: '#FF4D6A',
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      if (data.notifications) {
        setNotifs(data.notifications)
        setUnread(data.unread ?? 0)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!user) return  // only poll when authenticated
    load()
    const iv = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(iv)
  }, [load, user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mark_all: true }) })
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'À l\'instant'
    if (m < 60) return `Il y a ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `Il y a ${h}h`
    return `Il y a ${Math.floor(h / 24)}j`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load() }}
        className="relative p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
            style={{ background: '#FF4D6A', color: '#fff' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50 animate-slide-up"
          style={{ background: '#161D35', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>

          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="font-cinzel text-sm font-bold text-white">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#D4A843] hover:text-[#D4A843]/70 transition-colors">
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center">
                <Bell size={24} className="mx-auto text-gray-700 mb-2" />
                <p className="text-gray-600 text-sm">Aucune notification</p>
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className="w-full text-left px-4 py-3 border-b border-white/5 last:border-0 transition-colors hover:bg-white/3"
                  style={{ background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: n.is_read ? 'transparent' : (NOTIF_TYPE_COLOR[n.type] ?? '#6B7280') }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold leading-tight">{n.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-gray-600 text-xs mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TopNav() {
  const { user, logout } = useAuth()
  const { toggleSidebar } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roleColor = ROLE_COLORS[user?.role ?? 'user'] ?? '#4D8BFF'

  return (
    <>
      <header className="h-14 flex items-center justify-between px-6 flex-shrink-0 relative z-30"
        style={{ background: '#111628', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="text-gray-400 hover:text-white transition-colors p-1 rounded">
            <Menu size={20} />
          </button>
          <span className="font-cinzel text-sm font-semibold text-[#D4A843] tracking-widest hidden md:block">
            AMF QUEST
          </span>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-3 p-1 rounded-lg hover:bg-white/5 transition-all">
                <div className="text-right hidden sm:block">
                  <p className="text-white text-sm font-medium leading-none">{user.full_name}</p>
                  <div className="flex justify-end mt-1">
                    <Badge color={roleColor} size="sm">
                      {user.role === 'god' && <Crown size={9} className="mr-1 inline" />}
                      {user.role === 'moderator' && <Shield size={9} className="mr-1 inline" />}
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${roleColor}20`, border: `2px solid ${roleColor}50`, color: roleColor }}>
                  <span className="text-sm font-bold">{user.full_name.charAt(0).toUpperCase()}</span>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50 animate-slide-up"
                  style={{ background: '#161D35', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-white text-sm font-semibold truncate">{user.full_name}</p>
                    <p className="text-gray-500 text-xs truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <DropdownItem icon={<User size={14} />} label="Mon profil"
                      onClick={() => { setDropdownOpen(false); setProfileOpen(true) }} />
                    {(user.role === 'moderator' || user.role === 'god') && (
                      <DropdownItem icon={<Settings size={14} />} label="Administration"
                        onClick={() => { setDropdownOpen(false); window.location.href = '/admin' }} />
                    )}
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button onClick={() => { setDropdownOpen(false); logout() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <LogOut size={14} />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {profileOpen && user && (
        <ProfileModal user={user} onClose={() => setProfileOpen(false)} />
      )}
    </>
  )
}

function DropdownItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
      <span className="text-gray-500">{icon}</span>
      {label}
    </button>
  )
}
