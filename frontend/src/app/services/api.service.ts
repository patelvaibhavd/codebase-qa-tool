import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  success: boolean;
  projectId: string;
  message: string;
  stats: ProjectStats;
}

export interface ProjectStats {
  totalFiles: number;
  totalChunks: number;
  languages: string[];
  folders?: number;
}

export interface FileInfo {
  path: string;
  fileName: string;
  extension: string;
  language: string;
  lineCount: number;
  size: number;
  folder: string;
  structures?: CodeStructure[];
  content?: string;
}

export interface CodeStructure {
  type: string;
  name: string;
  line: number;
  lineContent: string;
}

export interface FolderInfo {
  path: string;
  files: { name: string; path: string; language: string; lineCount: number }[];
  fileCount: number;
  languages: string[];
}

export interface QAResponse {
  success: boolean;
  answer: string;
  references: CodeReference[];
  confidence: 'high' | 'medium' | 'low';
  relevantFiles: string[];
}

export interface CodeReference {
  file: string;
  fileName: string;
  startLine: number;
  endLine: number;
  language: string;
  folder: string;
  similarity: number;
  preview: string;
  isSummary: boolean;
}

export interface ProviderInfo {
  provider: string;
  name: string;
  chatModel: string | null;
  embeddingModel: string | null;
  isConfigured: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Upload Methods
  uploadZip(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('codebase', file);
    
    return this.http.post<UploadResponse>(`${this.baseUrl}/upload/zip`, formData)
      .pipe(catchError(this.handleError));
  }

  uploadGithub(repoUrl: string): Observable<UploadResponse> {
    return this.http.post<UploadResponse>(`${this.baseUrl}/upload/github`, { repoUrl })
      .pipe(catchError(this.handleError));
  }

  // Q&A Methods
  askQuestion(projectId: string, question: string, options?: { language?: string; folder?: string }): Observable<QAResponse> {
    return this.http.post<QAResponse>(`${this.baseUrl}/qa/ask`, {
      projectId,
      question,
      options
    }).pipe(catchError(this.handleError));
  }

  getSuggestions(projectId: string): Observable<{ suggestions: string[] }> {
    return this.http.get<{ success: boolean; suggestions: string[] }>(`${this.baseUrl}/qa/suggestions/${projectId}`)
      .pipe(
        map(res => ({ suggestions: res.suggestions })),
        catchError(this.handleError)
      );
  }

  explainFile(projectId: string, filePath: string): Observable<{ explanation: string; file: FileInfo }> {
    return this.http.post<{ success: boolean; explanation: string; file: FileInfo }>(`${this.baseUrl}/qa/explain-file`, {
      projectId,
      filePath
    }).pipe(catchError(this.handleError));
  }

  // Project Methods
  getProjectStats(projectId: string): Observable<ProjectStats> {
    return this.http.get<{ success: boolean; stats: ProjectStats }>(`${this.baseUrl}/project/${projectId}/stats`)
      .pipe(
        map(res => res.stats),
        catchError(this.handleError)
      );
  }

  getProjectFiles(projectId: string, language?: string, folder?: string): Observable<FileInfo[]> {
    let url = `${this.baseUrl}/project/${projectId}/files`;
    const params: string[] = [];
    
    if (language) params.push(`language=${encodeURIComponent(language)}`);
    if (folder) params.push(`folder=${encodeURIComponent(folder)}`);
    
    if (params.length) url += '?' + params.join('&');
    
    return this.http.get<{ success: boolean; files: FileInfo[] }>(url)
      .pipe(
        map(res => res.files),
        catchError(this.handleError)
      );
  }

  getProjectFolders(projectId: string): Observable<FolderInfo[]> {
    return this.http.get<{ success: boolean; folders: FolderInfo[] }>(`${this.baseUrl}/project/${projectId}/folders`)
      .pipe(
        map(res => res.folders),
        catchError(this.handleError)
      );
  }

  getFileContent(projectId: string, filePath: string): Observable<FileInfo> {
    return this.http.get<{ success: boolean; file: FileInfo }>(`${this.baseUrl}/project/${projectId}/file?path=${encodeURIComponent(filePath)}`)
      .pipe(
        map(res => res.file),
        catchError(this.handleError)
      );
  }

  deleteProject(projectId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/project/${projectId}`)
      .pipe(catchError(this.handleError));
  }

  // Health check
  healthCheck(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/health`)
      .pipe(catchError(this.handleError));
  }

  // Get AI provider info
  getProviderInfo(): Observable<ProviderInfo> {
    return this.http.get<ProviderInfo>(`${this.baseUrl}/provider`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    }
    
    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

