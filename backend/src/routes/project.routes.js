import express from 'express';
import { 
  getProjectStats, 
  getProjectFiles, 
  projectExists, 
  deleteProject,
  getAllProjectIds
} from '../services/vectorStore.service.js';
import { getFolderStructure } from '../services/parser.service.js';
import { 
  deleteProjectFiles, 
  deleteAllProjectFiles, 
  getDiskUsage 
} from '../services/cleanup.service.js';

const router = express.Router();

/**
 * Get project statistics
 * GET /api/project/:projectId/stats
 */
router.get('/:projectId/stats', (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found', 
        message: 'Please upload a codebase first' 
      });
    }

    const stats = getProjectStats(projectId);
    
    res.json({
      success: true,
      projectId,
      stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get project stats', 
      message: error.message 
    });
  }
});

/**
 * Get all files in a project
 * GET /api/project/:projectId/files
 */
router.get('/:projectId/files', (req, res) => {
  try {
    const { projectId } = req.params;
    const { language, folder } = req.query;

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found', 
        message: 'Please upload a codebase first' 
      });
    }

    let files = getProjectFiles(projectId);

    // Apply filters
    if (language) {
      files = files.filter(f => f.language === language);
    }
    
    if (folder) {
      files = files.filter(f => f.folder.startsWith(folder));
    }

    // Return file list without content for lighter response
    const fileList = files.map(({ content, ...rest }) => rest);
    
    res.json({
      success: true,
      projectId,
      count: fileList.length,
      files: fileList
    });

  } catch (error) {
    console.error('Files error:', error);
    res.status(500).json({ 
      error: 'Failed to get project files', 
      message: error.message 
    });
  }
});

/**
 * Get folder structure of a project
 * GET /api/project/:projectId/folders
 */
router.get('/:projectId/folders', (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found', 
        message: 'Please upload a codebase first' 
      });
    }

    const files = getProjectFiles(projectId);
    const folders = getFolderStructure(files);
    
    res.json({
      success: true,
      projectId,
      folders
    });

  } catch (error) {
    console.error('Folders error:', error);
    res.status(500).json({ 
      error: 'Failed to get folder structure', 
      message: error.message 
    });
  }
});

/**
 * Get a specific file's content
 * GET /api/project/:projectId/file
 */
router.get('/:projectId/file', (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found', 
        message: 'Please upload a codebase first' 
      });
    }

    const files = getProjectFiles(projectId);
    const file = files.find(f => f.path === filePath);

    if (!file) {
      return res.status(404).json({ 
        error: 'File not found', 
        message: `File ${filePath} not found in project` 
      });
    }
    
    res.json({
      success: true,
      file
    });

  } catch (error) {
    console.error('File error:', error);
    res.status(500).json({ 
      error: 'Failed to get file', 
      message: error.message 
    });
  }
});

/**
 * Delete a project (memory + disk)
 * DELETE /api/project/:projectId
 */
router.delete('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    // Delete from memory (vector store)
    deleteProject(projectId);
    
    // Delete from disk
    await deleteProjectFiles(projectId);
    
    res.json({
      success: true,
      message: 'Project deleted successfully (memory + disk)'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete project', 
      message: error.message 
    });
  }
});

/**
 * Get disk usage statistics
 * GET /api/project/storage/usage
 */
router.get('/storage/usage', async (req, res) => {
  try {
    const usage = await getDiskUsage();
    
    res.json({
      success: true,
      usage
    });

  } catch (error) {
    console.error('Disk usage error:', error);
    res.status(500).json({ 
      error: 'Failed to get disk usage', 
      message: error.message 
    });
  }
});

/**
 * Clean up all projects (memory + disk)
 * DELETE /api/project/storage/cleanup
 */
router.delete('/storage/cleanup', async (req, res) => {
  try {
    // Get all project IDs and delete from memory
    const projectIds = getAllProjectIds();
    projectIds.forEach(id => deleteProject(id));
    
    // Delete all files from disk
    const diskCleanup = await deleteAllProjectFiles();
    
    res.json({
      success: true,
      message: 'All projects cleaned up',
      stats: {
        memoryCleared: projectIds.length,
        ...diskCleanup
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup projects', 
      message: error.message 
    });
  }
});

export default router;
