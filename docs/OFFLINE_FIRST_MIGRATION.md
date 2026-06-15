/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Migration Guide: Integrating Offline-First ke Existing Database Adapters
 */

/**
 * STEP 1: Update ProductService untuk pakai offlineDB + Sync
 * 
 * File: src/services/db/ProductService.ts
 * 
 * Sebelum (langsung ke Supabase):
 * ```typescript
 * async getAll() {
 *   const { data } = await supabase.from('products').select('*');
 *   return data || [];
 * }
 * ```
 * 
 * Sesudah (IndexedDB + Sync):
 * ```typescript
 * import { offlineDB } from '@/lib/dexieDb';
 * import { syncService } from '@/services/sync/SyncService';
 * 
 * async getAll() {
 *   try {
 *     // 1. Query dari IndexedDB (always available)
 *     const localData = await offlineDB.products.toArray();
 *     
 *     // 2. Jika online, pull latest dari Supabase (background)
 *     if (navigator.onLine) {
 *       syncService.pullFromSupabase('products').catch(console.error);
 *     }
 *     
 *     // 3. Return local data immediately
 *     return localData;
 *   } catch (error) {
 *     console.error('Error loading products:', error);
 *     return [];
 *   }
 * }
 * ```
 */

/**
 * STEP 2: Update create/update/delete operations
 * 
 * Sebelum:
 * ```typescript
 * async create(product: Product) {
 *   const { data } = await supabase.from('products').insert([product]);
 *   return data?.[0];
 * }
 * ```
 * 
 * Sesudah:
 * ```typescript
 * import { createProduct } from '@/lib/entityBuilders';
 * 
 * async create(productData: any) {
 *   // Gunakan builder untuk auto-generate UUID + sync_status
 *   const product = createProduct(productData);
 *   
 *   // Save ke IndexedDB (synchronous, instant)
 *   await offlineDB.products.put(product);
 *   
 *   // Jika online, sync akan handle otomatis
 *   // Jika offline, data tersimpan lokal dan akan sync nanti
 *   
 *   return product;
 * }
 * ```
 */

/**
 * STEP 3: Implement Pull from Server (untuk fetch latest data)
 * 
 * async pullLatest() {
 *   if (!navigator.onLine) {
 *     console.warn('Offline, cannot pull latest');
 *     return;
 *   }
 *   
 *   try {
 *     await syncService.pullFromSupabase('products');
 *     console.log('✅ Synced latest products from server');
 *   } catch (error) {
 *     console.error('Error pulling latest:', error);
 *   }
 * }
 */

/**
 * STEP 4: Database Adapter Pattern
 * 
 * Buat wrapper adapter yang bisa switch antara:
 * - OfflineFirstAdapter (IndexedDB + Sync)
 * - DirectSupabaseAdapter (direct ke server, untuk testing)
 */

import { offlineDB, Product } from '@/lib/dexieDb';
import { syncService } from '@/services/sync/SyncService';
import { createProduct, updateEntity } from '@/lib/entityBuilders';

/**
 * Interface untuk database operations
 */
export interface IDatabaseAdapter {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | undefined>;
  create(data: Omit<Product, 'id' | 'sync_status' | 'updated_at' | 'created_at'>): Promise<Product>;
  update(id: string, data: Partial<Product>): Promise<Product | undefined>;
  delete(id: string): Promise<void>;
}

/**
 * OfflineFirst Adapter - IndexedDB + Supabase Sync
 * 
 * REKOMENDASI: Gunakan adapter ini untuk production
 */
export class OfflineFirstAdapter implements IDatabaseAdapter {
  async getAll(): Promise<Product[]> {
    try {
      // Query dari IndexedDB (instant, offline-safe)
      const localData = await offlineDB.products.toArray();

      // Background pull dari Supabase jika online
      if (navigator.onLine) {
        syncService.pullFromSupabase('products').catch(console.error);
      }

      return localData;
    } catch (error) {
      console.error('OfflineFirstAdapter.getAll error:', error);
      return [];
    }
  }

  async getById(id: string): Promise<Product | undefined> {
    return offlineDB.products.get(id);
  }

  async create(data: Omit<Product, 'id' | 'sync_status' | 'updated_at' | 'created_at'>): Promise<Product> {
    // Generate UUID + metadata
    const product = createProduct(data);

    // Save ke IndexedDB
    await offlineDB.products.put(product);

    // Auto-sync jika online
    if (navigator.onLine) {
      syncService.syncTableOnly('products').catch(console.error);
    }

    return product;
  }

  async update(id: string, data: Partial<Product>): Promise<Product | undefined> {
    const existing = await offlineDB.products.get(id);
    if (!existing) return undefined;

    const updated = updateEntity(existing, data);
    await offlineDB.products.put(updated);

    // Auto-sync jika online
    if (navigator.onLine) {
      syncService.syncTableOnly('products').catch(console.error);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const product = await offlineDB.products.get(id);
    if (!product) return;

    // Soft delete
    await offlineDB.products.put({
      ...product,
      sync_status: 'deleted' as any,
      updated_at: Date.now(),
    });

    // Auto-sync jika online
    if (navigator.onLine) {
      syncService.syncTableOnly('products').catch(console.error);
    }
  }
}

/**
 * STEP 5: Usage di Components
 * 
 * // Initialize adapter
 * const dbAdapter = new OfflineFirstAdapter();
 * 
 * // Use seperti biasa
 * const products = await dbAdapter.getAll();
 * const newProduct = await dbAdapter.create({
 *   sku: 'NEW-001',
 *   name: 'New Product',
 *   // ... other fields
 * });
 * 
 * await dbAdapter.update(newProduct.id, { stock: 50 });
 * await dbAdapter.delete(newProduct.id);
 */

/**
 * STEP 6: React Hook untuk Database Adapter
 * 
 * import { useState, useEffect, useCallback } from 'react';
 * 
 * export function useProductsOfflineFirst() {
 *   const [products, setProducts] = useState<Product[]>([]);
 *   const [loading, setLoading] = useState(true);
 *   const adapter = new OfflineFirstAdapter();
 *   
 *   const loadProducts = useCallback(async () => {
 *     setLoading(true);
 *     const data = await adapter.getAll();
 *     setProducts(data);
 *     setLoading(false);
 *   }, []);
 *   
 *   useEffect(() => {
 *     loadProducts();
 *   }, [loadProducts]);
 *   
 *   return {
 *     products,
 *     loading,
 *     createProduct: adapter.create,
 *     updateProduct: adapter.update,
 *     deleteProduct: adapter.delete,
 *     refresh: loadProducts,
 *   };
 * }
 */

/**
 * STEP 7: Migration Checklist
 * 
 * ☐ Install dexie (npm install dexie) ✅
 * 
 * ☐ Copy files:
 *   - src/lib/dexieDb.ts
 *   - src/lib/uuidGenerator.ts
 *   - src/lib/entityBuilders.ts
 *   - src/services/sync/OfflineDetector.ts
 *   - src/services/sync/SyncService.ts
 *   - src/hooks/useOfflineFirst.ts
 * 
 * ☐ Update existing database adapters:
 *   - src/services/db/ProductService.ts
 *   - src/services/db/CustomerService.ts
 *   - src/services/db/TransactionService.ts
 *   - dll
 * 
 * ☐ Update components untuk pakai new hooks:
 *   - import { useOfflineFirst } from '@/hooks/useOfflineFirst'
 *   - Display online/offline status
 *   - Display pending items
 *   - Add manual sync button
 * 
 * ☐ Test offline mode:
 *   - DevTools > Network > Offline
 *   - Verify data tersimpan lokal
 *   - Turn online kembali
 *   - Verify auto-sync bekerja
 * 
 * ☐ Test edge cases:
 *   - Create product offline
 *   - Update product offline
 *   - Delete product offline
 *   - Go online → verify sync
 *   - Network flaky → verify retry logic
 * 
 * ☐ Setup monitoring:
 *   - Log sync events
 *   - Alert user tentang pending items
 *   - Error handling & retry logic
 * 
 * ☐ Documentation:
 *   - Update README tentang offline-first
 *   - Dokumentasi untuk developers
 *   - API docs untuk database adapter
 */

/**
 * STEP 8: Environment Setup
 * 
 * .env harus punya:
 * VITE_SUPABASE_URL=https://xxx.supabase.co
 * VITE_SUPABASE_ANON_KEY=xxx
 * 
 * Existing Supabase tables harus punya fields:
 * - id (UUID, primary key)
 * - sync_status (VARCHAR)
 * - updated_at (TIMESTAMP)
 * - created_at (TIMESTAMP)
 * - synced_at (TIMESTAMP)
 */

/**
 * STEP 9: Backup & Recovery
 * 
 * // Manual backup lokal data ke file
 * export async function backupLocalData() {
 *   const stats = await offlineDB.getSyncStats();
 *   const backup = {
 *     timestamp: new Date().toISOString(),
 *     stats,
 *     products: await offlineDB.products.toArray(),
 *     customers: await offlineDB.customers.toArray(),
 *     transactions: await offlineDB.transactions.toArray(),
 *   };
 *   
 *   const json = JSON.stringify(backup, null, 2);
 *   const blob = new Blob([json], { type: 'application/json' });
 *   const url = URL.createObjectURL(blob);
 *   const a = document.createElement('a');
 *   a.href = url;
 *   a.download = `backup-${Date.now()}.json`;
 *   a.click();
 * }
 * 
 * // Manual restore
 * export async function restoreLocalData(file: File) {
 *   const text = await file.text();
 *   const backup = JSON.parse(text);
 *   
 *   // Restore setiap table
 *   for (const product of backup.products) {
 *     await offlineDB.products.put(product);
 *   }
 *   // ... repeat untuk table lain
 *   
 *   console.log('✅ Restore completed');
 * }
 */

export default {
  OfflineFirstAdapter,
};
