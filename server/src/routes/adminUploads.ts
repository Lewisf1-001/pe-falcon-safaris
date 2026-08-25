import { Router } from "express";
import multer, { MulterError } from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { requireAdminAuth } from "../middleware/requireAdminAuth";
import {
  buildPackageImageUrl,
  ensureUploadDirs,
  packageImagesDir,
} from "../services/uploads";

const router = Router();

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSizeBytes = 5 * 1024 * 1024;

ensureUploadDirs();

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    ensureUploadDirs();
    callback(null, packageImagesDir);
  },
  filename(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 10,
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, and WebP images are allowed."));
      return;
    }

    callback(null, true);
  },
});

router.use(requireAdminAuth);

router.post("/package-images", (req, res, next) => {
  upload.array("images", 10)(req, res, (error) => {
    if (error) {
      if (error instanceof MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Each image must be 5 MB or smaller." });
        }

        if (error.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ error: "You can upload up to 10 images at a time." });
        }

        return res.status(400).json({ error: error.message });
      }

      return res.status(400).json({ error: error.message || "Unable to upload images." });
    }

    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Select at least one image to upload." });
    }

    return res.status(201).json({
      images: files.map((file) => ({
        url: buildPackageImageUrl(file.filename),
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      })),
    });
  });
});

export default router;
