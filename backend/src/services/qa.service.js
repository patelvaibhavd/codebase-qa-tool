import { generateCompletion, getProviderConfig } from './aiProvider.service.js';
import { searchCode, getProjectFiles } from './vectorStore.service.js';

/**
 * Answer a question about the codebase
 * @param {string} projectId - Project identifier
 * @param {string} question - User's question
 * @param {Object} options - Options (language filter, folder filter)
 * @returns {Promise<Object>} Answer with references
 */
export async function answerQuestion(projectId, question, options = {}) {
  console.log(`🤔 Processing question for project ${projectId}: "${question}"`);

  // Search for relevant code chunks
  const relevantChunks = await searchCode(projectId, question, {
    ...options,
    limit: 8
  });

  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find any relevant code in the codebase to answer your question. Please make sure the codebase is properly indexed.",
      references: [],
      confidence: 'low'
    };
  }

  // Build context from relevant chunks
  const context = buildContext(relevantChunks);
  
  // Generate answer using configured AI provider
  const answer = await generateAnswer(question, context, options);

  // Extract and format references
  const references = formatReferences(relevantChunks);

  return {
    answer,
    references,
    confidence: relevantChunks[0].similarity > 0.8 ? 'high' : 
                relevantChunks[0].similarity > 0.6 ? 'medium' : 'low',
    relevantFiles: [...new Set(relevantChunks.map(c => c.path))],
    provider: getProviderConfig().name
  };
}

/**
 * Build context string from relevant chunks
 */
function buildContext(chunks) {
  let context = '';
  
  chunks.forEach((chunk, index) => {
    context += `\n--- File: ${chunk.path} (lines ${chunk.startLine}-${chunk.endLine}) ---\n`;
    context += chunk.content;
    context += '\n';
  });

  return context;
}

/**
 * Generate answer using configured AI provider
 */
async function generateAnswer(question, context, options) {
  const systemPrompt = `You are a helpful code assistant analyzing a codebase. Your job is to answer questions about the code accurately and helpfully.

Guidelines:
- Always reference specific files and line numbers when discussing code
- Explain code in clear, understandable terms
- If you're not sure about something, say so
- Provide code examples when helpful
- Focus on the most relevant parts of the code for the question
- If asked about specific functions or features, explain what they do and how they work`;

  const userPrompt = `Based on the following code context from the codebase, please answer this question:

Question: ${question}

Code Context:
${context}

Please provide a clear, detailed answer with specific file and line references where applicable.`;

  try {
    return await generateCompletion(systemPrompt, userPrompt);
  } catch (error) {
    console.error('Error generating answer:', error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

/**
 * Format references for the response
 */
function formatReferences(chunks) {
  return chunks.map(chunk => ({
    file: chunk.path,
    fileName: chunk.fileName,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    language: chunk.language,
    folder: chunk.folder,
    similarity: Math.round(chunk.similarity * 100),
    preview: chunk.content.split('\n').slice(0, 5).join('\n'),
    isSummary: chunk.isSummary || false
  }));
}

/**
 * Get suggested questions based on the codebase
 */
export async function getSuggestedQuestions(projectId) {
  const files = getProjectFiles(projectId);
  
  if (!files || files.length === 0) {
    return [];
  }

  const suggestions = [];

  // Analyze the codebase to generate relevant questions
  const hasComponents = files.some(f => f.structures?.some(s => s.type === 'component'));
  const hasClasses = files.some(f => f.structures?.some(s => s.type === 'class'));
  const hasInterfaces = files.some(f => f.structures?.some(s => s.type === 'interface'));
  const languages = [...new Set(files.map(f => f.language))];

  // Generic questions
  suggestions.push('What is the overall architecture of this codebase?');
  suggestions.push('What are the main entry points of this application?');

  // Language-specific questions
  if (languages.includes('typescript') || languages.includes('javascript')) {
    suggestions.push('Where is the main configuration located?');
    suggestions.push('How is error handling implemented?');
  }

  // Structure-specific questions
  if (hasComponents) {
    suggestions.push('What are the main UI components in this project?');
  }
  
  if (hasClasses) {
    suggestions.push('What are the main classes and their responsibilities?');
  }
  
  if (hasInterfaces) {
    suggestions.push('What data models or interfaces are defined?');
  }

  // Authentication/Security
  suggestions.push('Where is authentication handled?');
  suggestions.push('How is data validation implemented?');

  return suggestions.slice(0, 8);
}

/**
 * Explain a specific file
 */
export async function explainFile(projectId, filePath) {
  const files = getProjectFiles(projectId);
  const file = files?.find(f => f.path === filePath);

  if (!file) {
    throw new Error(`File ${filePath} not found in project`);
  }

  const systemPrompt = `You are a code documentation expert. Analyze the given code file and provide a clear, structured explanation.`;

  const userPrompt = `Please analyze and explain this ${file.language} file:

File: ${file.path}

\`\`\`${file.language}
${file.content}
\`\`\`

Provide:
1. A brief overview of what this file does
2. Key functions/classes and their purposes
3. How this file likely fits into the larger application
4. Any notable patterns or best practices used`;

  try {
    const explanation = await generateCompletion(systemPrompt, userPrompt);
    
    return {
      explanation,
      file: {
        path: file.path,
        fileName: file.fileName,
        language: file.language,
        lineCount: file.lineCount,
        structures: file.structures
      },
      provider: getProviderConfig().name
    };
  } catch (error) {
    console.error('Error explaining file:', error.message);
    throw error;
  }
}
