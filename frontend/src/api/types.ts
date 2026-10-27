export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId?: string | null;
  halfPrice: number | null;
  fullPrice: number;
  available: boolean;
  displayOrder: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  items: MenuItem[];
}

export interface CafeMenu {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  currencyCode: string;
  categories: MenuCategory[];
}
