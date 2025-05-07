import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import imagekit from '../utils/imagekit';
import { FileObject } from 'imagekit/dist/libs/interfaces';

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      uploadedFiles?: any[];
      uploadFolder?: string;
    }
  }
}

// Upload limits configuration
const UPLOAD_LIMITS = {
  // Maximum file size (5MB)
  maxFileSize: 5 * 1024 * 1024,
  
  // Allowed file types
  allowedImageTypes: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  allowedDocumentTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
  
  // Maximum files per request
  maxFiles: 5,
  
  // Storage paths (for local fallback)
  imagePath: 'uploads/images',
  documentPath: 'uploads/documents',
};

// Ensure upload directories exist (for local fallback)
const ensureDirectoriesExist = () => {
  [UPLOAD_LIMITS.imagePath, UPLOAD_LIMITS.documentPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// For memory storage (needed for ImageKit)
const memoryStorage = multer.memoryStorage();

// For local storage (fallback)
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectoriesExist();
    cb(null, UPLOAD_LIMITS.imagePath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectoriesExist();
    cb(null, UPLOAD_LIMITS.documentPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (UPLOAD_LIMITS.allowedImageTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Only ${UPLOAD_LIMITS.allowedImageTypes.join(', ')} files are allowed for images`));
  }
};

// File filter for documents
const documentFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (UPLOAD_LIMITS.allowedDocumentTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Only ${UPLOAD_LIMITS.allowedDocumentTypes.join(', ')} files are allowed for documents`));
  }
};

// Multer configurations
export const uploadImage = multer({
  storage: memoryStorage, // Use memory storage for ImageKit uploads
  limits: { 
    fileSize: UPLOAD_LIMITS.maxFileSize,
    files: UPLOAD_LIMITS.maxFiles 
  },
  fileFilter: imageFilter
});

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { 
    fileSize: UPLOAD_LIMITS.maxFileSize,
    files: UPLOAD_LIMITS.maxFiles 
  },
  fileFilter: documentFilter
});

// Upload files to ImageKit middleware
export const uploadToImageKit = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.files) {
    return next();
  }

  try {
    const uploadPromises = [];
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    
    // Determine folder path - use custom folder from query or default to product/{productId}
    let folderPath = '/product/general';
    
    if (req.query.customFolder) {
      // Use the custom folder path if specified
      folderPath = req.query.customFolder as string;
    } else if (req.params.productId) {
      // Default to product folder structure
      folderPath = `/product/${req.params.productId}`;
    }
    
    for (const file of files) {
      const uploadPromise = imagekit.upload({
        file: file.buffer.toString('base64'),
        fileName: `${Date.now()}-${file.originalname}`,
        folder: folderPath,
      });
      uploadPromises.push(uploadPromise);
    }

    const uploadedFiles = await Promise.all(uploadPromises);
    
    // Attach the ImageKit response to the request object
    req.uploadedFiles = uploadedFiles;
    req.uploadFolder = folderPath;
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Upload to ImageKit failed: ${(error as Error).message}`
    });
  }
};

// Error handler middleware for upload errors
export const handleUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Multer error (file size, file count, etc.)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum file size is ${UPLOAD_LIMITS.maxFileSize / (1024 * 1024)}MB`
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum is ${UPLOAD_LIMITS.maxFiles} files per upload`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }
  } else if (err) {
    // Other errors (file type, etc.)
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
}; 