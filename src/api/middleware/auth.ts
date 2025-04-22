// Di dalam fungsi isAuthenticated, tambahkan log debug
// Extract and verify token
const token = authHeader.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

// Log untuk debugging (bisa dihapus nanti)
console.log('JWT Payload:', decoded);

// Add user data to request object
req.user = decoded as { id: string; role: string }; 