import JSZip from 'jszip';
import { 
  ProjectFile, 
  FrameworkDetection, 
  DatabaseDetection, 
  AuditIssue,
  FrameworkType 
} from '../types';

export interface AnalysisResult {
  files: Map<string, ProjectFile>;
  fileCount: number;
  totalSize: number;
  framework: FrameworkDetection;
  database: DatabaseDetection;
  auditIssues: AuditIssue[];
  envKeys: string[];
  suggestedVercelJson: string;
  hasExpressServer: boolean;
  serverEntryFile?: string;
  projectName: string;
}

export async function extractAndAnalyzeZip(
  fileOrBuffer: File | ArrayBuffer,
  fileName: string = 'project.zip'
): Promise<AnalysisResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileOrBuffer);
  
  const files = new Map<string, ProjectFile>();
  let totalSize = 0;

  // Extract all files except massive bloat
  const fileEntries = Object.keys(loadedZip.files);
  for (const path of fileEntries) {
    const zipEntry = loadedZip.files[path];
    if (zipEntry.dir) continue;

    // Skip node_modules and .git folders for memory and speed
    if (path.includes('node_modules/') || path.includes('.git/')) {
      continue;
    }

    // Determine if binary
    const isBinary = /\.(png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|tar|gz|woff|woff2|ttf|eot|mp4|webm|mp3)$/i.test(path);
    
    let content = '';
    if (isBinary) {
      // Just record placeholder or base64 if small
      content = '[Binary Data]';
    } else {
      try {
        content = await zipEntry.async('text');
      } catch {
        content = '[Unable to parse text]';
      }
    }

    const size = (zipEntry as any)._data ? (zipEntry as any)._data.uncompressedSize || content.length : content.length;
    totalSize += size;

    files.set(path, {
      name: path.split('/').pop() || path,
      path,
      content,
      isBinary,
      size,
    });
  }

  // Find root package.json or detect subdirectories
  let rootPackageJson: any = null;
  const packageFiles: { path: string; data: any }[] = [];

  for (const [path, file] of files.entries()) {
    if (path.endsWith('package.json') && !file.isBinary) {
      try {
        const parsed = JSON.parse(file.content);
        packageFiles.push({ path, data: parsed });
        if (path === 'package.json' || !rootPackageJson) {
          rootPackageJson = parsed;
        }
      } catch {
        // ignore parse error
      }
    }
  }

  // Extract project name from file name or package.json
  const defaultName = fileName.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || 'fullstack-app';
  const projectName = rootPackageJson?.name || defaultName;

  // Detect Framework
  const framework = detectFramework(files, packageFiles, rootPackageJson);

  // Detect Database & ORM
  const database = detectDatabase(files, packageFiles);

  // Scan Environment Variables
  const envKeys = scanEnvironmentVariables(files);

  // Check for Express server and entry point
  const { hasExpressServer, serverEntryFile } = detectExpressServer(files);

  // Run Audit
  const auditIssues = runAuditChecks(files, framework, database, hasExpressServer, serverEntryFile, envKeys);

  // Generate Suggested vercel.json
  const suggestedVercelJson = generateDefaultVercelConfig(framework, hasExpressServer, serverEntryFile);

  return {
    files,
    fileCount: files.size,
    totalSize,
    framework,
    database,
    auditIssues,
    envKeys,
    suggestedVercelJson,
    hasExpressServer,
    serverEntryFile,
    projectName,
  };
}

function detectFramework(
  files: Map<string, ProjectFile>,
  packageFiles: { path: string; data: any }[],
  rootPkg: any
): FrameworkDetection {
  const allDeps = new Set<string>();
  packageFiles.forEach(p => {
    if (p.data.dependencies) Object.keys(p.data.dependencies).forEach(d => allDeps.add(d));
    if (p.data.devDependencies) Object.keys(p.data.devDependencies).forEach(d => allDeps.add(d));
  });

  const subdirectories = Array.from(files.keys()).map(k => k.split('/')[0]).filter(Boolean);
  const uniqueSubdirs = Array.from(new Set(subdirectories));
  const isMonorepo = uniqueSubdirs.some(d => ['client', 'frontend', 'server', 'backend', 'api', 'apps', 'packages'].includes(d.toLowerCase())) && packageFiles.length > 1;

  // Check Next.js
  if (allDeps.has('next') || Array.from(files.keys()).some(k => k.includes('next.config.'))) {
    return {
      type: 'nextjs',
      name: 'Next.js (Full Stack)',
      description: 'Zero-config native support on Vercel with automatic API Routes and Server Components.',
      badgeColor: 'bg-black text-white border-zinc-700',
      hasFrontend: true,
      hasBackend: true,
      buildScript: rootPkg?.scripts?.build || 'next build',
      startScript: rootPkg?.scripts?.start || 'next start',
      outputDirectory: '.next',
      isMonorepo,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  // Check Vite + React + Express / Node backend
  const hasVite = allDeps.has('vite') || Array.from(files.keys()).some(k => k.includes('vite.config.'));
  const hasReact = allDeps.has('react');
  const hasExpress = allDeps.has('express') || allDeps.has('fastify') || allDeps.has('koa');

  if (hasVite && hasExpress) {
    const frontendPath = files.has('client/package.json') ? 'client' : (files.has('frontend/package.json') ? 'frontend' : '.');
    const backendPath = files.has('server/package.json') ? 'server' : (files.has('backend/package.json') ? 'backend' : 'api');
    return {
      type: 'vite-react-express',
      name: 'Vite React + Express Backend',
      description: 'Modern full-stack setup. Requires Vercel Serverless Function adapter or /api rewrite for Express.',
      badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
      hasFrontend: true,
      hasBackend: true,
      frontendPath,
      backendPath,
      buildScript: rootPkg?.scripts?.build || 'npm run build',
      outputDirectory: 'dist',
      isMonorepo,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  // Check Remix
  if (allDeps.has('@remix-run/react') || allDeps.has('@remix-run/node')) {
    return {
      type: 'remix',
      name: 'Remix Full Stack',
      description: 'Full stack React framework with edge and serverless routing.',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
      hasFrontend: true,
      hasBackend: true,
      buildScript: rootPkg?.scripts?.build || 'remix build',
      outputDirectory: 'build',
      isMonorepo,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  // Check Nuxt
  if (allDeps.has('nuxt') || allDeps.has('nuxt3')) {
    return {
      type: 'nuxt',
      name: 'Nuxt (Vue Full Stack)',
      description: 'Full stack Vue framework with Nitro engine, first-class Vercel preset.',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
      hasFrontend: true,
      hasBackend: true,
      buildScript: rootPkg?.scripts?.build || 'nuxt build',
      outputDirectory: '.output',
      isMonorepo,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  // Check SvelteKit
  if (allDeps.has('@sveltejs/kit')) {
    return {
      type: 'sveltekit',
      name: 'SvelteKit Full Stack',
      description: 'Svelte full stack app. Uses @sveltejs/adapter-vercel for Vercel deployment.',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-700',
      hasFrontend: true,
      hasBackend: true,
      buildScript: rootPkg?.scripts?.build || 'vite build',
      outputDirectory: '.svelte-kit/output',
      isMonorepo,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  // Check Astro
  if (allDeps.has('astro')) {
    return {
      type: 'astro',
      name: 'Astro Web App',
      description: 'Content-focused framework with optional SSR server adapter.',
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-700',
      hasFrontend: true,
      hasBackend: allDeps.has('@astrojs/vercel'),
      buildScript: rootPkg?.scripts?.build || 'astro build',
      outputDirectory: 'dist',
      isMonorepo,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  // Check Express standalone API
  if (hasExpress && !hasReact && !hasVite) {
    return {
      type: 'express-standalone',
      name: 'Express.js Backend API',
      description: 'Node.js Express backend. Can deploy to Vercel via Serverless API adapter or Render/Railway for persistent container.',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
      hasFrontend: false,
      hasBackend: true,
      startScript: rootPkg?.scripts?.start || 'node index.js',
      outputDirectory: '',
      isMonorepo: false,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  // Check Vite SPA
  if (hasVite) {
    return {
      type: 'vite-react-express',
      name: 'Vite Single Page Application',
      description: 'Static frontend with client-side routing.',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
      hasFrontend: true,
      hasBackend: false,
      buildScript: rootPkg?.scripts?.build || 'vite build',
      outputDirectory: 'dist',
      isMonorepo,
      subdirectories: uniqueSubdirs,
      packageJsonData: rootPkg,
    };
  }

  return {
    type: 'unknown',
    name: 'Custom Node.js / Web Application',
    description: 'Custom full-stack project structure.',
    badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    hasFrontend: true,
    hasBackend: true,
    buildScript: rootPkg?.scripts?.build || 'npm run build',
    outputDirectory: 'dist',
    isMonorepo,
    subdirectories: uniqueSubdirs,
    packageJsonData: rootPkg,
  };
}

function detectDatabase(
  files: Map<string, ProjectFile>,
  packageFiles: { path: string; data: any }[]
): DatabaseDetection {
  const allDeps = new Set<string>();
  packageFiles.forEach(p => {
    if (p.data.dependencies) Object.keys(p.data.dependencies).forEach(d => allDeps.add(d));
    if (p.data.devDependencies) Object.keys(p.data.devDependencies).forEach(d => allDeps.add(d));
  });

  const detectedTypes: string[] = [];
  const envKeysReferenced: string[] = [];
  let ormFileFound: string | undefined;
  let serverlessReady = false;
  const recommendations: string[] = [];

  // Check Prisma
  if (allDeps.has('@prisma/client') || Array.from(files.keys()).some(k => k.includes('schema.prisma'))) {
    detectedTypes.push('Prisma ORM');
    ormFileFound = Array.from(files.keys()).find(k => k.includes('schema.prisma'));
    recommendations.push('Prisma in Serverless: Generate Prisma Client during build (`npx prisma generate` in build command).');
    recommendations.push('Use connection pooling (e.g. Neon, Supabase, or Prisma Accelerate) to prevent database exhaustion on Vercel.');
    serverlessReady = true;
  }

  // Check Mongoose / MongoDB
  if (allDeps.has('mongoose') || allDeps.has('mongodb')) {
    detectedTypes.push('MongoDB (Mongoose/Driver)');
    recommendations.push('MongoDB on Vercel Serverless: Cache the `mongoose.connect()` promise across invocations in global scope.');
    recommendations.push('Provide `MONGODB_URI` environment variable with Atlas connection string.');
  }

  // Check PostgreSQL
  if (allDeps.has('pg') || allDeps.has('postgres') || allDeps.has('@neondatabase/serverless')) {
    detectedTypes.push('PostgreSQL');
    if (allDeps.has('@neondatabase/serverless')) {
      serverlessReady = true;
      recommendations.push('Neon serverless driver detected: Native HTTP/WebSocket pooling is ready for Vercel.');
    } else {
      recommendations.push('PostgreSQL on Serverless: Direct TCP connections can exceed limit. Use pooled port 6543 (Supabase) or Neon pooled connection.');
    }
  }

  // Check Supabase
  if (allDeps.has('@supabase/supabase-js')) {
    detectedTypes.push('Supabase');
    serverlessReady = true;
    recommendations.push('Supabase client detected: Uses stateless HTTPS/REST, perfectly compatible with Vercel.');
  }

  // Check Drizzle
  if (allDeps.has('drizzle-orm')) {
    detectedTypes.push('Drizzle ORM');
    serverlessReady = true;
    recommendations.push('Drizzle ORM detected: Ultra lightweight, ideal for serverless cold starts.');
  }

  // Check MySQL
  if (allDeps.has('mysql') || allDeps.has('mysql2')) {
    detectedTypes.push('MySQL');
    recommendations.push('MySQL on Serverless: Use PlanetScale or a pooled proxy.');
  }

  // If no DB detected in package.json, check text files for DATABASE_URL or API keys
  for (const [, file] of files.entries()) {
    if (file.isBinary) continue;
    if (file.content.includes('DATABASE_URL')) {
      if (!envKeysReferenced.includes('DATABASE_URL')) envKeysReferenced.push('DATABASE_URL');
    }
    if (file.content.includes('MONGODB_URI')) {
      if (!envKeysReferenced.includes('MONGODB_URI')) envKeysReferenced.push('MONGODB_URI');
    }
    if (file.content.includes('SUPABASE_URL') || file.content.includes('SUPABASE_ANON_KEY')) {
      if (!detectedTypes.includes('Supabase')) detectedTypes.push('Supabase (Env reference)');
    }
  }

  if (detectedTypes.length === 0) {
    detectedTypes.push('Pending / Custom Database API');
    recommendations.push('Awaiting database API credentials. You will be able to input your API endpoint/connection string in the Database API Config tab.');
  }

  return {
    detectedTypes,
    hasConnectionStrings: envKeysReferenced.length > 0,
    envKeysReferenced,
    ormFileFound,
    serverlessReady,
    recommendations,
  };
}

function scanEnvironmentVariables(files: Map<string, ProjectFile>): string[] {
  const envSet = new Set<string>();

  // Check .env files first
  for (const [path, file] of files.entries()) {
    if (file.isBinary) continue;
    if (path.includes('.env') || path.endsWith('.env.example')) {
      const lines = file.content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const key = trimmed.split('=')[0].trim();
          if (key) envSet.add(key);
        }
      }
    }
  }

  // Scan source code for process.env.XYZ and import.meta.env.VITE_XYZ
  const processRegex = /process\.env\.([A-Z0-9_]+)/g;
  const viteRegex = /import\.meta\.env\.([A-Z0-9_]+)/g;

  for (const [path, file] of files.entries()) {
    if (file.isBinary) continue;
    if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.tsx')) {
      let match;
      while ((match = processRegex.exec(file.content)) !== null) {
        const key = match[1];
        if (key && !['NODE_ENV', 'PORT'].includes(key)) {
          envSet.add(key);
        }
      }
      while ((match = viteRegex.exec(file.content)) !== null) {
        const key = match[1];
        if (key && !['MODE', 'BASE_URL', 'PROD', 'DEV', 'SSR'].includes(key)) {
          envSet.add(key);
        }
      }
    }
  }

  return Array.from(envSet);
}

function detectExpressServer(files: Map<string, ProjectFile>): { hasExpressServer: boolean; serverEntryFile?: string } {
  const candidatePaths = [
    'server.js',
    'server.ts',
    'src/server.ts',
    'src/server.js',
    'server/index.js',
    'server/index.ts',
    'server/server.js',
    'server/server.ts',
    'backend/server.js',
    'backend/index.js',
    'index.js',
    'app.js',
    'src/index.ts',
    'api/index.js',
    'api/index.ts',
  ];

  for (const p of candidatePaths) {
    if (files.has(p)) {
      const content = files.get(p)!.content;
      if (content.includes('express()') || content.includes('app.listen') || content.includes('router') || content.includes('createServer')) {
        return { hasExpressServer: true, serverEntryFile: p };
      }
    }
  }

  // General search
  for (const [path, file] of files.entries()) {
    if (file.isBinary) continue;
    if ((path.endsWith('.js') || path.endsWith('.ts')) && file.content.includes('express()')) {
      return { hasExpressServer: true, serverEntryFile: path };
    }
  }

  return { hasExpressServer: false };
}

function runAuditChecks(
  files: Map<string, ProjectFile>,
  framework: FrameworkDetection,
  database: DatabaseDetection,
  hasExpressServer: boolean,
  serverEntryFile: string | undefined,
  envKeys: string[]
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Check 1: Hardcoded localhost URLs (Major problem on Vercel)
  const localhostRegex = /https?:\/\/localhost:\d{4}/g;
  const filesWithLocalhost: string[] = [];

  for (const [path, file] of files.entries()) {
    if (file.isBinary) continue;
    if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.tsx') || path.endsWith('.vue')) {
      if (localhostRegex.test(file.content) && !path.includes('server') && !path.includes('test')) {
        filesWithLocalhost.push(path);
      }
    }
  }

  if (filesWithLocalhost.length > 0) {
    issues.push({
      id: 'hardcoded-localhost',
      severity: 'error',
      title: 'Hardcoded Localhost API Calls Detected',
      description: `Client code contains hardcoded URLs like "http://localhost:5000" in ${filesWithLocalhost.slice(0, 3).join(', ')}${filesWithLocalhost.length > 3 ? ` and ${filesWithLocalhost.length - 3} more` : ''}. In production on Vercel, requests to localhost will fail on users' computers. Use relative paths (e.g. "/api/...") or environment variables.`,
      affectedFile: filesWithLocalhost[0],
      autoFixAvailable: true,
      fixAction: 'Convert localhost URLs to relative /api or VITE_API_URL',
    });
  }

  // Check 2: Express app.listen without serverless export
  if (hasExpressServer && serverEntryFile) {
    const entryFileContent = files.get(serverEntryFile)?.content || '';
    const hasExport = entryFileContent.includes('export default') || entryFileContent.includes('module.exports =');
    const hasVercelApiFolder = Array.from(files.keys()).some(k => k.startsWith('api/'));

    if (!hasExport && !hasVercelApiFolder) {
      issues.push({
        id: 'express-serverless-export',
        severity: 'warning',
        title: 'Express Server Needs Serverless Function Export for Vercel',
        description: `Vercel is serverless; a persistent "app.listen(port)" will not run on standard Vercel serverless. To deploy Express on Vercel, export the app ("export default app;" or "module.exports = app;") and route it via "api/index.js". Alternatively, deploy the backend to Render or Railway.`,
        affectedFile: serverEntryFile,
        autoFixAvailable: true,
        fixAction: 'Create api/index.js adapter and export express app',
      });
    } else {
      issues.push({
        id: 'express-ready',
        severity: 'success',
        title: 'Express Server Entry Detected',
        description: `Detected server at ${serverEntryFile}. Configured with serverless routing.`,
      });
    }
  }

  // Check 3: Missing vercel.json for custom routing
  if (!files.has('vercel.json')) {
    issues.push({
      id: 'missing-vercel-json',
      severity: 'info',
      title: 'No vercel.json in ZIP (Can be auto-generated)',
      description: 'A custom vercel.json ensures rewrites for Single Page Apps (SPA) and maps /api/* to your serverless backend without 404 errors.',
      autoFixAvailable: true,
      fixAction: 'Generate and insert vercel.json',
    });
  } else {
    issues.push({
      id: 'has-vercel-json',
      severity: 'success',
      title: 'Existing vercel.json Present',
      description: 'Your project already includes a vercel.json configuration.',
      affectedFile: 'vercel.json',
    });
  }

  // Check 4: Missing .gitignore for node_modules / .env
  if (!files.has('.gitignore')) {
    issues.push({
      id: 'missing-gitignore',
      severity: 'warning',
      title: 'Missing .gitignore File',
      description: 'Pushing to GitHub without a .gitignore may accidentally commit sensitive database credentials (.env) or gigabytes of node_modules.',
      autoFixAvailable: true,
      fixAction: 'Generate standard .gitignore',
    });
  }

  // Check 5: Database configuration status
  if (database.detectedTypes.includes('Pending / Custom Database API')) {
    issues.push({
      id: 'db-pending',
      severity: 'info',
      title: 'Database API Awaiting Configuration',
      description: 'You mentioned you will provide the database API later. Make sure to define connection parameters in the Database API Config tab before deploying to production.',
    });
  }

  // Check 6: Environment variables checklist
  if (envKeys.length > 0) {
    issues.push({
      id: 'env-vars-detected',
      severity: 'info',
      title: `${envKeys.length} Environment Variable${envKeys.length > 1 ? 's' : ''} Required on Vercel`,
      description: `Your code references: ${envKeys.slice(0, 6).join(', ')}${envKeys.length > 6 ? '...' : ''}. Remember to add them in Vercel Dashboard > Project Settings > Environment Variables.`,
    });
  }

  return issues;
}

export function generateDefaultVercelConfig(
  framework: FrameworkDetection,
  hasExpressServer: boolean,
  serverEntryFile?: string
): string {
  if (framework.type === 'nextjs') {
    return JSON.stringify({
      version: 2,
      buildCommand: "next build",
      installCommand: "npm install",
      framework: "nextjs"
    }, null, 2);
  }

  if (hasExpressServer) {
    return JSON.stringify({
      version: 2,
      builds: [
        {
          src: "api/index.js",
          use: "@vercel/node"
        },
        {
          src: "package.json",
          use: "@vercel/static-build",
          config: {
            distDir: framework.outputDirectory || "dist"
          }
        }
      ],
      routes: [
        {
          src: "/api/(.*)",
          dest: "/api/index.js"
        },
        {
          handle: "filesystem"
        },
        {
          src: "/(.*)",
          dest: "/index.html"
        }
      ]
    }, null, 2);
  }

  // Standard SPA with frontend rewrites for client-side routing
  return JSON.stringify({
    version: 2,
    rewrites: [
      {
        source: "/api/(.*)",
        destination: "/api/$1"
      },
      {
        source: "/(.*)",
        destination: "/index.html"
      }
    ]
  }, null, 2);
}
