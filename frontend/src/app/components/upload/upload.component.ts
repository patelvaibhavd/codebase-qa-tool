import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ProjectStats } from '../../services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="upload-container">
      <!-- Tab Switcher -->
      <div class="tabs">
        <button 
          class="tab" 
          [class.active]="activeTab() === 'github'"
          (click)="activeTab.set('github')"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub URL
        </button>
        <button 
          class="tab" 
          [class.active]="activeTab() === 'zip'"
          (click)="activeTab.set('zip')"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload ZIP
        </button>
      </div>

      <!-- GitHub Tab -->
      @if (activeTab() === 'github') {
        <div class="tab-content">
          <div class="input-group">
            <input 
              type="text" 
              class="input github-input"
              placeholder="https://github.com/username/repository"
              [(ngModel)]="githubUrl"
              (keydown.enter)="uploadGithub()"
              [disabled]="isLoading()"
            />
            <button 
              class="btn btn-primary upload-btn"
              (click)="uploadGithub()"
              [disabled]="!githubUrl || isLoading()"
            >
              @if (isLoading()) {
                <span class="spinner"></span>
                Cloning...
              } @else {
                Analyze
              }
            </button>
          </div>
          <p class="hint">Enter a public GitHub repository URL</p>
        </div>
      }

      <!-- ZIP Tab -->
      @if (activeTab() === 'zip') {
        <div class="tab-content">
          <div 
            class="dropzone"
            [class.dragover]="isDragOver()"
            [class.has-file]="selectedFile()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            <input 
              #fileInput
              type="file" 
              accept=".zip"
              (change)="onFileSelected($event)"
              hidden
            />
            
            @if (selectedFile()) {
              <div class="file-info">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span class="file-name">{{ selectedFile()?.name }}</span>
                <span class="file-size">{{ formatSize(selectedFile()?.size || 0) }}</span>
              </div>
            } @else {
              <div class="dropzone-content">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p>Drop a ZIP file here or click to browse</p>
                <span class="hint">Max file size: 100MB</span>
              </div>
            }
          </div>
          
          @if (selectedFile()) {
            <button 
              class="btn btn-primary upload-btn full-width"
              (click)="uploadZip()"
              [disabled]="isLoading()"
            >
              @if (isLoading()) {
                <span class="spinner"></span>
                Processing...
              } @else {
                Analyze Codebase
              }
            </button>
          }
        </div>
      }

      <!-- Error Message -->
      @if (error()) {
        <div class="error-message animate-fade-in">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error() }}
        </div>
      }

      <!-- Success/Progress -->
      @if (isLoading()) {
        <div class="progress-info animate-fade-in">
          <div class="progress-steps">
            <div class="step" [class.active]="loadingStep() >= 1" [class.done]="loadingStep() > 1">
              <span class="step-icon">1</span>
              <span>{{ activeTab() === 'github' ? 'Cloning repository' : 'Extracting files' }}</span>
            </div>
            <div class="step" [class.active]="loadingStep() >= 2" [class.done]="loadingStep() > 2">
              <span class="step-icon">2</span>
              <span>Parsing codebase</span>
            </div>
            <div class="step" [class.active]="loadingStep() >= 3">
              <span class="step-icon">3</span>
              <span>Creating embeddings</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .upload-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
    }

    // Tabs
    .tabs {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
      background: var(--bg-tertiary);
      padding: var(--spacing-xs);
      border-radius: var(--radius-md);
    }

    .tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-primary);
      }

      &.active {
        background: var(--bg-secondary);
        color: var(--text-primary);
        box-shadow: var(--shadow-sm);
      }
    }

    // Tab Content
    .tab-content {
      animation: fadeIn var(--transition-fast) ease;
    }

    // Input Group
    .input-group {
      display: flex;
      gap: var(--spacing-sm);
    }

    .github-input {
      flex: 1;
    }

    .upload-btn {
      padding: var(--spacing-sm) var(--spacing-lg);
      white-space: nowrap;
      min-width: 120px;
    }

    .full-width {
      width: 100%;
      margin-top: var(--spacing-md);
    }

    .hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: var(--spacing-sm);
    }

    // Dropzone
    .dropzone {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-2xl);
      text-align: center;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover, &.dragover {
        border-color: var(--accent-primary);
        background: var(--accent-glow);
      }

      &.has-file {
        border-style: solid;
        border-color: var(--accent-primary);
        background: var(--accent-glow);
      }
    }

    .dropzone-content {
      color: var(--text-secondary);

      svg {
        margin-bottom: var(--spacing-md);
        color: var(--text-muted);
      }

      p {
        margin-bottom: var(--spacing-xs);
      }
    }

    .file-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--accent-primary);

      svg {
        color: var(--accent-primary);
      }
    }

    .file-name {
      font-weight: 500;
      color: var(--text-primary);
    }

    .file-size {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    // Error
    .error-message {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.3);
      border-radius: var(--radius-md);
      color: var(--error);
      font-size: 0.9rem;
    }

    // Progress
    .progress-info {
      margin-top: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
    }

    .progress-steps {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .step {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--text-muted);
      font-size: 0.9rem;

      &.active {
        color: var(--accent-primary);
        
        .step-icon {
          background: var(--accent-gradient);
          color: var(--bg-primary);
          animation: pulse 1.5s ease-in-out infinite;
        }
      }

      &.done {
        color: var(--success);
        
        .step-icon {
          background: var(--success);
          color: white;
        }
      }
    }

    .step-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-elevated);
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
    }

    // Spinner
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `]
})
export class UploadComponent {
  @Output() projectUploaded = new EventEmitter<{ projectId: string; stats: ProjectStats }>();

  activeTab = signal<'github' | 'zip'>('github');
  githubUrl = '';
  selectedFile = signal<File | null>(null);
  isLoading = signal(false);
  loadingStep = signal(0);
  error = signal<string | null>(null);
  isDragOver = signal(false);

  constructor(private apiService: ApiService) {}

  async uploadGithub() {
    if (!this.githubUrl || this.isLoading()) return;

    this.startLoading();

    try {
      this.loadingStep.set(1);
      const response = await this.apiService.uploadGithub(this.githubUrl).toPromise();
      
      this.loadingStep.set(3);
      
      if (response?.success) {
        this.projectUploaded.emit({
          projectId: response.projectId,
          stats: response.stats
        });
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to clone repository');
    } finally {
      this.isLoading.set(false);
      this.loadingStep.set(0);
    }
  }

  async uploadZip() {
    const file = this.selectedFile();
    if (!file || this.isLoading()) return;

    this.startLoading();

    try {
      this.loadingStep.set(1);
      await this.delay(500);
      this.loadingStep.set(2);
      
      const response = await this.apiService.uploadZip(file).toPromise();
      
      this.loadingStep.set(3);
      
      if (response?.success) {
        this.projectUploaded.emit({
          projectId: response.projectId,
          stats: response.stats
        });
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to process ZIP file');
    } finally {
      this.isLoading.set(false);
      this.loadingStep.set(0);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
      this.error.set(null);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files?.length) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        this.selectedFile.set(file);
        this.error.set(null);
      } else {
        this.error.set('Please drop a ZIP file');
      }
    }
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private startLoading() {
    this.isLoading.set(true);
    this.error.set(null);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

