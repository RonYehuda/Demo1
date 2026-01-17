/**
 * File upload middleware using multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize // Default 5MB
  },
  fileFilter
});

// Single image upload middleware
const uploadProductImage = upload.single('image');

// Wrapper to handle multer errors
const handleUpload = (req, res, next) => {
  uploadProductImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds limit of ${config.maxFileSize / (1024 * 1024)}MB`
          }
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message
        }
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: err.message
        }
      });
    }
    next();
  });
};

// Delete image file
const deleteImage = (imagePath) => {
  if (!imagePath) return;
  const fullPath = path.join(uploadsDir, path.basename(imagePath));
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

module.exports = {
  handleUpload,
  deleteImage,
  uploadsDir
};
