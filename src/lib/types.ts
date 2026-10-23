export type Product = {
  id: number;
  sku: string | null;
  item: string;
  gramasi: string | null;
  supplier: string | null;
  pcs_per_karton: number | null;
  harga_beli: number | null;
  harga_jual: number | null;
  stok_toko: number;
  stok_gudang: number;
  stok_min: number | null;
  expired_terdekat: string | null;
  aktif: boolean;
  subsidi: boolean;
  foto_url?: string | null;
};

export type ProductOpt = {
  id: number;
  item: string;
  sku?: string | null;
  gramasi?: string | null;
  harga_jual?: number | null;
  stok_toko?: number;
  subsidi?: boolean;
  foto_url?: string | null;
};
