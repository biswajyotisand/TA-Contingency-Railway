export interface ProjectFile {
  name: string;
  path: string;
  content: string; // text content or base64
  isBinary: boolean;
  size: number;
}

export type FrameworkType = 
  | 'nextjs' 
  | 'vite-react-express' 
  | 'react-cra-express' 
  | 'express-standalone'
  | 'remix'
  | 'nuxt'
  | 'sveltekit'
  | 'astro'
  | 'nest'
  | 'node-api'
  | 'html-static'
  | 'unknown';

export interface FrameworkDetection {
  type: FrameworkType;
  name: string;
  description: string;
  badgeColor: string;
  hasFrontend: boolean;
  hasBackend: boolean;
  frontendPath?: string;
  backendPath?: string;
  packageJsonData?: any;
  buildScript?: string;
  startScript?: string;
  outputDirectory?: string;
  isMonorepo: boolean;
  subdirectories: string[];
}

export interface DatabaseDetection {
  detectedTypes: string[]; // e.g. ['Prisma', 'MongoDB / Mongoose', 'PostgreSQL (pg)', 'Supabase', 'Neon']
  hasConnectionStrings: boolean;
  envKeysReferenced: string[];
  ormFileFound?: string;
  serverlessReady: boolean; // e.g. has pooling or direct socket
  recommendations: string[];
}

export interface AuditIssue {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  affectedFile?: string;
  autoFixAvailable?: boolean;
  fixAction?: string;
}

export interface DeploymentConfig {
  projectName: string;
  framework: FrameworkType;
  platform: 'vercel' | 'render' | 'railway' | 'netlify';
  outputDirectory: string;
  buildCommand: string;
  installCommand: string;
  rootDirectory: string;
  nodeVersion: string;
  serverlessAdapterRequired: boolean;
  customVercelJson: string;
  envVars: Record<string, string>;
}
