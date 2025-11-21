'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/public/utils/supabase'
import { useRouter } from 'next/navigation'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { LogOut, Trash2, Settings, X, Edit2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'

// Types
interface Transaction {
  id: string; title: string; amount: number; category: string; date: string; type: 'income' | 'expense';
}
interface Category {
  id: string; name: string; type: 'income' | 'expense';
}

export default function Dashboard() {
  const router = useRouter()

  // --- STATES ---
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'overall' | 'expense' | 'income'>('overall')
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const [form, setForm] = useState({
    title: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], type: 'expense'
  })

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // --- 🔥 MODAL STATES (เพิ่มใหม่) ---
  // 1. Alert Modal State (สำหรับแจ้งเตือนทั่วไป)
  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: '', message: '', type: 'warning' as 'warning' | 'success'
  })

  // 2. Confirm Modal State (สำหรับยืนยันการลบ)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { } // เก็บฟังก์ชันที่จะทำเมื่อกดตกลง
  })

  // --- HELPER FUNCTIONS ---
  // ฟังก์ชันเรียก Alert สวยๆ
  const showAlert = (title: string, message: string, type: 'warning' | 'success' = 'warning') => {
    setAlertModal({ isOpen: true, title, message, type })
  }

  // ฟังก์ชันเรียก Confirm สวยๆ
  const showConfirm = (title: string, message: string, onConfirmAction: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: onConfirmAction })
  }

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const userId = session.user.id

    let query = supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
    const { data: transData } = await query
    if (transData) setTransactions(transData as Transaction[])

    const { data: catData } = await supabase.from('categories').select('*').order('name')

    if (!catData || catData.length === 0) {
      const defaultCats = [
        { name: 'อาหาร', type: 'expense', user_id: userId },
        { name: 'เดินทาง', type: 'expense', user_id: userId },
        { name: 'ของใช้', type: 'expense', user_id: userId },
        { name: 'เงินเดือน', type: 'income', user_id: userId },
        { name: 'โบนัส', type: 'income', user_id: userId },
      ]
      await supabase.from('categories').insert(defaultCats)
      const { data: newCats } = await supabase.from('categories').select('*')
      if (newCats) setCategories(newCats as Category[])
    } else {
      setCategories(catData as Category[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [startDate, endDate, router])

  useEffect(() => {
    const validCats = categories.filter(c => c.type === form.type)
    if (validCats.length > 0) {
      setForm(prev => ({ ...prev, category: validCats[0].name }))
    }
  }, [categories, form.type])


  // --- ACTIONS: TRANSACTIONS ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedDate = new Date(form.date)
    const today = new Date()
    // today.setHours(0, 0, 0, 0)

    // 🔥 ใช้ showAlert แทน window.alert
    if (selectedDate > today) {
      showAlert('แจ้งเตือนวันที่', 'คุณกำลังบันทึกวันที่ในอนาคต!', 'warning')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from('transactions').insert([
        { ...form, amount: Number(form.amount), user_id: user.id }
      ]).select()

      if (!error && data) {
        fetchData()
        setForm({ ...form, title: '', amount: '' })
        // Optional: แจ้งเตือนว่าบันทึกสำเร็จ
        // showAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success')
      }
    }
  }

  const handleDeleteTransaction = (id: string) => {
    // 🔥 ใช้ showConfirm แทน window.confirm
    showConfirm(
      'ยืนยันการลบ',
      'คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
      async () => {
        // Logic การลบจริงๆ ย้ายมาอยู่ในนี้
        await supabase.from('transactions').delete().eq('id', id)
        setTransactions(transactions.filter(t => t.id !== id))
        setConfirmModal(prev => ({ ...prev, isOpen: false })) // ปิด Modal
      }
    )
  }

  // --- ACTIONS: CATEGORIES ---

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('categories').insert([
        { name: newCategoryName, type: activeTab === 'income' ? 'income' : 'expense', user_id: user.id }
      ])
      setNewCategoryName('')
      fetchData()
    }
  }

  const handleDeleteCategory = (id: string) => {
    // 🔥 ใช้ showConfirm แทน window.confirm
    showConfirm(
      'ลบหมวดหมู่',
      'ต้องการลบหมวดหมู่นี้? (รายการเก่าที่ใช้หมวดหมู่นี้จะยังอยู่ แต่จะเลือกใหม่ไม่ได้)',
      async () => {
        await supabase.from('categories').delete().eq('id', id)
        fetchData()
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    )
  }

  const handleEditCategory = async (category: Category) => {
    const newName = prompt('แก้ไขชื่อหมวดหมู่:', category.name) // อันนี้ใช้ prompt ไปก่อนเพราะทำ Modal input จะซับซ้อนขึ้น
    if (newName && newName !== category.name) {
      await supabase.from('categories').update({ name: newName }).eq('id', category.id)
      fetchData()
    }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  // --- DATA PREP ---
  const getPieData = (type: 'income' | 'expense') => {
    const filtered = transactions.filter(t => t.type === type)
    return filtered.reduce((acc: any[], curr) => {
      const found = acc.find(i => i.name === curr.category)
      if (found) found.value += curr.amount
      else acc.push({ name: curr.category, value: curr.amount })
      return acc
    }, [])
  }

  const getBarData = () => {
    const grouped = transactions.reduce((acc: any, curr) => {
      const monthKey = curr.date.substring(0, 7)
      if (!acc[monthKey]) acc[monthKey] = { name: monthKey, income: 0, expense: 0 }
      if (curr.type === 'income') acc[monthKey].income += curr.amount
      else acc[monthKey].expense += curr.amount
      return acc
    }, {})
    return Object.values(grouped).sort((a: any, b: any) => a.name.localeCompare(b.name))
  }

  const summary = {
    income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  }
  const balance = summary.income - summary.expense
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF5555', '#A0A0A0'];

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans relative">

      {/* 🔥 1. ALERT MODAL UI */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              {alertModal.type === 'warning' ? (
                <div className="bg-yellow-100 p-3 rounded-full"><AlertTriangle className="text-yellow-600 w-8 h-8" /></div>
              ) : (
                <div className="bg-green-100 p-3 rounded-full"><CheckCircle className="text-green-600 w-8 h-8" /></div>
              )}
              <h3 className="text-xl font-bold text-gray-900">{alertModal.title}</h3>
              <p className="text-gray-500 text-sm">{alertModal.message}</p>
              <button
                onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold hover:bg-black transition-all mt-2"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 2. CONFIRM MODAL UI */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-red-100 p-3 rounded-full"><AlertCircle className="text-red-600 w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-gray-900">{confirmModal.title}</h3>
              <p className="text-gray-500 text-sm">{confirmModal.message}</p>

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  ยืนยันลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Category Modal (อันเดิม) --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-black">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold">จัดการหมวดหมู่ ({activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'})</h3>
              <button onClick={() => setShowCategoryModal(false)}><X /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="ชื่อหมวดหมู่ใหม่"
                className="border p-2 flex-1 rounded"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />
              <button onClick={handleAddCategory} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">เพิ่ม</button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {categories.filter(c => c.type === (activeTab === 'income' ? 'income' : 'expense')).map(c => (
                <li key={c.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                  <span>{c.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditCategory(c)} className="text-yellow-600 hover:text-yellow-800"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteCategory(c.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* -------------------------------- */}

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard การเงิน</h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
              <span className="text-sm font-bold text-gray-700">ช่วงวันที่:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
              <span className="text-gray-500">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition-colors text-sm font-bold">
              <LogOut size={16} /> ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm mb-6 border border-gray-200 relative">
          {['overall', 'expense', 'income'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-bold transition-all ${activeTab === tab ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {tab === 'overall' ? 'ภาพรวม (Overall)' : tab === 'expense' ? 'รายจ่าย (Expense)' : 'รายรับ (Income)'}
            </button>
          ))}

          {activeTab !== 'overall' && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="absolute right-2 top-2 bg-gray-100 text-gray-700 p-2 rounded hover:bg-gray-200 flex items-center gap-1 text-xs font-bold border border-gray-300"
            >
              <Settings size={14} /> จัดการหมวดหมู่
            </button>
          )}
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Content */}
          <div className="lg:col-span-2 space-y-6">

            {activeTab === 'overall' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-500">
                    <p className="text-sm text-gray-600 font-medium">รายรับรวม</p>
                    <p className="text-xl font-black text-green-600">+{summary.income.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg shadow border-l-4 border-red-500">
                    <p className="text-sm text-gray-600 font-medium">รายจ่ายรวม</p>
                    <p className="text-xl font-black text-red-600">-{summary.expense.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 font-medium">คงเหลือ</p>
                    <p className={`text-xl font-black ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                  <h3 className="text-lg font-bold mb-4 text-gray-900">เปรียบเทียบรายรับ-รายจ่าย</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getBarData()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" style={{ fontSize: '12px', fill: '#000' }} />
                        <YAxis style={{ fontSize: '12px', fill: '#000' }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
                        <Legend wrapperStyle={{ color: '#000' }} />
                        <Bar dataKey="income" name="รายรับ" fill="#22c55e" />
                        <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {(activeTab === 'expense' || activeTab === 'income') && (
              <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                <h3 className="text-lg font-bold mb-4 text-gray-900">สัดส่วน{activeTab === 'expense' ? 'รายจ่าย' : 'รายรับ'}ตามหมวดหมู่</h3>
                <div className="h-[300px]">
                  {getPieData(activeTab).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPieData(activeTab)} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {getPieData(activeTab).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ color: 'black' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (<p className="text-gray-500 text-center pt-20">ไม่มีข้อมูลในช่วงนี้</p>)}
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-gray-900">รายการ {activeTab === 'overall' ? 'ทั้งหมด' : activeTab === 'expense' ? 'รายจ่าย' : 'รายรับ'}</h3>
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-900 font-bold border-b">
                      <th className="p-3">วันที่</th>
                      <th className="p-3">รายการ</th>
                      <th className="p-3 text-right">จำนวน</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions
                      .filter(t => activeTab === 'overall' ? true : t.type === activeTab)
                      .map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="p-3 text-gray-700">{t.date}</td>
                          <td className="p-3">
                            <div className="font-semibold text-gray-900">{t.title}</div>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 mt-1 inline-block border border-gray-200">{t.category}</span>
                          </td>
                          <td className={`p-3 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="ลบรายการ"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    {transactions.length === 0 && (<tr><td colSpan={4} className="text-center p-4 text-gray-500">ไม่พบรายการ</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: Form */}
          <div className="lg:col-span-1 text-black">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100 sticky top-6">
              <h2 className="text-xl font-extrabold mb-6 text-gray-900 border-b pb-2">บันทึกรายการ</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'expense', category: categories.find(c => c.type === 'expense')?.name || '' })}
                    className={`py-2 text-sm font-bold rounded transition-all ${form.type === 'expense' ? 'bg-red-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                  >รายจ่าย</button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'income', category: categories.find(c => c.type === 'income')?.name || '' })}
                    className={`py-2 text-sm font-bold rounded transition-all ${form.type === 'income' ? 'bg-green-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                  >รายรับ</button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อรายการ</label>
                  <input type="text" placeholder="รายการ" required className="w-full p-2 border rounded"
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนเงิน</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    min="0"            // 1. บอก Browser ว่าต่ำสุดคือ 0 (HTML Validation)
                    step="any"         // 2. ให้ใส่ทศนิยมได้
                    className="w-full p-2 border rounded"
                    value={form.amount}

                    // 3. ส่วน Logic: ถ้าค่าที่เข้ามาติดลบจะไม่เซ็ตค่าลง State
                    onChange={e => {
                      const val = e.target.value
                      if (val === '' || Number(val) >= 0) {
                        setForm({ ...form, amount: val })
                      }
                    }}

                    // 4. ส่วน UX: ห้ามกดปุ่มเครื่องหมายลบ (-) หรือตัว e (exponent) บนคีย์บอร์ด
                    onKeyDown={(e) => {
                      if (["-", "e", "E"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between">
                    หมวดหมู่
                    <span className="text-xs text-blue-600 cursor-pointer font-normal" onClick={() => setShowCategoryModal(true)}>+ จัดการ</span>
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.filter(c => c.type === form.type).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {categories.filter(c => c.type === form.type).length === 0 && <option>กรุณาเพิ่มหมวดหมู่</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">วันที่</label>
                  <input type="date" required className="w-full p-2 border rounded"
                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>

                <button type="submit" className={`w-full py-3 rounded text-white font-bold shadow-lg active:scale-95 ${form.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                  + บันทึก{form.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}