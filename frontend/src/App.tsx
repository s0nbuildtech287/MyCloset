import { useState, useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { apiClient } from './api/client'
import WardrobeGrid from './components/wardrobe/WardrobeGrid'
import ItemForm from './components/wardrobe/ItemForm'
import OutfitCanvas from './components/outfit/OutfitCanvas'
import MyOutfits from './components/outfit/MyOutfits'
import AnalyticsDashboard from './components/wardrobe/AnalyticsDashboard'
import AiStylistChat from './components/chat/AiStylistChat'
import ClosetSelector from './components/wardrobe/ClosetSelector'
import TravelTab from './components/travel/TravelTab'
import headerLogo from './assets/drobe1_cropped.png'
import type { ClothingItem } from '../../shared/types'
import { LogOut, User as UserIcon, PlusCircle, LayoutGrid, Sparkles, Layers, BarChart3, Briefcase } from 'lucide-react'

function App() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const [isLoginMode, setIsLoginMode] = useState(true)
  
  // Form states - prefilled for internal testing as requested
  const [email, setEmail] = useState('xu4ns0n@drobe.com')
  const [password, setPassword] = useState('123456')
  const [name, setName] = useState('')
  
  // App navigation and edit states
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'add_item' | 'outfit_canvas' | 'my_outfits' | 'analytics' | 'travel' | 'profile'>('wardrobe')
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
    <div className="min-h-screen bg-[#FAF6F1] font-sans flex flex-col lg:flex-row">
      
      {/* Navbar & Sidebar layout if logged in */}
      {isAuthenticated && user ? (
        <>
          {/* Desktop Left Sidebar (Visible only on lg and larger) */}
          <aside className="hidden lg:flex w-64 bg-white border-r border-stone-150 h-screen sticky top-0 flex-col justify-between shrink-0 z-30 shadow-xs">
            <div className="flex flex-col gap-6">
              {/* Logo section */}
              <div className="p-6 pb-2">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('wardrobe'); setEditingItem(null); }}>
                  <img src={headerLogo} alt="Drobe" className="h-10 w-auto object-contain rounded-xl shadow-xs" />
                </div>
              </div>

              {/* Closet Selector inside Sidebar */}
              <div className="px-6">
                <ClosetSelector />
              </div>

              {/* Vertical Navigation menu */}
              <nav className="px-4 space-y-1">
                {[
                  { tab: 'wardrobe', label: 'Tủ đồ', icon: LayoutGrid },
                  { tab: 'add_item', label: 'Thêm đồ', icon: PlusCircle },
                  { tab: 'outfit_canvas', label: 'Ghép đồ', icon: Sparkles },
                  { tab: 'my_outfits', label: 'Bộ phối', icon: Layers },
                  { tab: 'analytics', label: 'Thống kê', icon: BarChart3 },
                  { tab: 'travel', label: 'Xếp Vali', icon: Briefcase },
                  { tab: 'profile', label: 'Hồ sơ', icon: UserIcon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.tab && (item.tab !== 'add_item' || !editingItem);
                  return (
                    <button
                      key={item.tab}
                      onClick={() => { setActiveTab(item.tab as any); setEditingItem(null); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#C4704F]/10 text-[#C4704F] shadow-xs'
                          : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Profile info & Logout at bottom of Sidebar */}
            <div className="p-4 border-t border-stone-100 space-y-3">
              <div className="flex items-center gap-3 px-2">
                <span className="w-8 h-8 rounded-full bg-[#C4704F]/10 text-[#C4704F] flex items-center justify-center font-bold text-xs shrink-0">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-stone-700 truncate leading-none">{user.name || 'Người dùng'}</p>
                  <p className="text-[10px] text-stone-400 truncate mt-1">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>

          {/* Mobile Top Header (Visible on screen < lg) */}
          <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-100 px-4 flex items-center justify-between z-40 shadow-xs">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('wardrobe'); setEditingItem(null); }}>
              <img src={headerLogo} alt="Drobe" className="h-10 w-auto object-contain rounded-lg" />
            </div>
            <ClosetSelector />
          </header>

          {/* Mobile Bottom Tabbar Navigation (Visible on screen < lg) */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-stone-150 flex items-center justify-around z-40 px-2 shadow-lg">
            {[
              { tab: 'wardrobe', label: 'Tủ đồ', icon: LayoutGrid },
              { tab: 'outfit_canvas', label: 'Ghép', icon: Sparkles },
              { tab: 'add_item', label: 'Thêm', icon: PlusCircle },
              { tab: 'travel', label: 'Vali', icon: Briefcase },
              { tab: 'profile', label: 'Hồ sơ', icon: UserIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab && (item.tab !== 'add_item' || !editingItem);
              return (
                <button
                  key={item.tab}
                  onClick={() => { setActiveTab(item.tab as any); setEditingItem(null); }}
                  className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-bold transition-all ${
                    isActive ? 'text-[#C4704F]' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      ) : null}

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-w-0 ${isAuthenticated && user ? 'pt-16 pb-20 lg:pt-0 lg:pb-0' : ''}`}>
        <div className="flex-grow w-full px-4 sm:px-6 lg:px-8 py-8">
        
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

            {activeTab === 'outfit_canvas' && (
              <OutfitCanvas />
            )}

            {activeTab === 'my_outfits' && (
              <MyOutfits />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard />
            )}

            {activeTab === 'travel' && (
              <TravelTab />
            )}

            {activeTab === 'profile' && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-[#2A2521] border-b border-stone-100 pb-2 font-serif">Thông tin tài khoản</h3>
                  <div className="space-y-2 text-sm text-stone-600 text-left">
                    <p><span className="font-semibold text-stone-700">Tên hiển thị:</span> {user.name || 'Chưa thiết lập'}</p>
                    <p><span className="font-semibold text-stone-700">Email:</span> {user.email}</p>
                    <p><span className="font-semibold text-stone-700">Mã User ID:</span> {user.id}</p>
                    <p><span className="font-semibold text-stone-700">Thời gian tạo:</span> {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  
                  <div className="border-t border-stone-100 pt-4 space-y-2 text-left">
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

                {/* Mobile/Tablet Extra Shortcuts */}
                <div className="lg:hidden bg-white border border-stone-100 rounded-2xl p-4 shadow-sm space-y-2 text-left">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider px-2 mb-2">Tiện ích khác</h4>
                  <button
                    onClick={() => setActiveTab('my_outfits')}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors"
                  >
                    <span className="flex items-center gap-2"><Layers className="h-4 w-4 text-[#C4704F]" /> Bộ phối đã lưu</span>
                    <span className="text-stone-300">➔</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors"
                  >
                    <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#8A9A5B]" /> Thống kê & Báo cáo</span>
                    <span className="text-stone-300">➔</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50/50 text-xs font-bold text-red-600 transition-colors border-t border-stone-50 mt-2 pt-4"
                  >
                    <span className="flex items-center gap-2"><LogOut className="h-4 w-4" /> Đăng xuất tài khoản</span>
                    <span className="text-stone-300">➔</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      {/* Floating AI Stylist Chatbot */}
      {isAuthenticated && <AiStylistChat />}

    </div>
  );
}

export default App;
