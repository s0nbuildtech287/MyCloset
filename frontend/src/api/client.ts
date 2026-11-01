import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const appsScriptUrl = String(import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
const useAppsScript = Boolean(appsScriptUrl);

const backendClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

backendClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const token = () => useAuthStore.getState().accessToken || localStorage.getItem('drobe_access_token') || '';

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function normalizeBody(data: any) {
  if (!(data instanceof FormData)) return data || {};
  const body: Record<string, any> = {};
  const entries: Array<[string, FormDataEntryValue]> = [];
  data.forEach((value: FormDataEntryValue, key: string) => entries.push([key, value]));
  for (const [key, value] of entries) {
    if (value instanceof File) {
      body.imageData = await fileToDataUrl(value);
      body.imageName = value.name;
    } else {
      body[key] = value;
    }
  }
  if (typeof body.tags === 'string') {
    try { body.tags = JSON.parse(body.tags); } catch { /* keep string */ }
  }
  return body;
}

function routeAction(method: string, url: string) {
  const path = url.split('?')[0].replace(/^\//, '');
  const parts = path.split('/');
  const id = parts[1];
  if (path === 'health') return 'health';
  if (path === 'auth/login') return 'login';
  if (path === 'auth/register') return 'register';
  if (path === 'auth/refresh') return 'refresh';
  if (path === 'auth/logout') return 'logout';
  if (path === 'auth/change-password') return 'change_password';
  if (path === 'closets' && method === 'GET') return 'closets_list';
  if (path === 'closets' && method === 'POST') return 'closet_create';
  if (parts[0] === 'closets' && method === 'DELETE') return 'closet_delete';
  if (path === 'items' && method === 'GET') return 'items_list';
  if (path === 'items' && method === 'POST') return 'item_create';
  if (path === 'items/stats') return 'items_stats';
  if (path === 'items/weather-suggestions') return 'weather';
  if (path === 'items/analyze-image') return 'analyze';
  if (path === 'items/rembg') return 'rembg';
  if (parts[0] === 'items' && id && method === 'PATCH') return 'item_update';
  if (parts[0] === 'items' && id && method === 'DELETE') return 'item_delete';
  if (path === 'outfits' && method === 'GET') return 'outfits_list';
  if (path === 'outfits' && method === 'POST') return 'outfit_create';
  if (parts[0] === 'outfits' && method === 'DELETE') return 'outfit_delete';
  if (path === 'diary' && method === 'GET') return 'diary_list';
  if (path === 'diary' && method === 'POST') return 'diary_upsert';
  if (parts[0] === 'diary' && method === 'DELETE') return 'diary_delete';
  if (path === 'trips' && method === 'GET') return 'trips_list';
  if (path === 'trips' && method === 'POST') return 'trip_create';
  if (parts[0] === 'trips' && parts[1] === 'items' && method === 'POST') return 'trip_item_add';
  if (parts[0] === 'trips' && parts[1] === 'items' && parts[3] === 'toggle-packed') return 'trip_item_toggle';
  if (parts[0] === 'trips' && parts[1] === 'items' && method === 'DELETE') return 'trip_item_delete';
  if (parts[0] === 'trips' && method === 'DELETE') return 'trip_delete';
  if (path === 'ai/chat') return 'ai_chat';
  throw new Error(`Unsupported Apps Script route: ${method} ${url}`);
}

const demoItems = [
  { id: 'demo-shirt', userId: 'demo-user', name: 'Áo sơ mi linen', category: 'top', color: 'Kem', brand: 'Drobe Studio', season: 'summer', tags: ['linen', 'daily'], originalImageUrl: 'https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?w=700', processedImageUrl: null, processingStatus: 'done', price: 420000, isFavorite: true, condition: 'good', notes: 'Món đồ nhẹ và dễ phối.', closetId: 'demo-closet', createdAt: '2026-06-01T08:00:00.000Z', updatedAt: '2026-06-01T08:00:00.000Z' },
  { id: 'demo-pants', userId: 'demo-user', name: 'Quần kaki dáng rộng', category: 'bottom', color: 'Nâu nhạt', brand: 'Everyday', season: 'all', tags: ['minimal', 'smart casual'], originalImageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=700', processedImageUrl: null, processingStatus: 'done', price: 590000, isFavorite: false, condition: 'new', notes: null, closetId: 'demo-closet', createdAt: '2026-06-02T08:00:00.000Z', updatedAt: '2026-06-02T08:00:00.000Z' },
  { id: 'demo-shoes', userId: 'demo-user', name: 'Sneaker trắng', category: 'shoes', color: 'Trắng', brand: 'Classic', season: 'all', tags: ['essential'], originalImageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700', processedImageUrl: null, processingStatus: 'done', price: 890000, isFavorite: true, condition: 'good', notes: null, closetId: 'demo-closet', createdAt: '2026-06-03T08:00:00.000Z', updatedAt: '2026-06-03T08:00:00.000Z' },
];

async function demoRequest(method: string, url: string, data?: any) {
  const action = routeAction(method, url);
  if (action === 'refresh') return { data: { accessToken: 'mock-access-token', user: { id: 'demo-user', email: 'demo@drobe.local', name: 'Khách khám phá', avatarUrl: null, createdAt: new Date().toISOString() } } };
  if (action === 'logout' || action === 'health') return { data: action === 'health' ? { status: 'ok', mode: 'demo' } : { success: true } };
  if (method !== 'GET' && !['items_stats', 'weather'].includes(action)) {
    const error: any = new Error('Đăng nhập để sử dụng chức năng này.');
    error.response = { status: 401, data: { error: 'Đăng nhập để sử dụng chức năng này.' } };
    throw error;
  }
  if (action === 'closets_list') return { data: [{ id: 'demo-closet', userId: 'demo-user', name: 'Tủ đồ mẫu', isDefault: true, createdAt: new Date().toISOString() }] };
  if (action === 'items_list') return { data: { items: demoItems, pagination: { total: demoItems.length, page: 1, limit: 100, totalPages: 1 } } };
  if (action === 'items_stats') return { data: { totalItems: 3, favoritesCount: 2, totalOutfits: 2, totalValue: 1910000, averagePrice: 636666, byCategory: { top: 1, bottom: 1, shoes: 1, accessory: 0, outerwear: 0 }, byCategoryValue: { top: 420000, bottom: 590000, shoes: 890000, accessory: 0, outerwear: 0 }, colorDistribution: [{ color: 'Kem', count: 1 }, { color: 'Nâu nhạt', count: 1 }, { color: 'Trắng', count: 1 }] } };
  if (action === 'outfits_list') return { data: [{ id: 'demo-outfit', userId: 'demo-user', name: 'Neutral Weekend', thumbnailUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900', createdAt: new Date().toISOString(), items: [{ id: 'demo-outfit-item-1', clothingItemId: 'demo-shirt', positionX: 120, positionY: 80, scale: 1, rotation: 0, zIndex: 1, clothingItem: demoItems[0] }, { id: 'demo-outfit-item-2', clothingItemId: 'demo-pants', positionX: 190, positionY: 180, scale: 1, rotation: 0, zIndex: 2, clothingItem: demoItems[1] }] }] };
  if (action === 'diary_list') return { data: [] };
  if (action === 'trips_list') return { data: [{ id: 'demo-trip', userId: 'demo-user', name: 'Đà Lạt cuối tuần', startDate: '2026-07-10', endDate: '2026-07-12', destination: 'Đà Lạt', createdAt: new Date().toISOString(), items: [] }] };
  if (action === 'weather') return { data: { weather: { temperature: 27, condition: 'clear', description: 'Một ngày đẹp trời' }, recommendation: 'Linen, kaki và sneaker sẽ là lựa chọn nhẹ nhàng.', suggestedItems: demoItems, suggestedOutfits: [] } };
  if (action === 'analyze') return { data: { name: 'Món đồ mẫu', category: 'top', color: 'Neutral', brand: '', season: 'all', tags: ['demo'], condition: 'good' } };
  if (action === 'rembg') return { data: { imageBase64: data?.imageBase64 || '' } };
  if (action === 'ai_chat') return { data: { message: 'Với tủ đồ mẫu này, bạn có thể bắt đầu bằng sơ mi linen + quần kaki + sneaker trắng.' } };
  return { data: [] };
}

async function appsRequest(method: string, url: string, data?: any, config: any = {}) {
  if (token() === 'mock-access-token') return demoRequest(method, url, data);
  const action = routeAction(method, url);
  const body = await normalizeBody(data);
  const parsed = new URL(url, 'http://localhost');
  const urlParams: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => { urlParams[key] = value; });
  const params = { ...(config.params || {}), ...urlParams };
  const payload: any = { action, token: token(), ...body };
  if (action === 'item_update') { payload.id = parsed.pathname.split('/').pop(); payload.data = body; }
  if (action === 'item_delete' || action === 'outfit_delete' || action === 'diary_delete' || action === 'trip_delete' || action === 'trip_item_delete' || action === 'closet_delete') payload.id = parsed.pathname.split('/').pop();
  if (action === 'trip_item_toggle') payload.id = parsed.pathname.split('/')[2];
  if (action === 'items_list') Object.assign(payload, params);
  if (action === 'health') return { data: { status: 'ok', mode: 'apps-script' } };

  const query = new URLSearchParams();
  Object.keys({ ...payload, ...(action === 'items_list' ? params : {}) }).forEach((key) => query.set(key, String(({ ...payload, ...(action === 'items_list' ? params : {}) } as any)[key])));
  const requestUrl = method === 'GET' ? `${appsScriptUrl}${appsScriptUrl.includes('?') ? '&' : '?'}${query.toString()}` : appsScriptUrl;
  const response = await fetch(requestUrl, { method: method === 'GET' ? 'GET' : 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: method === 'GET' ? undefined : JSON.stringify(payload) });
  const json = await response.json();
  if (!response.ok || json.success === false) {
    const error: any = new Error(json.error || 'Apps Script request failed');
    error.response = { status: response.status || 500, data: { error: json.error || 'Request failed' } };
    throw error;
  }
  return { data: json.data };
}

export const apiClient: any = useAppsScript
  ? { get: (url: string, config?: any) => appsRequest('GET', url, undefined, config), post: (url: string, data?: any, config?: any) => appsRequest('POST', url, data, config), patch: (url: string, data?: any, config?: any) => appsRequest('PATCH', url, data, config), delete: (url: string, config?: any) => appsRequest('DELETE', url, undefined, config) }
  : backendClient;
