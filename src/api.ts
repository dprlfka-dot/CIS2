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

export interface SnapshotMeta {
  id: number;
  label: string;
  created_at: string;
}

export interface SnapshotDetail extends SnapshotMeta {
  data: ProductData[];
}

export async function createSnapshot(label?: string): Promise<void> {
  const res = await fetch(`${BASE}/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error('Failed to create snapshot');
}

export async function fetchSnapshots(): Promise<SnapshotMeta[]> {
  const res = await fetch(`${BASE}/snapshots`);
  if (!res.ok) throw new Error('Failed to fetch snapshots');
  return res.json();
}

export async function fetchSnapshotDetail(id: number): Promise<SnapshotDetail> {
  const res = await fetch(`${BASE}/snapshots/${id}`);
  if (!res.ok) throw new Error('Failed to fetch snapshot');
  return res.json();
}

export async function deleteSnapshot(id: number): Promise<void> {
  const res = await fetch(`${BASE}/snapshots/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete snapshot');
}
