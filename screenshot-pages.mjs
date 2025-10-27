#!/usr/bin/env node

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const MAX_PAGES = 100; // Safety limit
const TIMEOUT = 60000; // 1 minute timeout per page

class PageScreenshotter {
  constructor() {
    this.visitedUrls = new Set();
    this.pendingUrls = ['/'];
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    this.outputDir = join(__dirname, 'screens', this.timestamp);
    this.browser = null;
    this.context = null;
    this.serverProcess = null;
    this.serverUrl = BASE_URL;
  }

  async init() {
    // Create output directory
    await mkdir(this.outputDir, { recursive: true });
    console.log(`📁 Screenshots will be saved to: ${this.outputDir}`);

    // Build the site
    console.log('🔨 Building site...');
    await this.runCommand('npm', ['run', 'build']);

    // Start preview server
    console.log('🚀 Starting preview server...');
    await this.startServer();

    // Wait for server to be ready
    await this.waitForServer();

    // Launch browser
    console.log('🌐 Launching browser...');
    this.browser = await chromium.launch({
      headless: true
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: __dirname,
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'preview'], {
        cwd: __dirname,
        stdio: 'pipe'
      });

      let resolved = false;

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        // Extract port from output
        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch && !resolved) {
          const port = portMatch[1];
          this.serverUrl = `http://localhost:${port}`;
          console.log(`✅ Detected server URL: ${this.serverUrl}`);
          resolved = true;
          setTimeout(() => resolve(), 1000);
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(output);

        // Also check stderr for port info
        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch && !resolved) {
          const port = portMatch[1];
          this.serverUrl = `http://localhost:${port}`;
          console.log(`✅ Detected server URL: ${this.serverUrl}`);
          resolved = true;
          setTimeout(() => resolve(), 1000);
        }
      });

      this.serverProcess.on('error', reject);

      // Timeout if server doesn't start
      setTimeout(() => {
        if (!resolved) {
          console.log('⚠️  Server start timeout, using default URL');
          resolve();
        }
      }, 10000);
    });
  }

  async waitForServer() {
    console.log(`⏳ Waiting for server at ${this.serverUrl} to be ready...`);
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(this.serverUrl);
        if (response.ok) {
          console.log('✅ Server is ready!');
          return;
        }
      } catch (e) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Server failed to start');
  }

  normalizeUrl(url) {
    try {
      const urlObj = new URL(url, this.serverUrl);
      // Only keep same-origin URLs
      if (urlObj.origin !== new URL(this.serverUrl).origin) {
        return null;
      }
      // Remove hash and trailing slash
      let path = urlObj.pathname;
      if (path.endsWith('/') && path.length > 1) {
        path = path.slice(0, -1);
      }
      return path;
    } catch (e) {
      return null;
    }
  }

  getScreenshotFilename(url) {
    let filename = url === '/' ? 'index' : url.slice(1).replace(/\//g, '_');
    // Remove invalid filename characters
    filename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${filename}.png`;
  }

  async extractLinks(page) {
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map(a => a.href);
    });

    const newUrls = [];
    for (const link of links) {
      const normalized = this.normalizeUrl(link);
      if (normalized && !this.visitedUrls.has(normalized) && !this.pendingUrls.includes(normalized)) {
        newUrls.push(normalized);
      }
    }

    return newUrls;
  }

  async screenshotPage(url) {
    const fullUrl = `${this.serverUrl}${url}`;
    console.log(`📸 Screenshotting: ${url}`);

    const page = await this.context.newPage();

    try {
      await page.goto(fullUrl, {
        waitUntil: 'networkidle',
        timeout: TIMEOUT
      });

      // Wait a bit for any animations
      await page.waitForTimeout(500);

      const filename = this.getScreenshotFilename(url);
      const filepath = join(this.outputDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true
      });

      console.log(`  ✅ Saved: ${filename}`);

      // Extract new links
      const newLinks = await this.extractLinks(page);
      this.pendingUrls.push(...newLinks);

      return true;
    } catch (error) {
      console.error(`  ❌ Error screenshotting ${url}:`, error.message);
      return false;
    } finally {
      await page.close();
    }
  }

  async crawlAndScreenshot() {
    let successCount = 0;
    let errorCount = 0;

    while (this.pendingUrls.length > 0 && this.visitedUrls.size < MAX_PAGES) {
      const url = this.pendingUrls.shift();

      if (this.visitedUrls.has(url)) {
        continue;
      }

      this.visitedUrls.add(url);
      const success = await this.screenshotPage(url);

      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    return { successCount, errorCount, total: this.visitedUrls.size };
  }

  async createIndex() {
    const urls = Array.from(this.visitedUrls).sort();
    const indexContent = {
      timestamp: this.timestamp,
      baseUrl: this.serverUrl,
      totalPages: urls.length,
      pages: urls.map(url => ({
        url,
        screenshot: this.getScreenshotFilename(url)
      }))
    };

    const indexPath = join(this.outputDir, 'index.json');
    await writeFile(indexPath, JSON.stringify(indexContent, null, 2));
    console.log(`\n📋 Index created: ${indexPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }

  async run() {
    try {
      await this.init();

      console.log('\n🔍 Starting crawl and screenshot process...\n');
      const results = await this.crawlAndScreenshot();

      await this.createIndex();

      console.log('\n✨ Summary:');
      console.log(`   📊 Total pages: ${results.total}`);
      console.log(`   ✅ Successful: ${results.successCount}`);
      console.log(`   ❌ Errors: ${results.errorCount}`);
      console.log(`   📁 Output: ${this.outputDir}\n`);

    } catch (error) {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the screenshotter
const screenshotter = new PageScreenshotter();
screenshotter.run().catch(console.error);
