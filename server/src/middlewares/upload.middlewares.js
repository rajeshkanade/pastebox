import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const allowedExtensions = [
  '.jpg', '.jpeg', '.webp', '.png',
  '.mp4', '.avi', '.mov', '.mkv', '.mk3d', '.mks', '.mka',
  '.pdf'
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    console.log("files : ", file)
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`❌ Unsupported file type: ${ext}`));
    }
    cb(null, true);
  }
});



export const logFilesMiddleware = (req, res, next) => {
  const uploadFilesMiddleware = (req, res, next) => {
  upload.array("files")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    console.log("Files:", req.files);
    console.log("Body:", req.body);
    next();
  });
};

};

export default upload;
