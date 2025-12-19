/**
 * AI Provider Service
 * Supports multiple AI backends: OpenAI, Ollama (free/local), Groq, and Demo mode
 * Configure via AI_PROVIDER environment variable
 */

import OpenAI from 'openai';

// Provider types
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  OLLAMA: 'ollama',
  GROQ: 'groq',
  DEMO: 'demo'
};

// Get current provider from environment
export function getProvider() {
  return process.env.AI_PROVIDER?.toLowerCase() || AI_PROVIDERS.DEMO;
}

// Provider configurations
const providerConfigs = {
  [AI_PROVIDERS.OPENAI]: {
    name: 'OpenAI',
    embeddingModel: 'text-embedding-3-small',
    chatModel: 'gpt-4o-mini',
    requiresKey: true,
    keyEnvVar: 'OPENAI_API_KEY'
  },
  [AI_PROVIDERS.OLLAMA]: {
    name: 'Ollama (Local)',
    embeddingModel: 'nomic-embed-text',
    chatModel: 'llama3.2',
    requiresKey: false,
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  },
  [AI_PROVIDERS.GROQ]: {
    name: 'Groq (Free Tier)',
    embeddingModel: null, // Groq doesn't support embeddings, use simple similarity
    chatModel: 'llama-3.1-8b-instant',
    requiresKey: true,
    keyEnvVar: 'GROQ_API_KEY'
  },
  [AI_PROVIDERS.DEMO]: {
    name: 'Demo Mode',
    embeddingModel: null,
    chatModel: null,
    requiresKey: false
  }
};

// Get current provider config
export function getProviderConfig() {
  const provider = getProvider();
  return {
    provider,
    ...providerConfigs[provider]
  };
}

// Singleton clients
let openaiClient = null;
let groqClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
}

function getGroqClient() {
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }
  return groqClient;
}

/**
 * Create embeddings for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export async function createEmbedding(text) {
  const provider = getProvider();
  const config = providerConfigs[provider];

  switch (provider) {
    case AI_PROVIDERS.OPENAI:
      return await createOpenAIEmbedding(text, config);
    
    case AI_PROVIDERS.OLLAMA:
      return await createOllamaEmbedding(text, config);
    
    case AI_PROVIDERS.GROQ:
    case AI_PROVIDERS.DEMO:
      // Use simple text-based similarity for providers without embedding support
      return createSimpleEmbedding(text);
    
    default:
      return createSimpleEmbedding(text);
  }
}

/**
 * Generate chat completion
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @returns {Promise<string>} Generated response
 */
export async function generateCompletion(systemPrompt, userPrompt) {
  const provider = getProvider();
  const config = providerConfigs[provider];

  switch (provider) {
    case AI_PROVIDERS.OPENAI:
      return await generateOpenAICompletion(systemPrompt, userPrompt, config);
    
    case AI_PROVIDERS.OLLAMA:
      return await generateOllamaCompletion(systemPrompt, userPrompt, config);
    
    case AI_PROVIDERS.GROQ:
      return await generateGroqCompletion(systemPrompt, userPrompt, config);
    
    case AI_PROVIDERS.DEMO:
      return generateDemoCompletion(userPrompt);
    
    default:
      return generateDemoCompletion(userPrompt);
  }
}

// ============ OpenAI Implementation ============

async function createOpenAIEmbedding(text, config) {
  try {
    const response = await getOpenAIClient().embeddings.create({
      model: config.embeddingModel,
      input: text.slice(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error.message);
    throw error;
  }
}

async function generateOpenAICompletion(systemPrompt, userPrompt, config) {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: config.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI completion error:', error.message);
    throw error;
  }
}

// ============ Ollama Implementation (Free/Local) ============

async function createOllamaEmbedding(text, config) {
  try {
    const response = await fetch(`${config.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.embeddingModel,
        prompt: text.slice(0, 8000)
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Ollama embedding error:', error.message);
    // Fallback to simple embedding if Ollama is not available
    console.warn('Falling back to simple embedding');
    return createSimpleEmbedding(text);
  }
}

async function generateOllamaCompletion(systemPrompt, userPrompt, config) {
  try {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Ollama completion error:', error.message);
    throw new Error('Ollama is not running. Start it with: ollama serve');
  }
}

// ============ Groq Implementation (Free Tier) ============

async function generateGroqCompletion(systemPrompt, userPrompt, config) {
  try {
    const response = await getGroqClient().chat.completions.create({
      model: config.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Groq completion error:', error.message);
    throw error;
  }
}

// ============ Demo/Fallback Implementation ============

/**
 * Create a simple embedding using TF-IDF-like approach
 * This is a basic implementation for demo purposes
 */
function createSimpleEmbedding(text) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Create a simple hash-based embedding (384 dimensions to match common models)
  const embedding = new Array(384).fill(0);
  
  words.forEach((word, idx) => {
    const hash = simpleHash(word);
    const position = Math.abs(hash) % 384;
    embedding[position] += 1 / (1 + idx * 0.1); // Weight by position
  });

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Generate a demo response based on context analysis
 */
function generateDemoCompletion(userPrompt) {
  // Extract the question and context from the prompt
  const questionMatch = userPrompt.match(/Question:\s*(.+?)(?:\n|$)/i);
  const question = questionMatch ? questionMatch[1] : 'your question';

  // Extract file references from context
  const fileMatches = userPrompt.matchAll(/File:\s*([^\n]+)/g);
  const files = Array.from(fileMatches).map(m => m[1]).slice(0, 3);

  // Generate a helpful demo response
  let response = `## Demo Mode Response\n\n`;
  response += `I analyzed your codebase to answer: "${question}"\n\n`;

  if (files.length > 0) {
    response += `### Relevant Files Found:\n`;
    files.forEach(file => {
      response += `- \`${file}\`\n`;
    });
    response += `\n`;
  }

  response += `### Analysis:\n`;
  response += `In **demo mode**, I'm providing a simulated response. `;
  response += `The semantic search found relevant code sections based on keyword matching.\n\n`;

  response += `To get AI-powered answers, configure one of these providers:\n\n`;
  response += `1. **Ollama (Free, Local)**\n`;
  response += `   - Install: \`brew install ollama\` or download from ollama.ai\n`;
  response += `   - Run: \`ollama serve\` then \`ollama pull llama3.2\`\n`;
  response += `   - Set: \`AI_PROVIDER=ollama\`\n\n`;
  response += `2. **Groq (Free Tier)**\n`;
  response += `   - Get API key from console.groq.com\n`;
  response += `   - Set: \`AI_PROVIDER=groq\` and \`GROQ_API_KEY=your-key\`\n\n`;
  response += `3. **OpenAI**\n`;
  response += `   - Set: \`AI_PROVIDER=openai\` and \`OPENAI_API_KEY=your-key\`\n`;

  return response;
}

/**
 * Get provider status and info
 */
export function getProviderStatus() {
  const provider = getProvider();
  const config = providerConfigs[provider];

  let status = {
    provider,
    name: config.name,
    isConfigured: true,
    message: ''
  };

  if (config.requiresKey) {
    const apiKey = process.env[config.keyEnvVar];
    status.isConfigured = !!apiKey;
    status.message = apiKey 
      ? `Using ${config.name} with ${config.chatModel}`
      : `Missing ${config.keyEnvVar} environment variable`;
  } else if (provider === AI_PROVIDERS.OLLAMA) {
    status.message = `Using Ollama at ${config.baseUrl}. Make sure Ollama is running.`;
  } else if (provider === AI_PROVIDERS.DEMO) {
    status.message = 'Demo mode - semantic search works, AI responses are simulated';
  }

  return status;
}

// Log provider info on module load
const status = getProviderStatus();
console.log(`\n🤖 AI Provider: ${status.name}`);
console.log(`   ${status.message}\n`);

