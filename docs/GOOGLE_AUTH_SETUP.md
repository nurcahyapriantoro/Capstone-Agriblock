# Cara Setup Google OAuth untuk Login dan Registrasi

Dokumen ini menjelaskan cara mengatur Google OAuth untuk digunakan dalam fitur login dan registrasi pada aplikasi Agrichain.

## Kredensial yang Sudah Dikonfigurasi

Aplikasi sudah dikonfigurasi dengan kredensial Google OAuth berikut:

```
Client ID     : 326496788540-6oivaa2i7ljdvirspojli6rs2fl1ih3c.apps.googleusercontent.com
Client Secret : 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
Callback URL  : http://localhost:5010/auth/google/callback
```

**Catatan:** Jika Anda ingin menggunakan kredensial ini, pastikan Anda telah mendaftarkan domain dan callback URL yang sesuai di Google Cloud Console.

## Data Pengguna setelah Login dengan Google

Ketika pengguna login dengan Google, sistem akan:

1. **Pengguna Baru**: Jika ini adalah login pertama, sistem akan otomatis membuat:
   - Akun dengan role default (CONSUMER)
   - Wallet Address baru
   - Private Key yang terenkripsi

2. **Pengguna yang Sudah Ada**: Jika email sudah terdaftar, sistem akan mengembalikan data yang sama seperti login biasa.

3. **Respons Login**: Respons yang dikembalikan setelah login berhasil akan menyertakan:
   - Token JWT untuk autentikasi
   - Data pengguna (ID, nama, email, role)
   - Wallet Address
   - Private Key (hanya ditampilkan sekali saat diperlukan)

Data yang dikembalikan konsisten dengan data yang didapatkan saat login dengan cara biasa (email dan password).

## Langkah 1: Membuat Project di Google Cloud Platform

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Dari menu sidebar, pilih "APIs & Services" > "Credentials"
4. Klik "Create Credentials" > "OAuth client ID"
5. Pilih "Web application" sebagai jenis aplikasi
6. Berikan nama untuk client OAuth Anda (misalnya "Agrichain Web App")
7. Tambahkan URL berikut ke "Authorized JavaScript origins":
   - `http://localhost:5010` (untuk frontend dan API server)
8. Tambahkan URL callback berikut ke "Authorized redirect URIs":
   - `http://localhost:5010/auth/google/callback`
9. Klik "Create"
10. Catat Client ID dan Client Secret yang diberikan

## Langkah 2: Konfigurasi Environment Variables

Aplikasi akan mencoba membaca kredensial dari environment variables. Jika tidak ditemukan, akan menggunakan kredensial default yang sudah dikonfigurasi.

Jika Anda ingin menggunakan kredensial Anda sendiri, tambahkan ke file `.env` Anda:

```
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5010/auth/google/callback

# Auth Configuration
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key
```

## Langkah 3: Penggunaan di Frontend

Untuk menggunakan fitur login Google di frontend, tambahkan link atau tombol ke endpoint autentikasi Google:

```html
<a href="http://localhost:5010/auth/google">Login dengan Google</a>
```

Atau dengan button:

```html
<button onclick="window.location.href='http://localhost:5010/auth/google'">Login dengan Google</button>
```

## Cara Kerja Auth Flow

1. Pengguna mengklik tombol "Login dengan Google"
2. Pengguna diarahkan ke halaman consent Google
3. Setelah pengguna menyetujui, Google mengarahkan kembali ke callback URL aplikasi (`/auth/google/callback`)
4. Backend menerima kode autentikasi dari Google dan menukarnya dengan token akses
5. Backend membuat atau memperbarui akun pengguna berdasarkan profil Google
6. JWT token dibuat dan dikirim ke frontend, dan pengguna login secara otomatis

## Troubleshooting

- Pastikan URL callback yang dikonfigurasi di Google Cloud Console sama persis dengan yang digunakan di aplikasi
- Periksa bahwa environment variables benar dan termuat
- Jika menggunakan domain kustom, pastikan domain tersebut diotorisasi di Google Cloud Console
- Pastikan API Google OAuth sudah diaktifkan di project Google Cloud Anda 