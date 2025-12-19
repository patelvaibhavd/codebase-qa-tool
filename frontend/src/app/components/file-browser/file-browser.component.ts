import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, FileInfo, FolderInfo } from '../../services/api.service';

interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  language?: string;
  lineCount?: number;
  children?: TreeNode[];
  expanded?: boolean;
}

@Component({
  selector: 'app-file-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="file-browser">
      <!-- Header -->
      <div class="browser-header">
        <h3>Project Files</h3>
        <div class="file-count">{{ totalFiles() }} files</div>
      </div>

      <!-- Search -->
      <div class="search-box">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input 
          type="text" 
          placeholder="Search files..."
          [(ngModel)]="searchQuery"
          (input)="filterFiles()"
        />
      </div>

      <!-- Language Filter -->
      <div class="language-tabs">
        <button 
          class="lang-tab" 
          [class.active]="selectedLanguage() === ''"
          (click)="filterByLanguage('')"
        >
          All
        </button>
        @for (lang of languages(); track lang) {
          <button 
            class="lang-tab"
            [class.active]="selectedLanguage() === lang"
            (click)="filterByLanguage(lang)"
          >
            <span class="lang-dot" [style.background]="getLanguageColor(lang)"></span>
            {{ lang }}
          </button>
        }
      </div>

      <!-- File Tree -->
      <div class="file-tree">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading files...</span>
          </div>
        } @else if (filteredTree().length === 0) {
          <div class="empty-state">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <p>No files found</p>
          </div>
        } @else {
          @for (node of filteredTree(); track node.path) {
            <ng-container *ngTemplateOutlet="treeNodeTemplate; context: { node: node, level: 0 }"></ng-container>
          }
        }
      </div>

      <!-- Tree Node Template -->
      <ng-template #treeNodeTemplate let-node="node" let-level="level">
        <div 
          class="tree-node"
          [class.folder]="node.type === 'folder'"
          [class.file]="node.type === 'file'"
          [class.selected]="selectedFile() === node.path"
          [style.padding-left.px]="level * 16 + 12"
          (click)="selectNode(node)"
        >
          @if (node.type === 'folder') {
            <svg 
              class="chevron"
              [class.expanded]="node.expanded"
              viewBox="0 0 24 24" 
              width="14" 
              height="14" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2"
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <svg class="icon folder-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          } @else {
            <span class="chevron-placeholder"></span>
            <svg class="icon file-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          }
          <span class="node-name" [title]="node.name">{{ node.name }}</span>
          @if (node.type === 'file' && node.lineCount) {
            <span class="line-count">{{ node.lineCount }} lines</span>
          }
        </div>
        
        @if (node.type === 'folder' && node.expanded && node.children) {
          @for (child of node.children; track child.path) {
            <ng-container *ngTemplateOutlet="treeNodeTemplate; context: { node: child, level: level + 1 }"></ng-container>
          }
        }
      </ng-template>

      <!-- Stats Footer -->
      <div class="browser-footer">
        <div class="stat">
          <span class="stat-value">{{ languageStats().size }}</span>
          <span class="stat-label">languages</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ folderCount() }}</span>
          <span class="stat-label">folders</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .file-browser {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    // Header
    .browser-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);

      h3 {
        font-size: 0.9rem;
        font-weight: 600;
      }
    }

    .file-count {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    // Search
    .search-box {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin: var(--spacing-sm) var(--spacing-md);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);

      svg {
        color: var(--text-muted);
        flex-shrink: 0;
      }

      input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 0.85rem;

        &::placeholder {
          color: var(--text-muted);
        }

        &:focus {
          outline: none;
        }
      }
    }

    // Language Tabs - Wrapping design for many languages
    .language-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
      max-height: 100px;
      overflow-y: auto;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
      }
    }

    .lang-tab {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      color: var(--text-muted);
      font-size: 0.7rem;
      text-transform: capitalize;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-primary);
        border-color: var(--text-muted);
      }

      &.active {
        color: var(--accent-primary);
        background: var(--accent-glow);
        border-color: var(--accent-primary);
      }
    }

    .lang-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    // File Tree
    .file-tree {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-xs) 0;
    }

    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      cursor: pointer;
      transition: background var(--transition-fast);
      user-select: none;

      &:hover {
        background: var(--bg-tertiary);
      }

      &.selected {
        background: var(--accent-glow);
        
        .node-name {
          color: var(--accent-primary);
        }
      }
    }

    .chevron {
      flex-shrink: 0;
      color: var(--text-muted);
      transition: transform var(--transition-fast);

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .chevron-placeholder {
      width: 14px;
      flex-shrink: 0;
    }

    .icon {
      flex-shrink: 0;
      color: var(--text-muted);
    }

    .folder-icon {
      color: var(--syntax-variable);
    }

    .file-icon {
      color: var(--text-muted);
    }

    .node-name {
      flex: 1;
      font-size: 0.85rem;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      .folder & {
        color: var(--text-primary);
      }
    }

    .line-count {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    // States
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xl);
      color: var(--text-muted);
      text-align: center;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--border-color);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    // Footer
    .browser-footer {
      display: flex;
      justify-content: center;
      gap: var(--spacing-lg);
      padding: var(--spacing-md);
      border-top: 1px solid var(--border-color);
      background: var(--bg-tertiary);
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--accent-primary);
    }

    .stat-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }
  `]
})
export class FileBrowserComponent implements OnInit, OnChanges {
  @Input() projectId!: string;
  @Output() fileSelected = new EventEmitter<string>();

  files = signal<FileInfo[]>([]);
  folders = signal<FolderInfo[]>([]);
  tree = signal<TreeNode[]>([]);
  filteredTree = signal<TreeNode[]>([]);
  isLoading = signal(true);
  selectedFile = signal<string | null>(null);
  selectedLanguage = signal('');
  
  searchQuery = '';
  
  totalFiles = signal(0);
  folderCount = signal(0);
  languages = signal<string[]>([]);
  languageStats = signal<Map<string, number>>(new Map());

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadFiles();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['projectId'] && this.projectId) {
      this.loadFiles();
    }
  }

  loadFiles() {
    this.isLoading.set(true);

    this.apiService.getProjectFiles(this.projectId).subscribe({
      next: (files) => {
        this.files.set(files);
        this.totalFiles.set(files.length);
        this.buildTree(files);
        this.extractLanguages(files);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load files:', err);
        this.isLoading.set(false);
      }
    });

    this.apiService.getProjectFolders(this.projectId).subscribe({
      next: (folders) => {
        this.folders.set(folders);
        this.folderCount.set(folders.length);
      }
    });
  }

  buildTree(files: FileInfo[]) {
    const root: Map<string, TreeNode> = new Map();

    files.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFile = index === parts.length - 1;

        if (!root.has(currentPath)) {
          const node: TreeNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            language: isFile ? file.language : undefined,
            lineCount: isFile ? file.lineCount : undefined,
            children: isFile ? undefined : [],
            expanded: index === 0 // Expand first level
          };

          root.set(currentPath, node);

          if (parentPath && root.has(parentPath)) {
            root.get(parentPath)!.children!.push(node);
          }
        }
      });
    });

    // Get top-level nodes
    const topLevel = Array.from(root.values()).filter(node => !node.path.includes('/'));
    
    // Sort: folders first, then files, alphabetically
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }).map(node => {
        if (node.children) {
          node.children = sortNodes(node.children);
        }
        return node;
      });
    };

    this.tree.set(sortNodes(topLevel));
    this.filteredTree.set(this.tree());
  }

  extractLanguages(files: FileInfo[]) {
    const langCount = new Map<string, number>();
    
    files.forEach(file => {
      if (file.language && file.language !== 'unknown') {
        langCount.set(file.language, (langCount.get(file.language) || 0) + 1);
      }
    });

    this.languageStats.set(langCount);
    this.languages.set(Array.from(langCount.keys()).sort());
  }

  filterByLanguage(language: string) {
    this.selectedLanguage.set(language);
    this.filterFiles();
  }

  filterFiles() {
    const query = this.searchQuery.toLowerCase();
    const lang = this.selectedLanguage();

    if (!query && !lang) {
      this.filteredTree.set(this.tree());
      return;
    }

    const filterNode = (node: TreeNode): TreeNode | null => {
      if (node.type === 'file') {
        const matchesSearch = !query || node.name.toLowerCase().includes(query);
        const matchesLang = !lang || node.language === lang;
        return matchesSearch && matchesLang ? node : null;
      }

      // For folders, filter children
      const filteredChildren = node.children
        ?.map(child => filterNode(child))
        .filter((child): child is TreeNode => child !== null);

      if (filteredChildren && filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          expanded: true
        };
      }

      return null;
    };

    const filtered = this.tree()
      .map(node => filterNode(node))
      .filter((node): node is TreeNode => node !== null);

    this.filteredTree.set(filtered);
  }

  selectNode(node: TreeNode) {
    if (node.type === 'folder') {
      node.expanded = !node.expanded;
      // Trigger change detection
      this.filteredTree.set([...this.filteredTree()]);
    } else {
      this.selectedFile.set(node.path);
      this.fileSelected.emit(node.path);
    }
  }

  getLanguageColor(language: string): string {
    const colors: Record<string, string> = {
      typescript: '#3178c6',
      javascript: '#f7df1e',
      markdown: '#083fa1',
      json: '#292929',
      html: '#e34c26',
      css: '#563d7c',
      scss: '#c6538c'
    };
    return colors[language] || '#6e7681';
  }
}

