# Integrasi Login Google di Frontend

Dokumen ini memberikan contoh cara mengimplementasikan tombol "Login dengan Google" di frontend untuk aplikasi Agrichain.

## Contoh dengan HTML/JavaScript Sederhana

### 1. Tombol Login Sederhana

```html
<!DOCTYPE html>
<html>
<head>
  <title>Agrichain - Login</title>
  <style>
    .google-btn {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .google-btn:hover {
      background-color: #357ae8;
    }
  </style>
</head>
<body>
  <h1>Agrichain Login</h1>
  
  <button class="google-btn" onclick="loginWithGoogle()">
    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" width="20" height="20" alt="Google logo">
    Login dengan Google
  </button>

  <script>
    function loginWithGoogle() {
      window.location.href = 'http://localhost:5010/auth/google';
    }
  </script>
</body>
</html>
```

## Contoh dengan React

### 1. Komponen Tombol Login Google

```jsx
// GoogleLoginButton.jsx
import React from 'react';
import './GoogleLoginButton.css';

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5010/auth/google';
  };

  return (
    <button className="google-login-btn" onClick={handleGoogleLogin}>
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
        alt="Google logo"
        className="google-icon" 
      />
      Login dengan Google
    </button>
  );
};

export default GoogleLoginButton;
```

### 2. CSS untuk Tombol

```css
/* GoogleLoginButton.css */
.google-login-btn {
  background-color: #ffffff;
  color: #444444;
  border: 1px solid #dddddd;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background-color 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.google-login-btn:hover {
  background-color: #f5f5f5;
}

.google-icon {
  width: 18px;
  height: 18px;
}
```

### 3. Penggunaan dalam Halaman Login

```jsx
// LoginPage.jsx
import React from 'react';
import GoogleLoginButton from './components/GoogleLoginButton';

const LoginPage = () => {
  return (
    <div className="login-container">
      <h1>Login ke Agrichain</h1>
      
      <div className="login-options">
        {/* Form login normal */}
        <form className="login-form">
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit">Login</button>
        </form>
        
        <div className="divider">atau</div>
        
        {/* Tombol Google Login */}
        <GoogleLoginButton />
      </div>
    </div>
  );
};

export default LoginPage;
```

## Menangani Callback di Frontend

Setelah autentikasi Google berhasil, server akan mengarahkan kembali ke `/auth/google/callback`, yang akan menangani token dan mengembalikan respon JSON. Anda perlu membuat satu halaman tambahan untuk menangkap token dan menyimpannya.

```jsx
// GoogleCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Ambil token dari URL (jika ada)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Simpan token di localStorage
      localStorage.setItem('authToken', token);
      
      // Redirect ke dashboard atau halaman utama
      navigate('/dashboard');
    } else {
      // Coba ambil data dari response
      fetch('/auth/login-success')
        .then(response => response.json())
        .then(data => {
          if (data.token) {
            localStorage.setItem('authToken', data.token);
            navigate('/dashboard');
          } else {
            setError('Token tidak ditemukan dalam respons');
            setLoading(false);
          }
        })
        .catch(err => {
          setError('Terjadi kesalahan saat menangani callback');
          setLoading(false);
        });
    }
  }, [navigate]);

  if (loading) {
    return <div>Sedang memproses login...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return null;
};

export default GoogleCallback;
```

## Catatan Penting

1. Pastikan URL callback di Google Cloud Console sesuai dengan endpoint yang Anda gunakan di server (http://localhost:5010/auth/google/callback)

2. Untuk produksi, gunakan HTTPS untuk semua URL

3. Jika Anda menggunakan frontend dan backend di domain yang berbeda, Anda mungkin perlu menangani CORS

4. Sesuaikan port dan URL sesuai dengan konfigurasi server Anda 