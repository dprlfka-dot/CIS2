import { ProductData } from './types';

const BASE = '/api';

export async function fetchProducts(): Promise<ProductData[]> {
  const res = await fetch(`${BASE}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function saveDailyData(
  code: string,
  data: { targets?: number[]; arrivals?: number[]; achievements?: number[] }
): Promise<void> {
  const res = await fetch(`${BASE}/products/${encodeURIComponent(code)}/daily`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save');
}

export async function bulkUploadProducts(products: ProductData[]): Promise<void> {
  const res = await fetch(`${BASE}/products/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products),
  });
  if (!res.ok) throw new Error('Failed to upload');
}
