import multer from "multer";
import path from "path";

// store files in memory (we parse buffer). If you prefer disk storage change accordingly.
const storage = multer.memoryStorage();

const csvFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".csv") cb(null, true);
    else cb(new Error("Only CSV files are allowed"));
};

export const uploadCsv = multer({
    storage,
    fileFilter: csvFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB limit - adjust as needed
    }
});

// ─── Excel Upload (for WhatsApp Campaign recipients) ───────────────────────
const excelFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new Error("Only Excel files (.xlsx / .xls) are allowed"));
};

export const uploadExcel = multer({
    storage,
    fileFilter: excelFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    }
});

// ─── WhatsApp Template Media Upload (Images, Video, Doc) ─────────────────────
const templateMediaFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type. Allowed: JPG, PNG, MP4, PDF"), false);
    }
};

export const uploadTemplateMedia = multer({
    storage,
    fileFilter: templateMediaFilter,
    limits: {
        fileSize: 64 * 1024 * 1024 // Meta limit for video is 64MB usually
    }
});

export const uploadGeneric = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB limit
    }
});
