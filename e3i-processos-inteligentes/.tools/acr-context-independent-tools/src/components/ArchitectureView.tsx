import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Cpu, Database, ShieldCheck, Layers, Server, CheckCircle2 } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0A192F] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 border border-purple-500/20">
            <Cpu className="w-3.5 h-3.5" />
            <span>Clean Architecture & Stack</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Arquitetura Técnica — E³I Processos Inteligentes</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Stack Enterprise robusta com NestJS, PostgreSQL, Prisma, Docker, JWT e Refresh Token.
          </p>
        </div>

        {/* Clean Architecture Layers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 space-y-3">
            <div className="p-3 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] w-fit border border-[#3B82F6]/30">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Presentation Layer</h3>
            <p className="text-xs text-slate-400">React 19, Tailwind CSS v4, TypeScript e Shadcn UI concepts com suporte a Dark/Light Mode.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 space-y-3">
            <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] w-fit border border-[#D4AF37]/30">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Application Layer</h3>
            <p className="text-xs text-slate-400">NestJS Controllers, Use Cases, DTOs de validação e Guards de autorização baseados em papéis.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Domain Layer</h3>
            <p className="text-xs text-slate-400">Entidades de Domínio, Regras de Negócio Tenant-Aware e Objetos de Valor isolados.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 space-y-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 w-fit border border-purple-500/30">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Infrastructure Layer</h3>
            <p className="text-xs text-slate-400">PostgreSQL, Prisma ORM, Docker Compose, Redis Cache e Trilha de Auditoria Imutável.</p>
          </div>

        </div>

        {/* Security & Features Checklist */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/30 space-y-6">
          <h3 className="text-lg font-bold text-white">Checklist de Segurança & Funcionalidades (Fase 01)</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#0A192F] border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">JWT com Refresh Token Rotation</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#0A192F] border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Multi-Tenant com Isolamento por Schema</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#0A192F] border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">RBAC (Admin, Gestor, Operador, Auditor)</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#0A192F] border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Proteção CSRF, XSS e SQL Injection</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#0A192F] border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Trilha de Auditoria de Eventos Críticos</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#0A192F] border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Tema E3I (Navy, Gold, Accent Blue)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
