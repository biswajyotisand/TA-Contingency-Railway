import JSZip from 'jszip';

export interface SampleProjectInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  stack: string[];
}

export const SAMPLE_PROJECTS: SampleProjectInfo[] = [
  {
    id: 'vite-express',
    name: 'Full-Stack Vite React + Express Server',
    badge: 'Popular Full-Stack',
    description: 'React SPA with Tailwind and an Express REST API backend with in-memory DB or ready for Postgres/Mongo.',
    stack: ['React 18', 'Vite', 'Express', 'TailwindCSS', 'Node.js'],
  },
  {
    id: 'nextjs-prisma',
    name: 'Next.js 14 App Router + Prisma ORM',
    badge: 'Vercel Native',
    description: 'Full-stack Next.js with Server Actions, API routes, and Prisma schema ready for PostgreSQL connection string.',
    stack: ['Next.js', 'Prisma', 'TypeScript', 'TailwindCSS'],
  },
  {
    id: 'mern-stack',
    name: 'MERN Stack (MongoDB / Express / React)',
    badge: 'MERN / NoSQL',
    description: 'Classic client + server monorepo with Mongoose schemas, controllers, and JWT auth scaffolding.',
    stack: ['MongoDB', 'Mongoose', 'Express', 'React', 'Node'],
  },
];

export async function generateSampleZip(id: string): Promise<Blob> {
  const zip = new JSZip();

  if (id === 'nextjs-prisma') {
    zip.file('package.json', JSON.stringify({
      name: 'nextjs-prisma-app',
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'prisma generate && next build',
        start: 'next start',
        lint: 'next lint'
      },
      dependencies: {
        '@prisma/client': '^5.12.0',
        next: '^14.2.0',
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        lucide: '^0.363.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/react': '^18.3.0',
        prisma: '^5.12.0',
        tailwindcss: '^3.4.1',
        typescript: '^5.4.0'
      }
    }, null, 2));

    zip.file('.env.example', 'DATABASE_URL="postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"\nNEXTAUTH_SECRET="change-me-in-production"\n');
    zip.file('.gitignore', 'node_modules/\n.next/\n.env\n.env.local\nbuild/\n');
    zip.file('prisma/schema.prisma', `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
`);
    zip.file('app/page.tsx', `export default async function HomePage() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Welcome to Next.js + Prisma</h1>
      <p className="mt-2 text-gray-600">Configured and ready for instant deployment on Vercel.</p>
    </main>
  );
}
`);
    zip.file('app/api/users/route.ts', `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Database API endpoint active' });
}
`);
  } else if (id === 'mern-stack') {
    zip.file('package.json', JSON.stringify({
      name: 'mern-app',
      version: '1.0.0',
      scripts: {
        build: 'cd client && npm install && npm run build',
        start: 'node server/index.js'
      },
      dependencies: {
        express: '^4.19.2',
        mongoose: '^8.3.0',
        cors: '^2.8.5',
        dotenv: '^16.4.5'
      }
    }, null, 2));

    zip.file('client/package.json', JSON.stringify({
      name: 'mern-client',
      version: '1.0.0',
      scripts: {
        build: 'vite build',
        dev: 'vite'
      },
      dependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        axios: '^1.6.8'
      },
      devDependencies: {
        vite: '^5.2.0'
      }
    }, null, 2));

    zip.file('.env.example', 'MONGODB_URI="mongodb+srv://user:pass@cluster0.mongodb.net/app?retryWrites=true&w=majority"\nPORT=5000\nJWT_SECRET="secretkey"\n');
    zip.file('server/index.js', `const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Note: In serverless, database connection should be cached
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
  }
}

app.get('/api/health', async (req, res) => {
  await connectDB();
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Export for Vercel Serverless
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(\`Server running on \${PORT}\`));
}
`);
    zip.file('client/src/App.jsx', `import React, { useEffect, useState } from 'react';

export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Relative path works both locally with proxy and in production on Vercel
    fetch('/api/health')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>MERN Stack Frontend</h2>
      <p>API Status: {data ? JSON.stringify(data) : 'Connecting...'}</p>
    </div>
  );
}
`);
  } else {
    // Vite + Express
    zip.file('package.json', JSON.stringify({
      name: 'vite-express-fullstack',
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        server: 'node server.js'
      },
      dependencies: {
        express: '^4.19.2',
        cors: '^2.8.5',
        react: '^18.3.0',
        'react-dom': '^18.3.0'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.2.1',
        vite: '^5.2.0'
      }
    }, null, 2));

    zip.file('.env.example', 'DATABASE_URL="postgres://user:password@host:5432/db"\nPORT=3000\nAPI_SECRET="your-key"\n');
    zip.file('server.js', `import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/info', (req, res) => {
  res.json({
    app: 'CloudShip Express API',
    serverless: true,
    timestamp: new Date().toISOString()
  });
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(3001, () => console.log('Listening on port 3001'));
}
`);
    zip.file('src/App.tsx', `import React from 'react';

export default function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Vite + Express Full Stack</h1>
      <p>Deployed with Vercel serverless function routing.</p>
    </div>
  );
}
`);
  }

  return await zip.generateAsync({ type: 'blob' });
}
