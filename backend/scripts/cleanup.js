#!/usr/bin/env node
/**
 * Cleanup Script
 * Manually delete all project files from disk
 * 
 * Usage: node scripts/cleanup.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT_DIR, 'projects');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

async function cleanup() {
  console.log('\n🧹 CodeQ Cleanup Script\n');
  console.log('=' .repeat(40));

  let totalDeleted = 0;
  let totalSize = 0;

  // Clean projects directory
  console.log('\n📁 Cleaning projects directory...');
  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);
    
    for (const dir of projectDirs) {
      const dirPath = path.join(PROJECTS_DIR, dir);
      const size = await getDirectorySize(dirPath);
      totalSize += size;
      
      await fs.rm(dirPath, { recursive: true, force: true });
      console.log(`   ✓ Deleted: ${dir} (${formatBytes(size)})`);
      totalDeleted++;
    }
    
    if (projectDirs.length === 0) {
      console.log('   No projects to delete');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('   Projects directory does not exist');
    } else {
      console.error('   Error:', error.message);
    }
  }

  // Clean uploads directory
  console.log('\n📦 Cleaning uploads directory...');
  try {
    const uploadFiles = await fs.readdir(UPLOADS_DIR);
    
    for (const file of uploadFiles) {
      const filePath = path.join(UPLOADS_DIR, file);
      const stat = await fs.stat(filePath);
      totalSize += stat.size;
      
      await fs.rm(filePath, { force: true });
      console.log(`   ✓ Deleted: ${file} (${formatBytes(stat.size)})`);
      totalDeleted++;
    }
    
    if (uploadFiles.length === 0) {
      console.log('   No uploads to delete');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('   Uploads directory does not exist');
    } else {
      console.error('   Error:', error.message);
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(40));
  console.log(`✅ Cleanup complete!`);
  console.log(`   Items deleted: ${totalDeleted}`);
  console.log(`   Space freed: ${formatBytes(totalSize)}`);
  console.log('');
}

async function getDirectorySize(dirPath) {
  let size = 0;
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        size += stat.size;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run cleanup
cleanup().catch(console.error);

