import React from 'react';
import { 
  Cloud, 
  Terminal, 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  Download,
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  hasProject: boolean;
  projectName?: string;
  onReset: () => void;
  onExport: () => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasProject,
  projectName,
  onReset,
  onExport,
  onOpenGuide,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/20">
            <div className="h-full w-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
              <Cloud className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">CloudShip</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Vercel Deploy Studio
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Full-Stack ZIP Inspector, Config Generator & Database Readiness
            </p>
          </div>
        </div>

        {/* Center project indicator if loaded */}
        {hasProject && projectName && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-zinc-400">Loaded:</span>
            <span className="font-mono font-medium text-zinc-200">{projectName}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
            title="Vercel Architecture Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Deployment Guide</span>
          </button>

          {hasProject && (
            <>
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 rounded-lg transition-colors"
                title="Load another ZIP"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Zip</span>
              </button>

              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-sm shadow-blue-500/25 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Deploy Zip</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
