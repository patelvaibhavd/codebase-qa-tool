import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parseCodebase, getFolderStructure } from '../services/parser.service.js';
import { indexProject } from '../services/vectorStore.service.js';

const router = express.Router();

// Configure multer for ZIP uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

/**
 * Upload a ZIP file containing a codebase
 * POST /api/upload/zip
 */
router.post('/zip', upload.single('codebase'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectId = uuidv4();
    const extractPath = path.join(process.cwd(), 'projects', projectId);
    
    console.log(`📦 Processing ZIP upload for project ${projectId}`);

    // Extract ZIP
    const zip = new AdmZip(req.file.path);
    await fs.mkdir(extractPath, { recursive: true });
    zip.extractAllTo(extractPath, true);

    // Find the root directory (handle case where ZIP contains a single folder)
    const entries = await fs.readdir(extractPath);
    let rootPath = extractPath;
    
    if (entries.length === 1) {
      const singleEntry = path.join(extractPath, entries[0]);
      const stat = await fs.stat(singleEntry);
      if (stat.isDirectory()) {
        rootPath = singleEntry;
      }
    }

    // Parse the codebase
    console.log(`📂 Parsing codebase at ${rootPath}`);
    const files = await parseCodebase(rootPath);
    const folders = getFolderStructure(files);

    // Index the project
    console.log(`🔍 Indexing ${files.length} files...`);
    const stats = await indexProject(projectId, files);

    // Clean up uploaded ZIP
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      projectId,
      message: 'Codebase uploaded and indexed successfully',
      stats: {
        ...stats,
        folders: folders.length
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process upload', message: error.message });
  }
});

/**
 * Clone and index a GitHub repository
 * POST /api/upload/github
 */
router.post('/github', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Validate GitHub URL
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+/;
    if (!githubUrlPattern.test(repoUrl)) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }

    const projectId = uuidv4();
    const clonePath = path.join(process.cwd(), 'projects', projectId);

    console.log(`🐙 Cloning repository: ${repoUrl}`);

    // Clone the repository
    const git = simpleGit();
    await fs.mkdir(clonePath, { recursive: true });
    await git.clone(repoUrl, clonePath, ['--depth', '1']); // Shallow clone for speed

    // Parse the codebase
    console.log(`📂 Parsing codebase at ${clonePath}`);
    const files = await parseCodebase(clonePath);
    const folders = getFolderStructure(files);

    // Index the project
    console.log(`🔍 Indexing ${files.length} files...`);
    const stats = await indexProject(projectId, files);

    res.json({
      success: true,
      projectId,
      message: 'Repository cloned and indexed successfully',
      repoUrl,
      stats: {
        ...stats,
        folders: folders.length
      }
    });

  } catch (error) {
    console.error('GitHub clone error:', error);
    res.status(500).json({ 
      error: 'Failed to clone repository', 
      message: error.message 
    });
  }
});

/**
 * Upload codebase directly as JSON (for small codebases)
 * POST /api/upload/direct
 */
router.post('/direct', async (req, res) => {
  try {
    const { files, projectName } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    const projectId = uuidv4();
    console.log(`📝 Processing direct upload for project ${projectId}`);

    // Transform files to expected format
    const parsedFiles = files.map(file => ({
      path: file.path,
      fileName: path.basename(file.path),
      extension: path.extname(file.path),
      language: getLanguageFromExt(path.extname(file.path)),
      content: file.content,
      lineCount: file.content.split('\n').length,
      size: file.content.length,
      structures: [],
      folder: path.dirname(file.path) || '/'
    }));

    // Index the project
    const stats = await indexProject(projectId, parsedFiles);

    res.json({
      success: true,
      projectId,
      projectName: projectName || 'Unnamed Project',
      message: 'Codebase indexed successfully',
      stats
    });

  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({ error: 'Failed to process upload', message: error.message });
  }
});

function getLanguageFromExt(ext) {
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.md': 'markdown',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss'
  };
  return map[ext] || 'unknown';
}

export default router;

