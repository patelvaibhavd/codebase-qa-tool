import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, QAResponse, CodeReference } from '../../services/api.service';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  references?: CodeReference[];
  confidence?: 'high' | 'medium' | 'low';
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        <h2>Ask About Your Code</h2>
        <div class="filters">
          <select class="filter-select" [(ngModel)]="languageFilter" (change)="onFilterChange()">
            <option value="">All Languages</option>
            @for (lang of languages(); track lang) {
              <option [value]="lang">{{ lang | titlecase }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Messages -->
      <div class="messages" #messagesContainer>
        @if (messages().length === 0) {
          <div class="welcome-state">
            <div class="welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
              </svg>
            </div>
            <h3>Start Exploring Your Codebase</h3>
            <p>Ask any question about the code structure, functions, or implementation details.</p>
            
            @if (suggestions().length > 0) {
              <div class="suggestions">
                <span class="suggestions-label">Try asking:</span>
                @for (suggestion of suggestions(); track suggestion) {
                  <button class="suggestion-chip" (click)="askSuggestion(suggestion)">
                    {{ suggestion }}
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          @for (message of messages(); track message.timestamp) {
            <div class="message" [class]="message.type">
              @if (message.type === 'user') {
                <div class="message-content user-message">
                  {{ message.content }}
                </div>
              } @else {
                <div class="message-content assistant-message">
                  @if (message.confidence) {
                    <div class="confidence-badge" [class]="message.confidence">
                      <span class="dot"></span>
                      {{ message.confidence }} confidence
                    </div>
                  }
                  
                  <div class="answer-text" [innerHTML]="formatAnswer(message.content)"></div>
                  
                  @if (message.references && message.references.length > 0) {
                    <div class="references">
                      <span class="references-label">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        References
                      </span>
                      @for (ref of message.references.slice(0, 5); track ref.file + ref.startLine) {
                        <button class="reference-chip" (click)="viewReference(ref)">
                          <span class="ref-file">{{ ref.fileName }}</span>
                          <span class="ref-lines">:{{ ref.startLine }}-{{ ref.endLine }}</span>
                          <span class="ref-similarity">{{ ref.similarity }}%</span>
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
          
          @if (isLoading()) {
            <div class="message assistant">
              <div class="message-content assistant-message loading">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span class="loading-text">Analyzing codebase...</span>
              </div>
            </div>
          }
        }
      </div>

      <!-- Reference Preview Modal -->
      @if (selectedReference()) {
        <div class="reference-modal" (click)="closeReference()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">
                <span class="file-path">{{ selectedReference()?.file }}</span>
                <span class="line-range">Lines {{ selectedReference()?.startLine }}-{{ selectedReference()?.endLine }}</span>
              </div>
              <button class="close-btn" (click)="closeReference()">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <pre class="code-preview"><code>{{ selectedReference()?.preview }}</code></pre>
          </div>
        </div>
      }

      <!-- Input Area -->
      <div class="input-area">
        @if (selectedFile) {
          <div class="context-badge">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            </svg>
            Context: {{ selectedFile }}
            <button class="clear-context" (click)="clearContext()">×</button>
          </div>
        }
        <div class="input-wrapper">
          <textarea 
            class="chat-input"
            placeholder="Ask a question about the codebase..."
            [(ngModel)]="question"
            (keydown)="onKeyDown($event)"
            [disabled]="isLoading()"
            rows="1"
            #inputField
          ></textarea>
          <button 
            class="send-btn" 
            (click)="sendQuestion()"
            [disabled]="!question.trim() || isLoading()"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    // Header
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);

      h2 {
        font-size: 1rem;
        font-weight: 600;
      }
    }

    .filter-select {
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.8rem;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: var(--accent-primary);
      }
    }

    // Messages
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    // Welcome State
    .welcome-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      height: 100%;
      padding: var(--spacing-xl);
    }

    .welcome-icon {
      width: 64px;
      height: 64px;
      margin-bottom: var(--spacing-md);
      color: var(--accent-primary);
      opacity: 0.5;
    }

    .welcome-state h3 {
      font-size: 1.2rem;
      margin-bottom: var(--spacing-sm);
    }

    .welcome-state p {
      color: var(--text-secondary);
      max-width: 400px;
    }

    .suggestions {
      margin-top: var(--spacing-lg);
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      justify-content: center;
    }

    .suggestions-label {
      width: 100%;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .suggestion-chip {
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }
    }

    // Message
    .message {
      display: flex;
      animation: slideUp var(--transition-normal) ease;

      &.user {
        justify-content: flex-end;
      }
    }

    .message-content {
      max-width: 85%;
      padding: var(--spacing-md);
      border-radius: var(--radius-lg);
    }

    .user-message {
      background: var(--accent-gradient);
      color: var(--bg-primary);
      border-bottom-right-radius: var(--radius-sm);
    }

    .assistant-message {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-bottom-left-radius: var(--radius-sm);
    }

    // Confidence Badge
    .confidence-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 500;
      border-radius: var(--radius-full);
      margin-bottom: var(--spacing-sm);
      text-transform: uppercase;
      letter-spacing: 0.5px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      &.high {
        background: rgba(63, 185, 80, 0.15);
        color: var(--success);
        .dot { background: var(--success); }
      }

      &.medium {
        background: rgba(210, 153, 34, 0.15);
        color: var(--warning);
        .dot { background: var(--warning); }
      }

      &.low {
        background: rgba(248, 81, 73, 0.15);
        color: var(--error);
        .dot { background: var(--error); }
      }
    }

    .answer-text {
      line-height: 1.7;
      font-size: 0.95rem;

      :deep(code) {
        background: var(--bg-elevated);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.85em;
        color: var(--syntax-function);
      }

      :deep(pre) {
        background: var(--bg-elevated);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        overflow-x: auto;
        margin: var(--spacing-sm) 0;

        code {
          background: none;
          padding: 0;
        }
      }
    }

    // References
    .references {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--border-color);
    }

    .references-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-sm);
    }

    .reference-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      margin: 2px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--accent-primary);
        color: var(--text-primary);
      }

      .ref-file {
        color: var(--accent-primary);
      }

      .ref-lines {
        color: var(--text-muted);
      }

      .ref-similarity {
        color: var(--text-muted);
        font-size: 0.7rem;
      }
    }

    // Loading
    .message-content.loading {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .typing-indicator {
      display: flex;
      gap: 4px;

      span {
        width: 8px;
        height: 8px;
        background: var(--accent-primary);
        border-radius: 50%;
        animation: bounce 1.4s ease-in-out infinite;

        &:nth-child(1) { animation-delay: 0s; }
        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }

    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    .loading-text {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    // Reference Modal
    .reference-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn var(--transition-fast) ease;
    }

    .modal-content {
      width: 90%;
      max-width: 700px;
      max-height: 80vh;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
      animation: slideUp var(--transition-normal) ease;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
    }

    .modal-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .file-path {
      font-family: var(--font-mono);
      font-size: 0.9rem;
      color: var(--accent-primary);
    }

    .line-range {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .close-btn {
      padding: var(--spacing-xs);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius-sm);

      &:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
      }
    }

    .code-preview {
      padding: var(--spacing-lg);
      margin: 0;
      overflow-x: auto;
      max-height: 60vh;
      background: var(--bg-tertiary);

      code {
        font-family: var(--font-mono);
        font-size: 0.85rem;
        line-height: 1.6;
        white-space: pre;
      }
    }

    // Input Area
    .input-area {
      padding: var(--spacing-md) var(--spacing-lg);
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }

    .context-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 4px 8px;
      margin-bottom: var(--spacing-sm);
      background: var(--accent-glow);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--accent-primary);

      .clear-context {
        margin-left: 4px;
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;

        &:hover {
          color: var(--text-primary);
        }
      }
    }

    .input-wrapper {
      display: flex;
      gap: var(--spacing-sm);
      align-items: flex-end;
    }

    .chat-input {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.95rem;
      resize: none;
      min-height: 44px;
      max-height: 120px;

      &::placeholder {
        color: var(--text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px var(--accent-glow);
      }
    }

    .send-btn {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-gradient);
      border: none;
      border-radius: var(--radius-md);
      color: var(--bg-primary);
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;

      &:hover:not(:disabled) {
        box-shadow: var(--shadow-glow);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `]
})
export class ChatComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() projectId!: string;
  @Input() selectedFile: string | null = null;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('inputField') inputField!: ElementRef;

  messages = signal<Message[]>([]);
  suggestions = signal<string[]>([]);
  languages = signal<string[]>([]);
  isLoading = signal(false);
  selectedReference = signal<CodeReference | null>(null);
  
  question = '';
  languageFilter = '';
  private shouldScrollToBottom = false;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadSuggestions();
    this.loadLanguages();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['projectId'] && this.projectId) {
      this.loadSuggestions();
      this.loadLanguages();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadSuggestions() {
    this.apiService.getSuggestions(this.projectId).subscribe({
      next: (res) => this.suggestions.set(res.suggestions),
      error: (err) => console.error('Failed to load suggestions:', err)
    });
  }

  loadLanguages() {
    this.apiService.getProjectStats(this.projectId).subscribe({
      next: (stats) => this.languages.set(stats.languages),
      error: (err) => console.error('Failed to load languages:', err)
    });
  }

  askSuggestion(suggestion: string) {
    this.question = suggestion;
    this.sendQuestion();
  }

  sendQuestion() {
    if (!this.question.trim() || this.isLoading()) return;

    const userQuestion = this.question.trim();
    this.question = '';

    // Add user message
    this.messages.update(msgs => [...msgs, {
      type: 'user',
      content: userQuestion,
      timestamp: new Date()
    }]);

    this.isLoading.set(true);
    this.shouldScrollToBottom = true;

    const options: { language?: string; folder?: string } = {};
    if (this.languageFilter) options.language = this.languageFilter;
    if (this.selectedFile) options.folder = this.selectedFile.split('/').slice(0, -1).join('/');

    this.apiService.askQuestion(this.projectId, userQuestion, options).subscribe({
      next: (response) => {
        this.messages.update(msgs => [...msgs, {
          type: 'assistant',
          content: response.answer,
          references: response.references,
          confidence: response.confidence,
          timestamp: new Date()
        }]);
        this.isLoading.set(false);
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        this.messages.update(msgs => [...msgs, {
          type: 'assistant',
          content: `Sorry, I encountered an error: ${err.message}`,
          timestamp: new Date()
        }]);
        this.isLoading.set(false);
        this.shouldScrollToBottom = true;
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendQuestion();
    }
  }

  viewReference(ref: CodeReference) {
    this.selectedReference.set(ref);
  }

  closeReference() {
    this.selectedReference.set(null);
  }

  clearContext() {
    this.selectedFile = null;
  }

  onFilterChange() {
    // Filter change just updates the state, next question will use it
  }

  formatAnswer(text: string): string {
    // Simple markdown-like formatting
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom() {
    try {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {}
  }
}

