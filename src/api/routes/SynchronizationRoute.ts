import express from "express";
import SynchronizationController from "../controller/SynchronizationController";
import { authenticateJWT } from "../../middleware/auth";
import { UserRole } from "../../enum";

// Helper function untuk memeriksa apakah pengguna memiliki akses admin
// Karena ADMIN sudah dihapus, kita bisa menggunakan FARMER sebagai role tertinggi
const isAdmin = (req: express.Request): boolean => {
  // Karena peran ADMIN sudah dihapus, semua pengguna dengan peran FARMER diberi akses
  return req.user?.role === UserRole.FARMER;
};

// Middleware untuk memastikan hanya yang berhak yang bisa mengakses
const ensureAdminAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only farmers can access synchronization features."
    });
  }
  next();
};

const router = express.Router();

// Hanya admin yang bisa menjalankan sinkronisasi manual
router.post("/products", authenticateJWT, ensureAdminAccess, SynchronizationController.synchronizeProducts);

export default router;