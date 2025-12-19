import fs from 'fs/promises';
import path from 'path';

// Supported file extensions for parsing
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.md', '.json', '.html', '.css', '.scss'];

// Files/folders to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.angular',
  'package-lock.json',
  'yarn.lock',
  '.DS_Store'
];

/**
 * Parse a codebase directory and extract all relevant files
 * @param {string} dirPath - Path to the directory to parse
 * @returns {Promise<Array>} Array of parsed file objects
 */
export async function parseCodebase(dirPath) {
  const files = [];
  await walkDirectory(dirPath, files, dirPath);
  return files;
}

/**
 * Recursively walk through directory and collect files
 */
async function walkDirectory(currentPath, files, basePath) {
  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      // Skip ignored patterns
      if (IGNORE_PATTERNS.some(pattern => entry.name === pattern || relativePath.includes(pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDirectory(fullPath, files, basePath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const fileInfo = await parseFile(fullPath, content, relativePath);
            files.push(fileInfo);
          } catch (err) {
            console.warn(`Warning: Could not read file ${fullPath}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error walking directory ${currentPath}:`, err.message);
  }
}

/**
 * Parse a single file and extract metadata
 */
async function parseFile(fullPath, content, relativePath) {
  const ext = path.extname(fullPath).toLowerCase();
  const fileName = path.basename(fullPath);
  const lines = content.split('\n');
  
  // Extract functions, classes, and important structures
  const structures = extractCodeStructures(content, ext);
  
  return {
    path: relativePath,
    fileName,
    extension: ext,
    language: getLanguage(ext),
    content,
    lineCount: lines.length,
    size: content.length,
    structures,
    folder: path.dirname(relativePath) || '/'
  };
}

/**
 * Extract code structures (functions, classes, exports) from content
 */
function extractCodeStructures(content, ext) {
  const structures = [];
  const lines = content.split('\n');

  // Patterns for different code structures
  const patterns = {
    // JavaScript/TypeScript patterns
    function: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    arrowFunction: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/,
    class: /(?:export\s+)?class\s+(\w+)/,
    interface: /(?:export\s+)?interface\s+(\w+)/,
    type: /(?:export\s+)?type\s+(\w+)/,
    component: /(?:export\s+)?(?:default\s+)?(?:function|const)\s+(\w+).*(?:React|Component|=>.*<)/,
  };

  lines.forEach((line, index) => {
    for (const [type, pattern] of Object.entries(patterns)) {
      const match = line.match(pattern);
      if (match) {
        structures.push({
          type,
          name: match[1],
          line: index + 1,
          lineContent: line.trim()
        });
      }
    }
  });

  return structures;
}

/**
 * Get language from file extension
 */
function getLanguage(ext) {
  const languageMap = {
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
  return languageMap[ext] || 'unknown';
}

/**
 * Get folder structure from parsed files
 */
export function getFolderStructure(files) {
  const folders = new Map();
  
  files.forEach(file => {
    const folder = file.folder || '/';
    if (!folders.has(folder)) {
      folders.set(folder, {
        path: folder,
        files: [],
        fileCount: 0,
        languages: new Set()
      });
    }
    
    const folderInfo = folders.get(folder);
    folderInfo.files.push({
      name: file.fileName,
      path: file.path,
      language: file.language,
      lineCount: file.lineCount
    });
    folderInfo.fileCount++;
    folderInfo.languages.add(file.language);
  });

  // Convert to array and serialize languages set
  return Array.from(folders.values()).map(folder => ({
    ...folder,
    languages: Array.from(folder.languages)
  }));
}

export { SUPPORTED_EXTENSIONS };

