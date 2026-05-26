import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { Users, Layers, Code, Bot, Bell, Shield } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function WelcomeOnboardingPage(): React.ReactElement {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const navigate = useNavigate();

  // Auth check mimicking GlobalLayout behavior
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121316]">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const features = [
    {
      title: "Real-time Collaboration",
      description: "Work together live with realtime updates and team presence across the entire platform.",
      icon: <Users className="w-5 h-5 text-blue-400" />,
      delay: "delay-[100ms]"
    },
    {
      title: "Project & Task Management",
      description: "Track projects, tasks, priorities, and team progress efficiently with smart kanban boards.",
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      delay: "delay-[150ms]"
    },
    {
      title: "Integrated Developer Workspace",
      description: "Code snippets, collaborative wikis, Monaco editor, and robust developer tools all in one place.",
      icon: <Code className="w-5 h-5 text-emerald-400" />,
      delay: "delay-[200ms]"
    },
    {
      title: "AI-Powered Productivity",
      description: "Use intelligent AI assistants for task breakdowns, codebase summaries, and streamlined workflows.",
      icon: <Bot className="w-5 h-5 text-purple-400" />,
      delay: "delay-[250ms]"
    },
    {
      title: "Activity & Notifications",
      description: "Stay constantly updated with detailed live activity feeds and smart, actionable notifications.",
      icon: <Bell className="w-5 h-5 text-amber-400" />,
      delay: "delay-[300ms]"
    },
    {
      title: "Team Management & RBAC",
      description: "Securely invite members, assign roles, and manage permissions using advanced role-based access control.",
      icon: <Shield className="w-5 h-5 text-rose-400" />,
      delay: "delay-[350ms]"
    }
  ];

  return (
    <div className="min-h-screen bg-[#121316] text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 flex items-center justify-between px-6 lg:px-12 border-b border-white/[0.04] flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black">DC</span>
          </div>
          <span className="text-sm font-bold text-white tracking-wide">
            DevCollab
          </span>
        </div>
        <div>
          <button
            onClick={() => navigate('/onboarding/create-workspace')}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
          >
            Create Workspace
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-12 lg:py-20 flex flex-col items-center">
        
        {/* Hero Section */}
        <div className="max-w-3xl w-full text-center space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            Welcome Aboard
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">DevCollab</span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Your all-in-one realtime developer collaboration platform. Break down silos and build incredible software together faster than ever before.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full mb-16">
          {features.map((feature, idx) => (
            <div 
              key={idx}
              className={`group flex flex-col items-start p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 ${feature.delay} fill-mode-both`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/[0.08] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-2 group-hover:text-white transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-[500ms] fill-mode-both mb-8">
          <p className="text-sm text-slate-400 mb-6 font-medium">
            Ready to streamline your engineering workflows?
          </p>
          <button
            onClick={() => navigate('/onboarding/create-workspace')}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] transform hover:-translate-y-0.5"
          >
            Create Your First Workspace
          </button>
        </div>

      </main>
    </div>
  );
}
