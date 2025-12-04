const multer = require('multer');
const path = require('path');

const createMulter = (folderName) => {

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'uploads', folderName));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      cb(null, `${Date.now()}-${base}${ext}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp"
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }  // 5MB limit
  });
};

module.exports = createMulter;
