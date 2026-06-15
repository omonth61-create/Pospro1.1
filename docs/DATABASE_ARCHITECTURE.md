# Database Architecture & Data Flow

## 📊 Struktur Database

### 1. Tabel `products` (SQLite) / Object Store `barang` (IndexedDB)

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT (Primary Key) | ID unik produk (UUID atau SKU) |
| `name` | TEXT | Nama produk |
| `sku` | TEXT | Kode SKU |
| `barcode` | TEXT | Kode barcode |
| `category` | TEXT | Kategori (default: "Umum") |
| `priceRetail` | INTEGER | Harga eceran |
| `priceWholesale` | INTEGER | Harga grosir |
| `stock` | INTEGER | Stok tersedia |
| `min_stock` | INTEGER | Stok minimum |
| `created_at` | TEXT | Timestamp pembuatan |
| `updated_at` | TEXT | Timestamp update terakhir |

### 2. Tabel `transactions` (SQLite) / Object Store `transaksi` (IndexedDB)

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT (Primary Key) | ID unik transaksi |
| `total` | INTEGER | Total transaksi |
| `customerName` | TEXT | Nama pelanggan |
| `payment_method` | TEXT | Metode pembayaran |
| `cash_amount` | INTEGER | Jumlah uang tunai |
| `change_amount` | INTEGER | Kembalian |
| `created_at` | TEXT | Timestamp transaksi |
| `is_synced` | INTEGER | Status sinkronisasi (0/1) |

### 3. Tabel `transaction_items` (SQLite) / Embedded in transaction (IndexedDB)

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT (Primary Key) | ID unik item |
| `transaction_id` | TEXT (Foreign Key) | ID transaksi |
| `product_id` | TEXT | ID produk |
| `product_name` | TEXT | Nama produk saat transaksi |
| `qty` | INTEGER | Jumlah |
| `price_at_sale` | INTEGER | Harga saat transaksi |

---

## 🔄 Alur Data Import Produk

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IMPORT PRODUK JSON                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. User pilih file JSON di Settings → Import Produk JSON           │
│     - File berisi array produk atau object { products: [...] }      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Validasi & Normalisasi Data                                      │
│     - Cek format JSON valid                                          │
│     - Normalisasi field (name, sku, barcode, price, stock, etc)     │
│     - Filter produk tanpa nama                                       │
│     - Generate ID jika tidak ada                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Simpan ke Database (dbProvider.importProducts)                   │
│                                                                      │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │  Untuk SETIAP produk:                                     │    │
│     │                                                           │    │
│     │  ┌─────────────────────────────────────────────────────┐ │    │
│     │  │  A. Simpan ke IndexedDB (SELALU)                    │ │    │
│     │  │     indexdbBarang.updateBarang(product)             │ │    │
│     │  │     - Browser: Chrome, Firefox, Edge, Safari        │ │    │
│     │  │     - Android WebView: Juga pakai IndexedDB         │ │    │
│     │  └─────────────────────────────────────────────────────┘ │    │
│     │                        │                                  │    │
│     │                        ▼                                  │    │
│     │  ┌─────────────────────────────────────────────────────┐ │    │
│     │  │  B. Cek Platform                                    │ │    │
│     │  │     if (Capacitor.isNativePlatform())               │ │    │
│     │  │                                                       │ │    │
│     │  │     - True: Android APK / iOS / Desktop Native      │ │    │
│     │  │     - False: Browser / Web                           │ │    │
│     │  └─────────────────────────────────────────────────────┘ │    │
│     │                        │                                  │    │
│     │                ┌───────┴───────┐                         │    │
│     │                │               │                         │    │
│     │            [TRUE]           [FALSE]                       │    │
│     │                │               │                         │    │
│     │                ▼               │                         │    │
│     │  ┌─────────────────────┐       │                         │    │
│     │  │ Simpan ke SQLite    │       │                         │    │
│     │  │ INSERT OR REPLACE   │       │                         │    │
│     │  │ INTO products (...) │       │                         │    │
│     │  │ VALUES (...)        │       │                         │    │
│     │  └─────────────────────┘       │                         │    │
│     │                │               │                         │    │
│     │                └───────┬───────┘                         │    │
│     │                        │                                  │    │
│     │                        ▼                                  │    │
│     │  ┌─────────────────────────────────────────────────────┐ │    │
│     │  │  successCount++                                      │ │    │
│     │  └─────────────────────────────────────────────────────┘ │    │
│     └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Tampilkan Hasil Import                                           │
│     - Jumlah produk berhasil: X                                      │
│     - Total produk di database: Y                                    │
│     - Produk baru ditambahkan: Z                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. Reload Halaman (window.location.reload())                        │
│     - Refresh data di semua halaman (Inventory, POS, Dashboard)     │
│     - Load ulang produk dari database                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📱 Platform Behavior

### Browser (Web)
- **Database:** IndexedDB saja
- **SQLite:** Tidak tersedia
- **Data Persistence:** Tersimpan di browser, hilang jika clear browser data

### Android APK (Capacitor)
- **Database:** IndexedDB + SQLite
- **Sinkronisasi:** Kedua database diisi bersamaan
- **Data Persistence:** Tersimpan di device, tidak hilang

### Windows Desktop (Tauri)
- **Database:** SQLite (via Tauri adapter)
- **IndexedDB:** Tidak digunakan
- **Data Persistence:** Tersimpan di filesystem

---

## 🔍 Debugging & Verification

### Cek Jumlah Produk di Console
```javascript
// Buka Developer Tools (F12) → Console

// Cek IndexedDB
const count = await indexdbBarang.count();
console.log('Total produk di IndexedDB:', count);

// Cek semua produk
const products = await indexdbBarang.getAllBarang();
console.log('Semua produk:', products);
```

### Cek SQLite (hanya native platform)
```javascript
// Di Console, jalankan:
const result = await dbProvider.query('SELECT COUNT(*) as count FROM products');
console.log('Total produk di SQLite:', result.values[0].count);
```

### Log Import
Saat import, console akan menampilkan:
```
📦 Data JSON yang di-parse: object Array
📦 Jumlah produk dalam file: 10
📊 Jumlah produk sebelum import: 100
📦 Jumlah produk valid: 10
📊 Jumlah produk setelah import: 110
📈 Produk berhasil: 10
📉 Produk gagal: 0
```

---

## ⚠️ Catatan Penting

1. **Di Browser:** Data hanya disimpan ke IndexedDB, tidak ada SQLite
2. **Di Android/Windows:** Data disimpan ke IndexedDB DAN SQLite secara bersamaan
3. **Produk dengan ID/SKU sama:** Akan ditimpa (upsert), bukan ditambah
4. **Auto-reload:** Setelah import, halaman reload untuk refresh data
5. **Logging:** Selalu cek console untuk melihat detail import

---

## 🛠️ Troubleshooting

### Masalah: Jumlah produk tidak bertambah setelah import

**Solusi:**
1. Buka Developer Tools (F12) → Console
2. Lihat log import, pastikan:
   - `📦 Jumlah produk valid:` > 0
   - `📈 Produk berhasil:` > 0
3. Cek apakah produk sudah ada (ID/SKU sama) → akan ditimpa, bukan ditambah
4. Pastikan halaman reload setelah import

### Masalah: Data hilang setelah restart browser

**Penyebab:** Di browser, data disimpan di IndexedDB yang bisa hilang jika:
- Clear browser data
- Incognito mode
- Browser crash

**Solusi:** Gunakan fitur Backup untuk export data secara berkala, atau gunakan Android/Windows version untuk persistence yang lebih baik.