import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs';

const itemsUploadDir = path.join(__dirname, '..', '..', 'uploads', 'items');
if (!fs.existsSync(itemsUploadDir)) {
  fs.mkdirSync(itemsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, itemsUploadDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

// A client-supplied MIME type alone is not trustworthy (OWASP "Unrestricted
// File Upload"): an attacker can upload a file with arbitrary content while
// setting `Content-Type: image/jpeg` in the multipart request. Requiring the
// filename extension to ALSO be on a known-safe image allowlist closes that
// gap - both checks must agree before a file is accepted. .svg is deliberately
// excluded even though it is technically an image format, since it can embed
// <script> content that would execute if ever opened directly in a browser tab.
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype && file.mimetype.startsWith('image/') && ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }
  cb(new Error('Only image uploads (.jpg, .jpeg, .png, .webp, .gif) are allowed'));
};

export const itemUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per image
  },
});
