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
  notes: string | null;
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
