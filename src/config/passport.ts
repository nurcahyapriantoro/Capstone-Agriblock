import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Request } from 'express';
import { UserRole } from '../enum';
import { v4 as uuidv4 } from 'uuid';

// Perlu disesuaikan dengan model user yang sebenarnya
// Saat ini menggunakan referensi dari UserController.ts
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      walletAddress: string;
    }
    
    interface Session {
      googleProfile?: any;
      passport?: any;
    }
  }
}

// Akan diisi dari environment variables atau menggunakan nilai default
// PENTING: Gunakan callback URL yang persis sama dengan yang terdaftar di Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '326496788540-6oivaa2i7ljdvirspojli6rs2fl1ih3c.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const CALLBACK_URL = 'http://localhost:5010/api/auth/google/callback';  // URL yang terdaftar di Google Cloud Console

// Function to find or create a user will be injected into the config
type FindOrCreateUserFn = (
  profile: any,
  done: (error: any, user?: any, info?: any) => void
) => void;

export const configurePassport = (findOrCreateUser: FindOrCreateUserFn) => {
  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser((id: string, done) => {
    // This should be implemented to fetch user from database
    // For now it's a placeholder
    const user: Express.User = {
      id,
      email: '',
      name: '',
      role: UserRole.CONSUMER,
      walletAddress: ''
    };
    done(null, user);
  });

  // Configure Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        passReqToCallback: true
      },
      (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
        // Log callback URL used
        console.log('Google OAuth callback URL used:', CALLBACK_URL);
        console.log('Google OAuth profile received:', profile.id);
        
        // Simpan profil Google dalam session untuk digunakan pada halaman pilih role
        (req.session as any).googleProfile = profile;
        
        // Cek apakah ini pengguna baru atau existing
        findOrCreateUser(profile, (error, user, info) => {
          if (error) {
            console.error('Google OAuth error:', error);
            return done(error);
          }
          
          // Jika info.isNewUser = true, maka ini adalah pengguna baru
          if (info && info.isNewUser) {
            console.log('New user detected, redirecting to role selection');
            // Arahkan ke callback URL dengan parameter isNewUser=true
            return done(null, user, { isNewUser: true });
          }
          
          // Pengguna yang sudah ada, lanjutkan flow normal
          console.log('Existing user detected, proceeding with login');
          done(null, user);
        });
      }
    )
  );

  return passport;
}; 