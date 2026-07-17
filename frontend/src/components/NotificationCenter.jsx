import React, { useState, useEffect } from 'react'
import { HiBell, HiShieldCheck, HiOutlineCheckCircle, HiExclamationCircle, HiTrash } from 'react-icons/hi'
import { notificationApi } from '../services/api'
import { toast } from 'react-toastify'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications()
      if (res.data.success) {
        setNotifications(res.data.data)
      }
      const countRes = await notificationApi.getUnreadCount()
      if (countRes.data.success) {
        setUnreadCount(countRes.data.data)
      }
    } catch (err) {
      console.error("Failed to load notifications", err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll notifications every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id, e) => {
    e.stopPropagation()
    try {
      const res = await notificationApi.markRead(id)
      if (res.data.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      toast.error("Failed to update notification")
    }
  }

  const markAllRead = async () => {
    try {
      const res = await notificationApi.markAllRead()
      if (res.data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
        toast.success("All notifications marked as read")
      }
    } catch (err) {
      toast.error("Failed to clear notifications")
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'SECURITY':
        return <HiExclamationCircle className="text-xl text-amber-400" />
      case 'DUPLICATE':
        return <HiExclamationCircle className="text-xl text-rose-400" />
      case 'SHARE':
        return <HiOutlineCheckCircle className="text-xl text-emerald-400" />
      default:
        return <HiShieldCheck className="text-xl text-blue-400" />
    }
  }

  return (
    <div className="relative">
      {/* Trigger Bell Icon */}
      <button 
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-all duration-300"
      >
        <HiBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Alert Center</span>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {notifications.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-400">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`px-5 py-3.5 flex gap-3 transition-colors hover:bg-white/5 ${
                      !n.isRead ? 'bg-purple-600/5' : ''
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs text-slate-200 ${!n.isRead ? 'font-bold' : ''}`}>{n.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-[8px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                    {!n.isRead && (
                      <button 
                        onClick={(e) => markAsRead(n.id, e)}
                        title="Mark as read"
                        className="self-center p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      >
                        <HiTrash className="text-sm" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
