import { useState, useEffect } from 'react'
import Sidebar from '../components/Chat/Sidebar'
import ChatWindow from '../components/Chat/ChatWindow'
import NewChatModal from '../components/Chat/NewChatModal'
import NewGroupModal from '../components/Chat/NewGroupModal'
import ProfileModal from '../components/Profile/ProfileModal'
import ManageChatsModal from '../components/Chat/ManageChatsModal'
import NavBar from '../components/NavBar'
import { MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarHiddenDesktop, setSidebarHiddenDesktop] = useState(false)

  const handleChatCreated = (chatId) => {
    setSelectedChat(chatId)
    try { localStorage.setItem('selected_chat_id', chatId || '') } catch (_) {}
  }

  const handleGroupCreated = (chatId) => {
    setSelectedChat(chatId)
    setMobileSidebarOpen(false)
    try { localStorage.setItem('selected_chat_id', chatId || '') } catch (_) {}
  }

  useEffect(() => {
    // Restore previously selected chat on initial load
    try {
      const saved = localStorage.getItem('selected_chat_id')
      if (saved && typeof saved === 'string' && saved.trim().length > 0) {
        setSelectedChat(saved)
      }
    } catch (_) {}

    const onDeleted = (e) => {
      const id = e?.detail?.chatId
      if (id && id === selectedChat) setSelectedChat(null)
      try { localStorage.removeItem('selected_chat_id') } catch (_) {}
    }
    window.addEventListener('chat:deleted', onDeleted)
    const onOpenChat = (e) => {
      const id = e?.detail?.chatId
      if (id) {
        setSelectedChat(id)
        setMobileSidebarOpen(false)
      }
    }
    window.addEventListener('open:chat', onOpenChat)
    return () => {
      window.removeEventListener('chat:deleted', onDeleted)
      window.removeEventListener('open:chat', onOpenChat)
    }
  }, [selectedChat])

  const handleSelectChat = (id) => {
    setSelectedChat(id)
    setMobileSidebarOpen(false)
    try { localStorage.setItem('selected_chat_id', id || '') } catch (_) {}
  }

  // Keep localStorage in sync when selection changes to null (e.g., after deletion)
  useEffect(() => {
    if (!selectedChat) {
      try { localStorage.removeItem('selected_chat_id') } catch (_) {}
    }
  }, [selectedChat])

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-900 pt-14">
      <NavBar
        onNewChat={() => setShowNewChat(true)}
        onOpenProfile={() => setShowProfile(true)}
        onToggleSidebar={() => setMobileSidebarOpen((v) => !v)}
        onOpenManage={() => setShowManage(true)}
        onOpenCreateGroup={() => setShowNewGroup(true)}
      />
      <div className={`flex h-[calc(100vh-3.5rem)] overflow-hidden ${!sidebarHiddenDesktop ? 'md:ml-80' : ''}`}>
        <Sidebar
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onNewChat={() => setShowNewChat(true)}
          onOpenProfile={() => setShowProfile(true)}
          mobileOpen={mobileSidebarOpen}
          hiddenDesktop={sidebarHiddenDesktop}
        />

        {selectedChat ? (
          <ChatWindow chatId={selectedChat} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 -z-10 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-blue-100/40 dark:bg-blue-900/20 blur-2xl animate-pulse" />
              </div>
              <MessageSquare className="w-24 h-24 text-blue-500 dark:text-blue-400 animate-pulse drop-shadow-sm" />
              <div className="absolute -top-2 -right-8">
                <div className="w-4 h-4 rounded-full bg-blue-400/80 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <div className="absolute -bottom-3 -left-6">
                <div className="w-3 h-3 rounded-full bg-indigo-400/80 animate-bounce" style={{ animationDelay: '0.6s' }} />
              </div>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-slate-100">Welcome to Chat</h2>
            <p className="mt-2 text-gray-500 dark:text-slate-400 text-center max-w-md">
              Select a conversation from the sidebar or start a new chat to begin messaging
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm text-gray-400 dark:text-slate-500">
              <span className="inline-flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-pulse" style={{ animationDelay: '0.4s' }}></span>
              </span>
            </div>
          </div>
        )}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        {/* Desktop sidebar toggle button */}
        <button
          onClick={() => setSidebarHiddenDesktop((v) => !v)}
          className="hidden md:flex items-center justify-center fixed top-1/2 -translate-y-1/2 left-0 z-30 w-6 h-10 rounded-r-lg bg-white dark:bg-slate-800 border border-l-0 border-gray-200 dark:border-slate-700 shadow"
          title={sidebarHiddenDesktop ? 'Show sidebar' : 'Hide sidebar'}
        >
          {sidebarHiddenDesktop ? (
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-slate-200" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-slate-200" />
          )}
        </button>
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleChatCreated}
        />
      )}

      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {showManage && <ManageChatsModal onClose={() => setShowManage(false)} />}
    </div>
  )
}

