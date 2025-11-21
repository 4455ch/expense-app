'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts'
import { LogOut } from 'lucide-react' // ใช้ Icon เพื่อความสวยงาม (ถ้าไม่มีให้ลบออกได้)
import { supabase } from '@/public/utils/supabase'

interface Transaction {
  id: string; title: string; amount: number; category: string; date: string; type: 'income' | 'expense';
}

export default function Dashboard() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'overall' | 'expense' | 'income'>('overall')

  // Filter Date
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  
  // Form Data
  const [form, setForm] = useState({ 
    title: '', 
    amount: '', 
    category: 'อาหาร', 
    date: new Date().toISOString().split('T')[0],
    type: 'expense' 
  })

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    let query = supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    const { data, error } = await query
    if (!error && data) setTransactions(data as Transaction[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [startDate, endDate, router])

  // --- ACTIONS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from('transactions').insert([
        { ...form, amount: Number(form.amount), user_id: user.id }
      ]).select()

      if (!error && data) {
        fetchData()
        setForm({ ...form, title: '', amount: '' }) 
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

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
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF5555'];

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header: เพิ่มปุ่ม Logout และปรับสี Text ให้ดำเข้ม */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard การเงิน</h1>
          
          <div className="flex items-center gap-4">
             {/* Date Filter */}
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                <span className="text-sm font-bold text-gray-700">ช่วงวันที่:</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"/>
                <span className="text-gray-500">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"/>
            </div>

            {/* ปุ่ม Logout ชัดเจน */}
            <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition-colors text-sm font-bold"
            >
                ออกจากระบบ
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm mb-6 border border-gray-200">
          {['overall', 'expense', 'income'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-bold transition-all ${
                activeTab === tab 
                ? 'bg-gray-900 text-white shadow' 
                : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'overall' ? 'ภาพรวม (Overall)' : tab === 'expense' ? 'รายจ่าย (Expense)' : 'รายรับ (Income)'}
            </button>
          ))}
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT COLUMN: Charts & Lists --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* TAB 1: OVERALL */}
            {activeTab === 'overall' && (
              <>
                {/* Summary Cards */}
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

                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                  <h3 className="text-lg font-bold mb-4 text-gray-900">เปรียบเทียบรายรับ-รายจ่าย (รายเดือน)</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getBarData()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" style={{fontSize: '12px', fill: '#000'}} />
                        <YAxis style={{fontSize: '12px', fill: '#000'}} />
                        <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', color: '#000' }}
                        />
                        <Legend wrapperStyle={{ color: '#000' }}/>
                        <Bar dataKey="income" name="รายรับ" fill="#22c55e" />
                        <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2 & 3: EXPENSE / INCOME */}
            {(activeTab === 'expense' || activeTab === 'income') && (
                <>
                    {/* Chart Card แยกออกมาต่างหาก */}
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                        <h3 className="text-lg font-bold mb-4 text-gray-900">
                            สัดส่วน{activeTab === 'expense' ? 'รายจ่าย' : 'รายรับ'}ตามหมวดหมู่
                        </h3>
                        <div className="h-[300px] flex items-center justify-center">
                            {getPieData(activeTab).length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                <Pie 
                                    data={getPieData(activeTab)} 
                                    cx="50%" cy="50%" 
                                    outerRadius={100} 
                                    fill="#8884d8" 
                                    dataKey="value" 
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {getPieData(activeTab).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ color: 'black' }}/>
                                <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                            ) : (
                            <p className="text-gray-500">ไม่มีข้อมูลในช่วงนี้</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Transaction List Card (แยกออกมาเพื่อให้ไม่ล้นกรอบ) */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-gray-900">
                  รายการ {activeTab === 'overall' ? 'ทั้งหมด' : activeTab === 'expense' ? 'รายจ่าย' : 'รายรับ'}
              </h3>
              {/* กำหนด max-height และ overflow-y-auto เพื่อให้มี scrollbar ในตาราง ไม่ล้น bg */}
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-900 font-bold border-b">
                      <th className="p-3">วันที่</th>
                      <th className="p-3">รายการ</th>
                      <th className="p-3 text-right">จำนวน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions
                      .filter(t => activeTab === 'overall' ? true : t.type === activeTab)
                      .map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-gray-700">{t.date}</td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{t.title}</div>
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 mt-1 inline-block border border-gray-200">
                            {t.category}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan={3} className="text-center p-4 text-gray-500">ไม่พบรายการ</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: Form (Sticky) --- */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100 sticky top-6">
              <h2 className="text-xl font-extrabold mb-6 text-gray-900 border-b pb-2">บันทึกรายการ</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Toggle Income/Expense */}
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setForm({...form, type: 'expense'})}
                    className={`py-2 text-sm font-bold rounded transition-all ${form.type === 'expense' ? 'bg-red-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    รายจ่าย
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({...form, type: 'income'})}
                    className={`py-2 text-sm font-bold rounded transition-all ${form.type === 'income' ? 'bg-green-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    รายรับ
                  </button>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อรายการ</label>
                    <input 
                    type="text" placeholder="เช่น ข้าวมันไก่, เงินเดือน" required
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                    value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนเงิน</label>
                    <input 
                    type="number" placeholder="0.00" required
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                    value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">หมวดหมู่</label>
                    <select 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    >
                    {form.type === 'expense' ? (
                        <>
                        <option>อาหาร</option>
                        <option>เดินทาง</option>
                        <option>ของใช้</option>
                        <option>บิล/หนี้สิน</option>
                        <option>อื่นๆ</option>
                        </>
                    ) : (
                        <>
                        <option>เงินเดือน</option>
                        <option>โบนัส</option>
                        <option>ค้าขาย</option>
                        <option>ลงทุน</option>
                        <option>อื่นๆ</option>
                        </>
                    )}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่</label>
                    <input 
                    type="date" required
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                    />
                </div>

                <button type="submit" className={`w-full py-3 rounded text-white font-bold shadow-lg transition-transform active:scale-95 ${
                  form.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
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