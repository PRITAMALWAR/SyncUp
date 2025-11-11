import { useState } from 'react'
import LoginForm from '../components/Auth/LoginForm'
import RegisterForm from '../components/Auth/RegisterForm'
import { MessageSquare } from 'lucide-react'
import NavBar from '../components/NavBar'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 flex flex-col">
      <NavBar onNewChat={() => {}} onOpenProfile={() => {}} />
      <div className="w-full flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl flex items-center justify-center gap-12">
          {/* Left-side info section (visible on large screens) */}
          <div className="hidden lg:flex flex-col items-center">
            <MessageSquare className="w-32 h-32 text-blue-600 mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Real-Time Chat</h1>
            <p className="text-xl text-gray-600 text-center max-w-md">
              Connect with friends and colleagues instantly with secure, real-time messaging
            </p>

            {/* Feature list */}
            <div className="mt-8 grid grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Real-time Messages</h3>
                  <p className="text-sm text-gray-600">Instant message delivery</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Online Status</h3>
                  <p className="text-sm text-gray-600">See who's available</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Private & Group</h3>
                  <p className="text-sm text-gray-600">One-on-one or team chats</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure Auth</h3>
                  <p className="text-sm text-gray-600">Protected with JWT</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right-side login/register form */}
          <div className="shrink-0">
            {isLogin ? (
              <LoginForm onToggle={() => setIsLogin(false)} />
            ) : (
              <RegisterForm onToggle={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
