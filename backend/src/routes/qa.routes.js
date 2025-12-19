import express from 'express';
import { answerQuestion, getSuggestedQuestions, explainFile } from '../services/qa.service.js';
import { projectExists } from '../services/vectorStore.service.js';

const router = express.Router();

/**
 * Ask a question about the codebase
 * POST /api/qa/ask
 */
router.post('/ask', async (req, res) => {
  try {
    const { projectId, question, options = {} } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found', 
        message: 'Please upload a codebase first' 
      });
    }

    console.log(`❓ Question for project ${projectId}: "${question}"`);
    
    const result = await answerQuestion(projectId, question.trim(), options);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({ 
      error: 'Failed to answer question', 
      message: error.message 
    });
  }
});

/**
 * Get suggested questions for a project
 * GET /api/qa/suggestions/:projectId
 */
router.get('/suggestions/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found', 
        message: 'Please upload a codebase first' 
      });
    }

    const suggestions = await getSuggestedQuestions(projectId);

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ 
      error: 'Failed to get suggestions', 
      message: error.message 
    });
  }
});

/**
 * Explain a specific file
 * POST /api/qa/explain-file
 */
router.post('/explain-file', async (req, res) => {
  try {
    const { projectId, filePath } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    if (!projectExists(projectId)) {
      return res.status(404).json({ 
        error: 'Project not found', 
        message: 'Please upload a codebase first' 
      });
    }

    const result = await explainFile(projectId, filePath);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Explain file error:', error);
    res.status(500).json({ 
      error: 'Failed to explain file', 
      message: error.message 
    });
  }
});

export default router;

