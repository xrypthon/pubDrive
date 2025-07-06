const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const UPLOAD_FOLDER = path.join(__dirname, 'public', 'uploads');
const SALT_ROUNDS = 10;

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Database simulation (in production, use a real database)
let fileDB = {};

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_FOLDER);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { files: Object.values(fileDB) });
});

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const fileInfo = {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        name: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        size: req.file.size,
        type: req.file.mimetype,
        uploadDate: new Date().toISOString(),
        isProtected: req.body.protectFile === 'on',
        password: null
    };

    if (fileInfo.isProtected) {
        if (!req.body.password || req.body.password.length < 4) {
            fs.unlinkSync(req.file.path);
            return res.status(400).send('Password must be at least 4 characters for protected files.');
        }
        fileInfo.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    }

    fileDB[fileInfo.id] = fileInfo;
    res.redirect('/');
});

app.post('/verify-password', async (req, res) => {
    const { fileId, password } = req.body;
    const file = fileDB[fileId];

    if (!file || !file.isProtected) {
        return res.status(404).json({ success: false, message: 'File not found or not protected.' });
    }

    const match = await bcrypt.compare(password, file.password);
    if (match) {
        res.json({ success: true, path: file.path });
    } else {
        res.json({ success: false, message: 'Incorrect password.' });
    }
});

app.get('/download/:id', (req, res) => {
    const file = fileDB[req.params.id];
    
    if (!file) {
        return res.status(404).send('File not found.');
    }

    if (file.isProtected) {
        return res.status(403).send('This file is password protected.');
    }

    res.download(path.join(__dirname, 'public', file.path), file.name);
});

// Start server
app.listen(PORT, () => {
    console.log(`Xrypthon PubDrive running on http://localhost:${PORT}`);
});