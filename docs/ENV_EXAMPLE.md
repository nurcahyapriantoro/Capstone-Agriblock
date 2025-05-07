# Contoh File .env untuk Agrichain

Berikut ini adalah contoh file .env untuk mengkonfigurasi aplikasi Agrichain:

```
# Server Configuration
APP_PORT=3000
API_PORT=5010
MY_ADDRESS=ws://localhost:3000

# Auth Configuration
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=326496788540-6oivaa2i7ljdvirspojli6rs2fl1ih3c.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:5010/auth/google/callback

# Environment
NODE_ENV=development

# Blockchain Configuration
ENABLE_MINING=true
ENABLE_API=true
ENABLE_CHAIN_REQUEST=false
IS_ORDERED_NODE=false
```

## Catatan Penggunaan
1. Buat file `.env` di root project
2. Salin contoh di atas ke file tersebut
3. Sesuaikan nilai-nilai sesuai kebutuhan
4. Restart aplikasi untuk menerapkan perubahan 