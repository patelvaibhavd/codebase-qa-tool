import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadComponent } from './components/upload/upload.component';
import { ChatComponent } from './components/chat/chat.component';
import { FileBrowserComponent } from './components/file-browser/file-browser.component';
import { ApiService, ProjectStats, ProviderInfo } from './services/api.service';

type Theme = 'dark' | 'light';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, UploadComponent, ChatComponent, FileBrowserComponent],
  template: `
    <div class="app-container">
      <!-- Header -->
      <header class="header">
        <div class="header-content">
          <div class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span class="logo-text">Code<span class="accent">Q</span></span>
          </div>
          <p class="tagline">AI-Powered Codebase Intelligence</p>
        </div>

        <div class="header-actions">
          <!-- Theme Toggle -->
          <button class="theme-toggle" (click)="toggleTheme()" [title]="theme() === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            @if (theme() === 'dark') {
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            }
          </button>
          
          @if (projectId()) {
            <div class="project-info animate-fade-in">
              <div class="project-badge">
                <span class="badge badge-accent">Active Project</span>
                <span class="project-stats font-mono">
                  {{ stats()?.totalFiles }} files · {{ stats()?.languages?.length }} languages
                </span>
              </div>
              <button class="btn btn-ghost" (click)="resetProject()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                New Project
              </button>
            </div>
          }
        </div>
      </header>

      <!-- Main Content -->
      <main class="main-content">
        @if (!projectId()) {
          <!-- Upload Section -->
          <div class="upload-section animate-slide-up">
            <div class="hero">
              <h1 class="hero-title">
                Understand Any Codebase
                <span class="gradient-text">Instantly</span>
              </h1>
              <p class="hero-description">
                Upload your repository or paste a GitHub URL. Ask questions in plain English 
                and get accurate answers with precise file and line references.
              </p>
            </div>
            
            <app-upload (projectUploaded)="onProjectUploaded($event)" />
            
            <div class="features">
              <div class="feature">
                <div class="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
                  </svg>
                </div>
                <h3>Natural Language Q&A</h3>
                <p>Ask questions like "What does this function do?" or "Where is auth handled?"</p>
              </div>
              <div class="feature">
                <div class="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <h3>File References</h3>
                <p>Get exact file paths and line numbers for every answer</p>
              </div>
              <div class="feature">
                <div class="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h3>Folder Indexing</h3>
                <p>Navigate and filter by folders, languages, or file types</p>
              </div>
            </div>
          </div>
        } @else {
          <!-- Q&A Interface -->
          <div class="qa-section">
            <div class="qa-layout">
              <aside class="sidebar animate-slide-up" [style.animation-delay]="'100ms'">
                <app-file-browser 
                  [projectId]="projectId()!" 
                  (fileSelected)="onFileSelected($event)"
                />
              </aside>
              
              <section class="chat-area animate-slide-up" [style.animation-delay]="'200ms'">
                <app-chat 
                  [projectId]="projectId()!"
                  [selectedFile]="selectedFile()"
                />
              </section>
            </div>
          </div>
        }
      </main>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-content">
          <p>Built with Angular + Node.js</p>
          @if (providerInfo()) {
            <div class="provider-badge" [class.demo]="providerInfo()?.provider === 'demo'">
              <span class="provider-dot"></span>
              {{ providerInfo()?.name }}
              @if (providerInfo()?.chatModel) {
                <span class="provider-model">{{ providerInfo()?.chatModel }}</span>
              }
            </div>
          }
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    // Header
    .header {
      padding: var(--spacing-md) var(--spacing-xl);
      border-bottom: 1px solid var(--border-color);
      background: var(--header-bg);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      transition: background-color var(--transition-normal);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      color: var(--accent-primary);
    }

    .logo-text {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .accent {
      color: var(--accent-primary);
    }

    .tagline {
      color: var(--text-muted);
      font-size: 0.85rem;
      padding-left: var(--spacing-lg);
      border-left: 1px solid var(--border-color);
    }

    // Theme Toggle
    .theme-toggle {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--accent-primary);
        border-color: var(--accent-primary);
        background: var(--accent-glow);
      }
    }

    .project-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .project-badge {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .project-stats {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    // Main Content
    .main-content {
      flex: 1;
      padding: var(--spacing-xl);
    }

    // Upload Section
    .upload-section {
      max-width: 900px;
      margin: 0 auto;
    }

    .hero {
      text-align: center;
      margin-bottom: var(--spacing-2xl);
    }

    .hero-title {
      font-size: 3rem;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: var(--spacing-md);
      letter-spacing: -0.03em;
    }

    .gradient-text {
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-description {
      font-size: 1.15rem;
      color: var(--text-secondary);
      max-width: 600px;
      margin: 0 auto;
    }

    // Features
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-lg);
      margin-top: var(--spacing-2xl);
    }

    .feature {
      text-align: center;
      padding: var(--spacing-lg);
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto var(--spacing-md);
      color: var(--accent-primary);
      background: var(--accent-glow);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      
      svg {
        width: 24px;
        height: 24px;
      }
    }

    .feature h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .feature p {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    // Q&A Section
    .qa-section {
      height: calc(100vh - 160px);
    }

    .qa-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: var(--spacing-lg);
      height: 100%;
    }

    .sidebar {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .chat-area {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    // Footer
    .footer {
      padding: var(--spacing-md);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }

    .footer-content {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--spacing-md);
    }

    .provider-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      font-size: 0.75rem;

      &.demo {
        border-color: var(--warning);
        background: rgba(210, 153, 34, 0.1);
        
        .provider-dot {
          background: var(--warning);
        }
      }
    }

    .provider-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
    }

    .provider-model {
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    // Responsive
    @media (max-width: 1024px) {
      .qa-layout {
        grid-template-columns: 1fr;
      }
      
      .sidebar {
        max-height: 300px;
      }
      
      .features {
        grid-template-columns: 1fr;
      }
      
      .hero-title {
        font-size: 2rem;
      }
      
      .tagline {
        display: none;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  projectId = signal<string | null>(null);
  stats = signal<ProjectStats | null>(null);
  selectedFile = signal<string | null>(null);
  providerInfo = signal<ProviderInfo | null>(null);
  theme = signal<Theme>('dark');

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadProviderInfo();
    this.initTheme();
  }

  initTheme() {
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('codeq-theme') as Theme | null;
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.setTheme('light');
    } else {
      this.setTheme('dark');
    }
  }

  toggleTheme() {
    const newTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('codeq-theme', theme);
  }

  loadProviderInfo() {
    this.apiService.getProviderInfo().subscribe({
      next: (info) => this.providerInfo.set(info),
      error: (err) => console.warn('Could not fetch provider info:', err)
    });
  }

  onProjectUploaded(data: { projectId: string; stats: ProjectStats }) {
    this.projectId.set(data.projectId);
    this.stats.set(data.stats);
  }

  onFileSelected(filePath: string) {
    this.selectedFile.set(filePath);
  }

  resetProject() {
    this.projectId.set(null);
    this.stats.set(null);
    this.selectedFile.set(null);
  }
}
