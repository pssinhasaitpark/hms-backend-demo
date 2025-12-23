import multer from "multer";
import sharp from "sharp";
import { handleResponse } from "../utils/responseHandler.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/images");

    fs.promises
      .mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch((err) => {
        console.error("Directory creation error:", err);
        cb(new Error("Failed to create directory"), false);
      });
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
  },
}); */

/* -------------------- Multer Storage -------------------- */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let uploadDir;

      if (file.mimetype.startsWith("image/")) {
        uploadDir = path.join(__dirname, "../uploads/images");
      } else if (file.mimetype === "application/pdf") {
        uploadDir = path.join(__dirname, "../uploads/files");
      } else {
        return cb(new Error("Only images and PDFs are allowed!"), false);
      }

      await fs.promises.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      console.error("Directory creation error:", err);
      cb(new Error("Failed to create directory"), false);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

/* -------------------- Multer Upload -------------------- */
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDFs are allowed!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/* old 
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);  
    }
    cb(null, true); 
  },
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
}); */

/* const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // images ya PDFs allow kar do
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDFs are allowed!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});
 */



export const uploadAndConvertImage = (fieldName) => [
  upload.array(fieldName, 10),
  async (req, res, next) => {
    if (!req.files) return next();

    try {
      const convertedFileUrls = [];

      for (const file of req.files) {
        const uploadedFilePath = path.join(
          __dirname,
          "../uploads/images",
          file.filename
        );

        if (file.mimetype.startsWith("image/")) {
          // Image → WebP conversion
          const buffer = await sharp(uploadedFilePath)
            .resize(800)
            .webp({ quality: 80 })
            .toBuffer();

          const webpFileName = `${file.filename.split(".")[0]}.webp`;
          const webpFilePath = path.join(
            __dirname,
            "../uploads/images",
            webpFileName
          );

          await fs.promises.writeFile(webpFilePath, buffer);
          fs.unlinkSync(uploadedFilePath);

          convertedFileUrls.push(`/media/images/${webpFileName}`);
        } else if (file.mimetype === "application/pdf") {
          convertedFileUrls.push(`/media/images/${file.filename}`); 
        }
      }

      req.convertedFiles = convertedFileUrls;
      next();
    } catch (err) {
      console.error("Error processing files:", err);
      return handleResponse(res, 500, "Failed to upload files");
    }
  },
];

/* export const uploadAndConvertImage = (fieldName) => [
  upload.array(fieldName, 10), 
  async (req, res, next) => {
    if (!req.files) return next();  

    try {
      const convertedFileUrls = [];  

   
      for (const file of req.files) {
        const uploadedFilePath = path.join(__dirname, '../uploads/images', file.filename); 

        const buffer = await sharp(uploadedFilePath)
          .resize(800) 
          .webp({ quality: 80 }) 
          .toBuffer();  

        const webpFileName = `${file.filename.split('.')[0]}.webp`;
        const webpFilePath = path.join(__dirname, '../uploads/images', webpFileName);


        await fs.promises.writeFile(webpFilePath, buffer);

    
        fs.unlinkSync(uploadedFilePath);

        const fileUrl = `/media/images/${webpFileName}`; 
        convertedFileUrls.push(fileUrl);  
      }

 
      req.convertedFiles = convertedFileUrls;

      next(); 
    } catch (err) {
      console.error('Error processing images:', err);
      return handleResponse(res, 500, 'Failed to upload and convert images');
    }
  },
]; */

export const uploadGuestFiles = (fieldName) => [
  upload.array(fieldName, 10),
  async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();

    try {
      const uploadedUrls = [];

      for (const file of req.files) {
        if (file.mimetype.startsWith("image/")) {
          const inputPath = file.path;

          const buffer = await sharp(inputPath)
            .resize(800)
            .webp({ quality: 80 })
            .toBuffer();

          const webpName = `${path.parse(file.filename).name}.webp`;
          const webpPath = path.join(__dirname, "../uploads/images", webpName);

          await fs.promises.writeFile(webpPath, buffer);
          await fs.promises.unlink(inputPath);

          uploadedUrls.push(`/media/images/${webpName}`);
        }

        if (file.mimetype === "application/pdf") {
          uploadedUrls.push(`/media/documents/${file.filename}`);
        }
      }

      req.convertedFiles = uploadedUrls;
      next();
    } catch (err) {
      console.error("Guest file upload error:", err);
      return handleResponse(res, 500, "Failed to upload guest files");
    }
  },
];
