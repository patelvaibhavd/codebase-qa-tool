/**
 * Cleanup Service
 * Handles deletion of project files from disk
 */

import fs from 'fs/promises';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'projects');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * Delete a specific project's files from disk
 * @param {string} projectId - Project ID to delete
 */
export async function deleteProjectFiles(projectId) {
  const projectPath = path.join(PROJECTS_DIR, projectId);
  
  try {
    await fs.rm(projectPath, { recursive: true, force: true });
    console.log(`🗑️  Deleted project files: ${projectId}`);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error deleting project ${projectId}:`, error.message);
    }
    return false;
  }
}

/**
 * Delete all projects from disk
 * @returns {Object} Cleanup statistics
 */
export async function deleteAllProjectFiles() {
  const stats = {
    projectsDeleted: 0,
    uploadsDeleted: 0,
    errors: []
  };

  // Clean projects directory
  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);
    for (const dir of projectDirs) {
      try {
        await fs.rm(path.join(PROJECTS_DIR, dir), { recursive: true, force: true });
        stats.projectsDeleted++;
      } catch (err) {
        stats.errors.push(`Project ${dir}: ${err.message}`);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      stats.errors.push(`Projects dir: ${error.message}`);
    }
  }

  // Clean uploads directory
  try {
    const uploadFiles = await fs.readdir(UPLOADS_DIR);
    for (const file of uploadFiles) {
      try {
        await fs.rm(path.join(UPLOADS_DIR, file), { force: true });
        stats.uploadsDeleted++;
      } catch (err) {
        stats.errors.push(`Upload ${file}: ${err.message}`);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      stats.errors.push(`Uploads dir: ${error.message}`);
    }
  }

  console.log(`🧹 Cleanup complete: ${stats.projectsDeleted} projects, ${stats.uploadsDeleted} uploads deleted`);
  return stats;
}

/**
 * Get disk usage statistics
 * @returns {Object} Disk usage info
 */
export async function getDiskUsage() {
  const usage = {
    projects: { count: 0, totalSize: 0, items: [] },
    uploads: { count: 0, totalSize: 0 }
  };

  // Check projects directory
  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);
    usage.projects.count = projectDirs.length;
    
    for (const dir of projectDirs) {
      const dirPath = path.join(PROJECTS_DIR, dir);
      const size = await getDirectorySize(dirPath);
      usage.projects.totalSize += size;
      usage.projects.items.push({
        id: dir,
        size: size,
        sizeFormatted: formatBytes(size)
      });
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error reading projects:', error.message);
    }
  }

  // Check uploads directory
  try {
    const uploadFiles = await fs.readdir(UPLOADS_DIR);
    usage.uploads.count = uploadFiles.length;
    
    for (const file of uploadFiles) {
      const filePath = path.join(UPLOADS_DIR, file);
      const stat = await fs.stat(filePath);
      usage.uploads.totalSize += stat.size;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error reading uploads:', error.message);
    }
  }

  return {
    projects: {
      ...usage.projects,
      totalSizeFormatted: formatBytes(usage.projects.totalSize)
    },
    uploads: {
      ...usage.uploads,
      totalSizeFormatted: formatBytes(usage.uploads.totalSize)
    },
    totalSize: usage.projects.totalSize + usage.uploads.totalSize,
    totalSizeFormatted: formatBytes(usage.projects.totalSize + usage.uploads.totalSize)
  };
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath) {
  let size = 0;
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        size += stat.size;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  
  return size;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

