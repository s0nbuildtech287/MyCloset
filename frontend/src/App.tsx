import { useState, useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { apiClient } from './api/client'
import WardrobeGrid from './components/wardrobe/WardrobeGrid'
import ItemForm from './components/wardrobe/ItemForm'
import type { ClothingItem } from '../../shared/types'
import { Shirt, LogOut, User as UserIcon, PlusCircle, LayoutGrid } from 'lucide-react'

function App() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const [isLoginMode, setIsLoginMode] = useState(true)
  
  // Form states - prefilled for internal testing as requested
  const [email, setEmail] = useState('xu4ns0n@drobe.com')
  const [password, setPassword] = useState('123456')
  const [name, setName] = useState('')
  
  // App navigation and edit states
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'add_item' | 'profile'>('wardrobe')
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null)
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [healthStatus, setHealthStatus] = useState<any>(null)

  // Fetch health status and try automatic refresh on startup
  useEffect(() => {
    apiClient.get('/health')
      .then(res => setHealthStatus(res.data))
      .catch(err => console.error('Health check failed', err))
      
    apiClient.post('/auth/refresh')
      .then(res => {
        setAuth(res.data.user, res.data.accessToken)
      })
      .catch(() => {
        // Not logged in yet, safe to ignore
      })
  }, [setAuth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register'
    const payload = isLoginMode ? { email, password } : { email, password, name }
    
    try {
      const response = await apiClient.post(endpoint, payload)
      const { user, accessToken } = response.data
      setAuth(user, accessToken)
      setSuccess(`Thành công! Chào mừng ${user.name || user.email}`)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng nhập không thành công')
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout')
      clearAuth()
      setSuccess('Đã đăng xuất thành công')
      setError('')
      setActiveTab('wardrobe')
      setEditingItem(null)
    } catch (err: any) {
      setError('Đăng xuất thất bại')
    }
  }

  const handleEditItem = (item: ClothingItem) => {
    setEditingItem(item)
    setActiveTab('add_item')
  };

  const handleFormSuccess = () => {
    setSuccess(editingItem ? 'Cập nhật món đồ thành công' : 'Thêm món đồ thành công');
    setEditingItem(null);
    setActiveTab('wardrobe');
  };

  const handleFormCancel = () => {
    setEditingItem(null);
    setActiveTab('wardrobe');
  };

  return (
    <div className="min-h-screen bg-[#FAF6F1] font-sans flex flex-col justify-between">
      
      {/* Navbar if logged in */}
      {isAuthenticated && user && (
        <header className="bg-white border-b border-stone-100 shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('wardrobe'); setEditingItem(null); }}>
              <Shirt className="h-6 w-6 text-[#C4704F]" />
              <span className="text-xl font-bold font-serif text-[#2A2521] tracking-tight">Drobe.</span>
            </div>
            
            {/* Tabs */}
            <nav className="flex gap-1">
              <button
                onClick={() => { setActiveTab('wardrobe'); setEditingItem(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'wardrobe' && !editingItem
                    ? 'bg-[#C4704F]/10 text-[#C4704F]'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Tủ đồ
              </button>

              <button
                onClick={() => { setActiveTab('add_item'); setEditingItem(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'add_item' && !editingItem
                    ? 'bg-[#C4704F]/10 text-[#C4704F]'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                Thêm đồ
              </button>

              <button
                onClick={() => { setActiveTab('profile'); setEditingItem(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-[#C4704F]/10 text-[#C4704F]'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                Hồ sơ
              </button>
            </nav>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-red-600 transition-colors py-2 px-3 rounded-lg hover:bg-red-50"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Unauthenticated View: Auth Form */}
        {!isAuthenticated ? (
          <div className="max-w-md w-full mx-auto space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-stone-100 mt-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#2A2521] font-serif">
                Drobe.
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                Web app quản lý tủ quần áo cá nhân trực quan
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center border border-red-100">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm text-center border border-green-100">
                {success}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {!isLoginMode && (
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Họ và tên
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] text-sm"
                      placeholder="Nhập tên của bạn"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Email đăng nhập
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] text-sm"
                    placeholder="xu4ns0n@drobe.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#C4704F] hover:bg-[#b05f3f] focus:outline-none transition-colors"
                >
                  {isLoginMode ? 'Đăng Nhập' : 'Đăng Ký'}
                </button>
              </div>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(!isLoginMode)
                    setError('')
                    setSuccess('')
                  }}
                  className="font-medium text-[#C4704F] hover:underline"
                >
                  {isLoginMode ? "Chưa có tài khoản? Đăng ký ngay" : 'Đã có tài khoản? Đăng nhập'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Authenticated Pages View */
          <div className="space-y-6">
            
            {/* Success flash notifications */}
            {success && (
              <div className="bg-green-50 border border-green-100 text-green-700 p-3 rounded-lg text-sm text-center max-w-2xl mx-auto">
                {success}
              </div>
            )}

            {/* Tab Rendering */}
            {activeTab === 'wardrobe' && !editingItem && (
              <WardrobeGrid onEditItem={handleEditItem} />
            )}

            {activeTab === 'add_item' && (
              <ItemForm
                initialItem={editingItem}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            )}

            {activeTab === 'profile' && (
              <div className="max-w-md mx-auto bg-white border border-stone-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-[#2A2521] border-b border-stone-100 pb-2 font-serif">Thông tin tài khoản</h3>
                <div className="space-y-2 text-sm text-stone-600">
                  <p><span className="font-semibold text-stone-700">Tên hiển thị:</span> {user.name || 'Chưa thiết lập'}</p>
                  <p><span className="font-semibold text-stone-700">Email:</span> {user.email}</p>
                  <p><span className="font-semibold text-stone-700">Mã User ID:</span> {user.id}</p>
                  <p><span className="font-semibold text-stone-700">Thời gian tạo:</span> {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                
                <div className="border-t border-stone-100 pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Trạng thái hệ thống</h4>
                  {healthStatus ? (
                    <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-ping"></span>
                      API Server Online ({healthStatus.status})
                    </p>
                  ) : (
                    <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                      API Server Offline
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-stone-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-stone-400">
          <p>© 2026 Drobe. Đã kết nối PostgreSQL local (`mycloset`).</p>
        </div>
      </footer>

    </div>
  )
}

export default App
