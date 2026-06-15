# Sistem Offline-First dengan IndexedDB & Supabase

Dokumentasi lengkap untuk implementasi offline-first architecture dengan Dexie.js, UUID, dan Supabase sync.

## 📋 Table of Contents

1. [Konsep Dasar](#konsep-dasar)
2. [Struktur File](#struktur-file)
3. [Implementasi](#implementasi)
4. [Penggunaan](#penggunaan)
5. [Troubleshooting](#troubleshooting)

---

## 📌 Konsep Dasar

### Offline-First Architecture

Aplikasi bekerja **100% offline** dengan IndexedDB sebagai database lokal, dan secara otomatis mensinkronisasi ke Supabase ketika online.

```
┌─────────────────────────────────────────────────────────┐
│                   React Application                      │
│                                                           │
│  ┌──────────────────┐              ┌──────────────────┐  │
│  │  UI Components   │◄────────────►│ Dexie IndexedDB  │  │
│  │  (React)         │              │  (Local DB)      │  │
│  └──────────────────┘              └──────────────────┘  │
│                                            ▲              │
│         ┌─────────────────────────────────┼──────┐        │
│         │                                 │      │        │
│         ▼                                 ▼      │        │
│  ┌──────────────────┐          ┌──────────────────┐       │
│  │ Offline Detector │          │ Sync Service     │       │
│  │ (Online Check)   │          │ (UUID + UPS.)    │       │
│  └──────────────────┘          └──────────────────┘       │
│         │                              │                  │
└─────────┼──────────────────────────────┼──────────────────┘
          │                              │
          │ (Ketika Online)              │
          └──────────────────────────────┤
                                         ▼
                           ┌──────────────────────────┐
                           │  Supabase PostgreSQL     │
                           │  (Cloud Database)        │
                           └──────────────────────────┘
```

### Key Features

✅ **UUID sebagai Primary Key**
- Semua data lokal menggunakan UUID v4 (random)
- Tidak ada conflict dengan server-generated IDs
- Format: `550e8400-e29b-41d4-a716-446655440000`

✅ **Sync Status Tracking**
- `'synced'` - Data sudah tersimpan di Supabase
- `'created'` - Data baru, belum disinkronisasi
- `'updated'` - Data sudah ada, telah diupdate, belum disinkronisasi
- `'deleted'` - Soft delete, menunggu sinkronisasi

✅ **Automatic Sync**
- Deteksi koneksi internet otomatis
- Sync setiap 30 detik saat online
- Fallback periodic check untuk browser lama

✅ **Upsert Logic**
- `INSERT` jika ID tidak ada di Supabase
- `UPDATE` jika ID sudah ada
- Semua operasi pakai `.upsert()` dengan `onConflict: 'id'`

---

## 📁 Struktur File

```
src/
├── lib/
│   ├── dexieDb.ts              # Database schema & Dexie setup
│   ├── uuidGenerator.ts        # UUID utilities
│   ├── entityBuilders.ts       # Factory functions untuk create entity
│   └── supabaseClient.ts       # Existing Supabase client
│
├── services/
│   └── sync/
│       ├── OfflineDetector.ts  # Online/offline detection
│       └── SyncService.ts      # Main sync engine
│
├── hooks/
│   └── useOfflineFirst.ts      # React hooks untuk offline-first
│
└── pages/
    └── [pages]                 # Existing pages
```

---

## 💻 Implementasi

### 1. Setup Database (Dexie)

File: `src/lib/dexieDb.ts`

Database sudah ter-setup dengan:
- 6 tables utama: products, customers, suppliers, transactions, restocks, returs
- Indexed fields: `id`, `sync_status`, `updated_at`, dan field-field relasi
- Helper methods: `getPendingSyncData()`, `markAsSynced()`, dll

```typescript
// Mengakses database
import { offlineDB } from '@/lib/dexieDb';

// Query products yang belum sync
const pending = await offlineDB.getPendingSyncData('products');

// Update single item ke 'synced'
await offlineDB.markAsSynced('products', 'uuid-123');

// Get sync statistics
const stats = await offlineDB.getSyncStats();
// Output: { products: 5, customers: 2, suppliers: 0, transactions: 10, total: 17 }
```

### 2. Generate UUID

File: `src/lib/uuidGenerator.ts`

```typescript
import { generateUUID, generatePrefixedUUID, isValidUUID } from '@/lib/uuidGenerator';

// Random UUID v4
const id = generateUUID();
// Output: "550e8400-e29b-41d4-a716-446655440000"

// Validate UUID
isValidUUID(id); // true

// Prefixed UUID (contoh untuk prefix based routing)
const prefixedId = generatePrefixedUUID('user');
// Output: "user_550e8400-e29b-41d4-a716-446655440000"
```

### 3. Create Entity dengan Builder

File: `src/lib/entityBuilders.ts`

Factory functions otomatis menambahkan `id`, `sync_status`, `updated_at`, `created_at`:

```typescript
import { createProduct, createCustomer, updateEntity } from '@/lib/entityBuilders';
import { offlineDB } from '@/lib/dexieDb';

// Create product baru
const newProduct = createProduct({
  sku: 'PROD-001',
  name: 'Product A',
  category: 'Electronics',
  priceRetail: 150000,
  priceWholesale: 120000,
  priceCost: 100000,
  stock: 50,
});

// Result:
// {
//   id: "550e8400-e29b-41d4-a716-446655440000",
//   sync_status: "created",
//   updated_at: 1686123456789,
//   created_at: 1686123456789,
//   sku: "PROD-001",
//   name: "Product A",
//   ...
// }

// Save ke IndexedDB
await offlineDB.products.put(newProduct);

// Update product
const updated = updateEntity(newProduct, {
  stock: 45,
  priceRetail: 160000,
});
// sync_status berubah menjadi 'updated' jika sebelumnya 'synced'

await offlineDB.products.put(updated);
```

### 4. Offline Detection

File: `src/services/sync/OfflineDetector.ts`

```typescript
import { offlineDetector } from '@/services/sync/OfflineDetector';

// Check current status
const isOnline = offlineDetector.getStatus(); // true/false

// Subscribe ke perubahan status
const unsubscribe = offlineDetector.subscribe((isOnline) => {
  console.log('Online status:', isOnline);
  // Event akan trigger ketika device online/offline
});

// Cleanup
unsubscribe();

// Manual check
await offlineDetector.checkNow(); // true/false
```

### 5. Sync Service

File: `src/services/sync/SyncService.ts`

**Otomatis:**
- Mendeteksi online → mulai sync tiap 30 detik
- Mendeteksi offline → stop sync
- Query pending data dari IndexedDB
- Upsert ke Supabase
- Update status ke 'synced'

**Manual:**

```typescript
import { syncService } from '@/services/sync/SyncService';

// Manual trigger sync sekarang
const results = await syncService.syncNow();
// Output:
// [
//   { table: 'products', total: 5, successful: 5, failed: 0, errors: [] },
//   { table: 'customers', total: 2, successful: 2, failed: 0, errors: [] },
//   ...
// ]

// Sync specific table saja
const result = await syncService.syncTableOnly('products');

// Subscribe ke sync updates
const unsubscribe = syncService.subscribe((stats) => {
  console.log('Sync status:', {
    isOnline: stats.isOnline,
    isSyncing: stats.isSyncing,
    pendingItems: stats.pendingItems,
    lastSyncTime: stats.lastSyncTime,
  });
});

// Get current stats
const stats = await syncService.getSyncStats();
```

---

## 🎯 Penggunaan dalam Components

### React Hook: `useOfflineFirst()`

```typescript
import { useOfflineFirst, useSyncNow } from '@/hooks/useOfflineFirst';

function MyComponent() {
  const { isOnline, isSyncing, pendingItems, lastSyncTime } = useOfflineFirst();
  const { syncNow, isSyncing: manualSyncing } = useSyncNow();

  return (
    <div>
      <p>Status: {isOnline ? '🟢 Online' : '🔴 Offline'}</p>
      <p>Pending items: {pendingItems}</p>
      <p>Syncing: {isSyncing ? '🔄' : '✓'}</p>
      
      {lastSyncTime && (
        <p>Last sync: {new Date(lastSyncTime).toLocaleString()}</p>
      )}
      
      <button onClick={syncNow} disabled={!isOnline || manualSyncing}>
        {manualSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
```

### Hook: `useOnlineStatus()`

```typescript
function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-4">
      ⚠️ You are offline. Changes will sync when you're back online.
    </div>
  );
}
```

### Hook: `usePendingItems()`

```typescript
function SyncIndicator() {
  const pendingItems = usePendingItems();

  return (
    <div className="badge">
      {pendingItems > 0 && `${pendingItems} pending`}
    </div>
  );
}
```

---

## 📝 Contoh: Workflow Lengkap

### 1. Create Product (Offline)

```typescript
import { createProduct, createProductsBatch } from '@/lib/entityBuilders';
import { offlineDB } from '@/lib/dexieDb';

// Single product
const product = createProduct({
  sku: 'LAPTOP-001',
  name: 'MacBook Pro',
  category: 'Electronics',
  priceRetail: 30000000,
  priceWholesale: 25000000,
  priceCost: 22000000,
  stock: 10,
});

await offlineDB.products.put(product);
// Status: 'created' ✓
```

### 2. Automatic Sync (Ketika Online)

```
Timeline:
1. Device online ✓
2. syncService mendeteksi online
3. Mulai periodic sync (setiap 30 detik)
4. Query data dengan sync_status 'created' atau 'updated'
5. Upsert ke Supabase menggunakan .upsert()
6. Jika berhasil, update status menjadi 'synced'
7. Jika error, status tetap 'created'/'updated' untuk retry
```

### 3. Update Product (Online)

```typescript
// Update existing product
const updated = updateEntity(product, {
  stock: 8,
  priceRetail: 29000000,
});

await offlineDB.products.put(updated);
// Status: 'updated' ✓

// Auto sync akan mendeteksi dan upsert
```

### 4. Delete Product (Soft Delete)

```typescript
import { markAsDeleted } from '@/lib/entityBuilders';

const deleted = markAsDeleted(product);
await offlineDB.products.put(deleted);
// Status: 'deleted' ✓

// Sync akan menghapus dari Supabase
```

---

## 🔧 Troubleshooting

### Issue: Data tidak sync setelah online

**Solusi:**
1. Cek `offlineDetector.getStatus()` apakah true
2. Cek IndexedDB sync_status: `await offlineDB.getPendingSyncData('products')`
3. Check console untuk sync errors: `await syncService.syncNow()`
4. Verify Supabase connection: `supabase.auth.getSession()`

### Issue: Duplicate IDs di database

**Tidak akan terjadi karena:**
- UUID v4 adalah random, kemungkinan tabrakan 1 dalam 5.3e36
- Dexie menggunakan id sebagai primary key
- Supabase upsert based on id

### Issue: Sync stuck / isSyncing = true

**Solusi:**
1. Check network connection
2. Verify Supabase credentials di `.env`
3. Reload page: `window.location.reload()`
4. Check browser console untuk error details

### Issue: IndexedDB quota exceeded

**Solusi:**
```typescript
// Clear synced data untuk free space
await offlineDB.clearSyncedData();

// Atau clear everything (hati-hati!)
await offlineDB.delete();
```

---

## 📊 Monitoring & Debugging

### Get Sync Statistics

```typescript
const stats = await offlineDB.getSyncStats();
console.log('Pending syncs:', stats);
// Output:
// {
//   products: 3,
//   customers: 1,
//   suppliers: 0,
//   transactions: 5,
//   total: 9
// }
```

### Monitor Sync Progress

```typescript
syncService.subscribe((stats) => {
  console.log('Sync Progress:', {
    status: stats.isSyncing ? '🔄 Syncing' : '✓ Idle',
    pending: stats.pendingItems,
    online: stats.isOnline ? '🟢' : '🔴',
    lastSync: stats.lastSyncTime ? new Date(stats.lastSyncTime) : 'Never',
  });
});
```

### Debug IndexedDB

```javascript
// Di browser console:
// Buka IndexedDB inspector
const db = await window.indexedDB.databases();
console.log(db);

// Atau gunakan DevTools: F12 > Application > IndexedDB > PosPro_OfflineDB
```

---

## 🚀 Best Practices

1. **Always use UUID untuk ID** - jangan pernah pakai auto-increment dari DB lokal
2. **Check sync status sebelum delete** - jangan hard-delete data
3. **Test offline mode** - DevTools > Network > Offline
4. **Monitor pending items** - warning user jika ada data belum sync
5. **Backup strategy** - regular backup ke Supabase juga
6. **Error handling** - catch errors di sync dan retry logic
7. **Performance** - batch upsert untuk banyak items

---

## 📞 Support & Questions

Untuk pertanyaan atau issues, lihat:
- Console logs untuk detailed error messages
- Supabase docs: https://supabase.io
- Dexie docs: https://dexie.org
