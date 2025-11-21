'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/public/utils/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  
  // State สำหรับ Form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // State สำหรับ Tab ('login' หรือ 'register')
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  // เช็คว่าถ้า Login อยู่แล้วให้เด้งไป Dashboard
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    checkUser()
  }, [router])

  // ฟังก์ชันจัดการ Email/Password (ใช้ร่วมกันแต่เช็ค Tab)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (activeTab === 'register') {
      // สมัครสมาชิก
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        alert(error.message)
      } else {
        alert('สมัครสมาชิกสำเร็จ! (ถ้าตั้งค่า Confirm Email ไว้ โปรดเช็คอีเมล)')
        // อาจจะสลับไป Tab Login อัตโนมัติ
        setActiveTab('login')
      }
    } else {
      // เข้าสู่ระบบ
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        alert(error.message)
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  // ฟังก์ชัน Google Login
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`, // ต้องตรงกับที่ตั้งใน Supabase
      },
    })
    if (error) alert(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        
        {/* Header Title */}
        <div className="p-8 pb-6 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Expense App
          </h1>
          <p className="text-gray-500 text-sm mt-2">จัดการรายรับ-รายจ่าย ง่ายและรวดเร็ว</p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${
              activeTab === 'login' 
                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${
              activeTab === 'register' 
                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            สร้างบัญชีใหม่
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <form onSubmit={handleEmailAuth} className="space-y-5">
            
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">อีเมล</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">รหัสผ่าน</label>
                <input
                  type="password"
                  required
                  placeholder={activeTab === 'register' ? "ตั้งรหัสผ่าน (6 ตัวขึ้นไป)" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white"
                />
            </div>

            {/* ปุ่ม Submit เปลี่ยนข้อความตาม Tab */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white p-3 rounded-lg font-bold hover:bg-black active:scale-[0.98] transition-all shadow-md disabled:opacity-70 mt-2"
            >
              {loading ? 'กำลังประมวลผล...' : activeTab === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          </form>

          {/* Divider & Google Login */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">หรือ ดำเนินการต่อด้วย</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-700 border border-gray-300 p-3 rounded-lg font-bold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-3"
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C.79 9.79 0 12 0 12s.79 4.41 2.18 7.15l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google Account
          </button>

        </div>
      </div>
    </div>
  )
}