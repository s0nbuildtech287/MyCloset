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
import loginLogo from './assets/drobe1.png'
import type { ClothingItem } from '../../shared/types'
import { LogOut, PlusCircle, LayoutGrid, Sparkles, Layers, BarChart3, Briefcase, Bell, ChevronDown, Sun, Moon, Globe } from 'lucide-react'




function App() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  // Form states - prefilled for internal testing as requested
  const [email, setEmail] = useState('xu4ns0n@drobe.com')
  const [password, setPassword] = useState('123456')

  
  // App navigation and edit states
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'add_item' | 'outfit_canvas' | 'my_outfits' | 'analytics' | 'travel' | 'profile'>('wardrobe')
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null)
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [healthStatus, setHealthStatus] = useState<any>(null)

  // Header and user dropdown/modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false)
  const [isDarkModeDemo, setIsDarkModeDemo] = useState(false)
  const [langDemo, setLangDemo] = useState<'VI' | 'EN'>('VI')

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    try {
      const res = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setPwdSuccess(res.data.message || 'Mật khẩu đã được thay đổi thành công!');
      setCurrentPassword('');
      new Promise(resolve => setTimeout(resolve, 1500)).then(() => {
        setIsChangePasswordOpen(false);
        setPwdSuccess('');
      });
    } catch (err: any) {
      setPwdError(err.response?.data?.error || 'Không thể đổi mật khẩu');
    }
  };


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

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-clear error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Hash routing listener to synchronize activeTab state with URL hash
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const validTabs = ['wardrobe', 'add_item', 'outfit_canvas', 'my_outfits', 'analytics', 'travel'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash as any);
      } else {
        // Redirect to wardrobe if hash is empty or invalid
        if (!window.location.hash || window.location.hash === '#/') {
          window.location.hash = '#/wardrobe';
        }
      }
    };

    // Initialize or load hash
    if (!window.location.hash || window.location.hash === '#/') {
      window.location.hash = '#/wardrobe';
    } else {
      handleHashChange();
    }

    const handleTabChangeRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab) {
        navigateToTab(customEvent.detail.tab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('change-active-tab', handleTabChangeRequest);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('change-active-tab', handleTabChangeRequest);
    };
  }, [isAuthenticated]);

  // Wrapper function to change tab while updating the URL hash
  const navigateToTab = (tab: string) => {
    window.location.hash = `#/${tab}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    const endpoint = '/auth/login'
    const payload = { email, password }
    
    try {
      const response = await apiClient.post(endpoint, payload)
      const { user, accessToken } = response.data
      setAuth(user, accessToken)
      setSuccess(`Thành công! Chào mừng ${user.name || user.email}`)
      setError('')
    } catch (err: any) {
      const errMsg = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : (err.response?.data?.error?.message || 'Đăng nhập không thành công');
      setError(errMsg);
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout')
      clearAuth()
      setSuccess('Đã đăng xuất thành công')
      setError('')
      // Clear hash on logout to reset route
      window.location.hash = '';
      setEditingItem(null)
    } catch (err: any) {
      setError('Đăng xuất thất bại')
    }
  }

  const handleEditItem = (item: ClothingItem) => {
    setEditingItem(item)
    navigateToTab('add_item')
  };

  const handleFormSuccess = () => {
    setSuccess(editingItem ? 'Cập nhật món đồ thành công' : 'Thêm món đồ thành công');
    setEditingItem(null);
    navigateToTab('wardrobe');
  };

  const handleFormCancel = () => {
    setEditingItem(null);
    navigateToTab('wardrobe');
  };



  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF6F1] via-[#FFFBF9] to-[#F3ECE4] font-sans flex items-center justify-center p-4">
        {/* Floating Success Toast */}
        {success && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-semibold text-xs px-5 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-stone-100/80 animate-in zoom-in-95 duration-200">
          <div className="text-center flex flex-col items-center">
            {/* Logo */}
            <img src={loginLogo} alt="Drobe" className="h-20 w-auto object-contain mb-3 rounded-2xl shadow-xs" />
            <h2 className="text-3xl font-extrabold tracking-tight text-[#2A2521] leading-none" style={{ fontFamily: '"Prata", serif' }}>
              Drobe
            </h2>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.25em] leading-none mt-2">
              My Closet
            </span>
            <p className="mt-4 text-xs text-stone-500 max-w-[280px]">
              Web app quản lý tủ quần áo cá nhân trực quan
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs text-center border border-red-100 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form className="space-y-5 text-left" onSubmit={handleSubmit}>
            <div className="space-y-4">
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
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] text-sm bg-white"
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
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] text-sm bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#C4704F] hover:bg-[#b05f3f] focus:outline-none transition-colors"
              >
                Đăng Nhập
              </button>
            </div>

            <div className="text-center text-[10px] pt-1 text-stone-400 font-medium">
              Hệ thống tủ đồ nội bộ cá nhân
            </div>
          </form>

        </div>
      </div>
    );
  }

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
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => { navigateToTab('wardrobe'); setEditingItem(null); }}>
                  <img src={headerLogo} alt="Drobe" className="h-14 w-auto object-contain rounded-sm" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-[#2A2521] text-2xl tracking-wide leading-none" style={{ fontFamily: '"Prata", serif' }}>
                      Drobe
                    </span>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.25em] leading-none mt-1.5">
                      My Closet
                    </span>
                  </div>
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
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.tab && (item.tab !== 'add_item' || !editingItem);
                  return (
                    <button
                      key={item.tab}
                      onClick={() => { navigateToTab(item.tab); setEditingItem(null); }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[#C4704F]/10 text-[#C4704F] shadow-xs font-extrabold'

                          : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
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

          {/* Mobile Bottom Tabbar Navigation (Visible on screen < lg) */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-stone-150 flex items-center justify-around z-40 px-2 shadow-lg">
            {[
              { tab: 'wardrobe', label: 'Tủ đồ', icon: LayoutGrid },
              { tab: 'outfit_canvas', label: 'Ghép', icon: Sparkles },
              { tab: 'add_item', label: 'Thêm', icon: PlusCircle },
              { tab: 'travel', label: 'Vali', icon: Briefcase },
              { tab: 'analytics', label: 'Báo cáo', icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab && (item.tab !== 'add_item' || !editingItem);
              return (
                <button
                  key={item.tab}
                  onClick={() => { navigateToTab(item.tab); setEditingItem(null); }}
                  className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-bold transition-all ${
                    isActive ? 'text-[#C4704F] font-extrabold' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </button>

              );
            })}
          </nav>
        </>
      ) : null}

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-w-0 ${isAuthenticated && user ? 'pb-20 lg:pb-0 pt-0' : ''}`}>
        
        {/* Unified Top Header for both Desktop and Mobile */}
        {isAuthenticated && user && (
          <header className="sticky top-0 bg-white border-b border-stone-150 h-16 px-6 sm:px-6 flex items-center justify-between z-30 shadow-xs shrink-0 w-full">
            {/* Left section: Tab label on Desktop, logo + closet selector on Mobile */}
            <div className="flex items-center gap-3">
              {/* Mobile view only logo */}
              <div className="lg:hidden flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => { navigateToTab('wardrobe'); setEditingItem(null); }}>
                <img src={headerLogo} alt="Drobe" className="h-11 w-auto object-contain rounded-sm" />
                <div className="flex flex-col text-left hidden min-[375px]:flex">
                  <span className="font-semibold text-[#2A2521] text-lg tracking-wide leading-none" style={{ fontFamily: '"Prata", serif' }}>
                    Drobe
                  </span>
                  <span className="text-[8.5px] font-bold text-stone-400 uppercase tracking-[0.2em] leading-none mt-1">
                    My Closet
                  </span>
                </div>
              </div>




              
              {/* Mobile view only closet selector */}
              <div className="lg:hidden scale-90 origin-left max-w-[160px] overflow-hidden">
                <ClosetSelector />
              </div>

              {/* Desktop view only tab label */}
              <h2 className="hidden lg:block font-bold text-sm text-[#2A2521] uppercase tracking-wider font-serif">
                {activeTab === 'wardrobe' ? 'Tủ đồ của bạn' :
                 activeTab === 'add_item' ? (editingItem ? 'Chỉnh sửa món đồ' : 'Thêm món đồ mới') :
                 activeTab === 'outfit_canvas' ? 'Studio ghép đồ' :
                 activeTab === 'my_outfits' ? 'Bộ phối đồ đã lưu' :
                 activeTab === 'analytics' ? 'Báo cáo thống kê' :
                 activeTab === 'travel' ? 'Xếp đồ du lịch Vali' : 'Hồ sơ cá nhân'}
              </h2>
            </div>

            {/* Right section: Live Server Status dot, Notification bell, FaceBook Profile dropdown */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              
              {/* Server Live Status Dot indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 border border-stone-100 rounded-full" title="Trạng thái máy chủ">
                <span className={`w-1.5 h-1.5 rounded-full ${healthStatus ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} inline-block`}></span>
                <span className="hidden sm:inline-block text-[9px] font-bold text-stone-500 uppercase tracking-wider">Live</span>
              </div>

              {/* Notification icon */}
              <button className="relative p-1.5 text-stone-400 hover:text-[#C4704F] hover:bg-stone-50 rounded-xl transition-all" title="Thông báo">
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#C4704F] rounded-full"></span>
                <Bell className="h-4.5 w-4.5" />
              </button>

              {/* Light/Dark mode placeholder switcher - hidden on xs screens */}
              <button 
                onClick={() => {
                  setIsDarkModeDemo(!isDarkModeDemo);
                  alert(!isDarkModeDemo ? 'Chuyển sang chế độ tối (Demo - Chức năng đang phát triển)' : 'Chuyển sang chế độ sáng (Demo)');
                }} 
                className="hidden sm:flex p-1.5 text-stone-400 hover:text-[#C4704F] hover:bg-stone-50 rounded-xl transition-all" 
                title="Chuyển chế độ sáng/tối"
              >
                {isDarkModeDemo ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              {/* Language switcher placeholder - hidden on xs screens */}
              <button 
                onClick={() => {
                  const nextLang = langDemo === 'VI' ? 'EN' : 'VI';
                  setLangDemo(nextLang);
                  alert(`Đã đổi ngôn ngữ sang: ${nextLang === 'VI' ? 'Tiếng Việt' : 'Tiếng Anh'} (Demo)`);
                }}
                className="hidden sm:flex items-center gap-1 px-2 py-1 text-stone-400 hover:text-[#C4704F] hover:bg-stone-50 rounded-xl transition-all border border-stone-200 text-[10px] font-bold"
                title="Đổi ngôn ngữ"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{langDemo}</span>
              </button>


              {/* Facebook default avatar & User Name Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="flex items-center gap-2 p-1 hover:bg-stone-50 rounded-full transition-all border border-transparent hover:border-stone-100"
                >
                  <img 
                    src="https://www.facebook.com/images/assets_files/yis/r/45x45/default_profile_pic.png" 
                    alt="Facebook Avatar" 
                    className="w-7 h-7 rounded-full border border-stone-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://i.stack.imgur.com/34AD2.jpg";
                    }}
                  />
                  <span className="hidden sm:inline-block text-xs font-bold text-stone-700 max-w-[100px] truncate">
                    {user.name || 'Người dùng'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-stone-400 shrink-0" />
                </button>

                {/* Dropdown Menu Popup */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-stone-150 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-700">{user.name || 'Người dùng'}</p>
                      <p className="text-[10px] text-stone-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    
                    <button 
                      onClick={() => { setIsUserInfoOpen(true); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Thông tin người dùng
                    </button>
                    <button 
                      onClick={() => { setIsUserInfoOpen(true); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Thông tin tài khoản
                    </button>
                    <button 
                      onClick={() => { setIsChangePasswordOpen(true); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Đổi mật khẩu
                    </button>
                    
                    <div className="border-t border-stone-100 my-1"></div>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>

            </div>
          </header>
        )}

        <div className="flex-grow w-full px-6 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Authenticated Pages View */}
          <div className="space-y-6">
            {/* Floating Success Toast */}
            {success && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-semibold text-xs px-5 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
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
          </div>
        </div>


        {/* Modal: Thông tin người dùng & tài khoản */}
        {isAuthenticated && user && isUserInfoOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-stone-100 text-left relative animate-in zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-[#2A2521] font-serif border-b border-stone-100 pb-2">Thông tin tài khoản</h3>
              <div className="space-y-3.5 text-xs text-stone-600 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-bold text-stone-400">Họ và tên:</span>
                  <span className="col-span-2 text-stone-800 font-semibold">{user.name || 'Chưa thiết lập'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-bold text-stone-400">Email:</span>
                  <span className="col-span-2 text-stone-800 font-semibold">{user.email}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-bold text-stone-400">Mã User ID:</span>
                  <span className="col-span-2 text-stone-800 font-mono font-semibold">{user.id}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-bold text-stone-400">Thời gian tạo:</span>
                  <span className="col-span-2 text-stone-800 font-semibold">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-stone-100">
                <button
                  onClick={() => setIsUserInfoOpen(false)}
                  className="px-5 py-2 bg-[#C4704F] hover:bg-[#b05f3f] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Đổi mật khẩu */}
        {isAuthenticated && user && isChangePasswordOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <form
              onSubmit={handleChangePassword}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-stone-100 text-left relative animate-in zoom-in-95 duration-200"
            >
              <h3 className="text-base font-bold text-[#2A2521] font-serif border-b border-stone-100 pb-2">Thay đổi mật khẩu</h3>
              
              {pwdError && <div className="bg-rose-50 text-rose-700 p-2 rounded-xl text-xs text-center border border-rose-100">{pwdError}</div>}
              {pwdSuccess && <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl text-xs text-center border border-emerald-100">{pwdSuccess}</div>}

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { setIsChangePasswordOpen(false); setPwdError(''); setPwdSuccess(''); }}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C4704F] hover:bg-[#b05f3f] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        )}
      </main>


      {/* Floating AI Stylist Chatbot */}
      {isAuthenticated && <AiStylistChat />}

    </div>
  );
}

export default App;
