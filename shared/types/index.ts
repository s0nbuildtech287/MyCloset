export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ClothingItem {
  id: string;
  userId: string;
  name: string;
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
  color: string | null;
  brand: string | null;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'all' | null;
  tags: string[];
  originalImageUrl: string;
  processedImageUrl: string | null;
  processingStatus: 'pending' | 'processing' | 'done' | 'failed';
  purchaseUrl: string | null;
  price: number | null;
  purchasedAt: string | null;
  isFavorite: boolean;
  condition: 'new' | 'good' | 'old' | 'damaged';
  notes: string | null;
  closetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Outfit {
  id: string;
  userId: string;
  name: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  items?: OutfitItem[];
}

export interface OutfitItem {
  id: string;
  outfitId: string;
  clothingItemId: string;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  zIndex: number;
  clothingItem?: ClothingItem;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Closet {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface TravelTrip {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  destination: string;
  createdAt: string;
  items?: TripItem[];
}

export interface TripItem {
  id: string;
  tripId: string;
  clothingItemId: string;
  packed: boolean;
  clothingItem?: ClothingItem;
}
