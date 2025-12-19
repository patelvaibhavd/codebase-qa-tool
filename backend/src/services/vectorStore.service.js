import { createEmbedding } from './aiProvider.service.js';

// In-memory vector store for POC
// In production, use a proper vector database like Pinecone, Weaviate, or ChromaDB
const vectorStores = new Map();

/**
 * Chunk a file's content for better embedding
 */
function chunkContent(file) {
  const chunks = [];
  const lines = file.content.split('\n');
  const chunkSize = 50; // lines per chunk
  const overlap = 10; // overlap between chunks

  for (let i = 0; i < lines.length; i += chunkSize - overlap) {
    const chunkLines = lines.slice(i, i + chunkSize);
    const startLine = i + 1;
    const endLine = Math.min(i + chunkSize, lines.length);
    
    if (chunkLines.join('\n').trim().length > 0) {
      chunks.push({
        content: chunkLines.join('\n'),
        startLine,
        endLine,
        path: file.path,
        fileName: file.fileName,
        language: file.language,
        folder: file.folder
      });
    }
  }

  // Also add a summary chunk for the entire file
  const summary = createFileSummary(file);
  chunks.unshift({
    content: summary,
    startLine: 1,
    endLine: lines.length,
    path: file.path,
    fileName: file.fileName,
    language: file.language,
    folder: file.folder,
    isSummary: true
  });

  return chunks;
}

/**
 * Create a summary of a file for embedding
 */
function createFileSummary(file) {
  let summary = `File: ${file.path}\nLanguage: ${file.language}\n`;
  
  if (file.structures && file.structures.length > 0) {
    summary += '\nCode structures:\n';
    file.structures.forEach(s => {
      summary += `- ${s.type}: ${s.name} (line ${s.line})\n`;
    });
  }

  // Add first few lines as context
  const firstLines = file.content.split('\n').slice(0, 20).join('\n');
  summary += `\nContent preview:\n${firstLines}`;

  return summary;
}

/**
 * Index a project's files into the vector store
 * @param {string} projectId - Unique project identifier
 * @param {Array} files - Parsed files from the codebase
 */
export async function indexProject(projectId, files) {
  console.log(`📊 Indexing project ${projectId} with ${files.length} files...`);
  
  const vectors = [];
  let processedChunks = 0;
  let errors = 0;

  for (const file of files) {
    const chunks = chunkContent(file);
    
    for (const chunk of chunks) {
      try {
        const embedding = await createEmbedding(chunk.content);
        vectors.push({
          ...chunk,
          embedding
        });
        processedChunks++;
        
        // Progress logging
        if (processedChunks % 10 === 0) {
          console.log(`  Processed ${processedChunks} chunks...`);
        }
      } catch (error) {
        errors++;
        if (errors <= 3) {
          console.warn(`Warning: Could not embed chunk from ${chunk.path}:`, error.message);
        }
      }
    }
  }

  if (errors > 3) {
    console.warn(`  ... and ${errors - 3} more embedding errors`);
  }

  vectorStores.set(projectId, {
    vectors,
    files,
    indexedAt: new Date().toISOString(),
    stats: {
      totalFiles: files.length,
      totalChunks: vectors.length,
      languages: [...new Set(files.map(f => f.language))]
    }
  });

  console.log(`✅ Indexed ${vectors.length} chunks for project ${projectId}`);
  return vectorStores.get(projectId).stats;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Search for relevant code chunks
 * @param {string} projectId - Project to search in
 * @param {string} query - Search query
 * @param {Object} options - Search options (language filter, folder filter)
 * @returns {Promise<Array>} Relevant chunks with similarity scores
 */
export async function searchCode(projectId, query, options = {}) {
  const store = vectorStores.get(projectId);
  
  if (!store) {
    throw new Error(`Project ${projectId} not found. Please upload and index a codebase first.`);
  }

  const queryEmbedding = await createEmbedding(query);
  
  let results = store.vectors.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // Apply filters
  if (options.language) {
    results = results.filter(r => r.language === options.language);
  }
  
  if (options.folder) {
    results = results.filter(r => r.folder.startsWith(options.folder));
  }

  // Sort by similarity and return top results
  results.sort((a, b) => b.similarity - a.similarity);
  
  // Remove embedding from response to reduce payload size
  return results.slice(0, options.limit || 10).map(({ embedding, ...rest }) => rest);
}

/**
 * Get project stats
 */
export function getProjectStats(projectId) {
  const store = vectorStores.get(projectId);
  if (!store) return null;
  return store.stats;
}

/**
 * Get all files in a project
 */
export function getProjectFiles(projectId) {
  const store = vectorStores.get(projectId);
  if (!store) return null;
  return store.files;
}

/**
 * Check if project exists
 */
export function projectExists(projectId) {
  return vectorStores.has(projectId);
}

/**
 * Delete a project from the store
 */
export function deleteProject(projectId) {
  return vectorStores.delete(projectId);
}

/**
 * Get all project IDs
 */
export function getAllProjectIds() {
  return Array.from(vectorStores.keys());
}
