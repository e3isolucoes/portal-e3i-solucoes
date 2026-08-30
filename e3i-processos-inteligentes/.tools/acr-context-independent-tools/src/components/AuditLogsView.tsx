import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Search, ShieldCheck, Filter, Download } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0A192F] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/20">
              <FileText className="w-3.5 h-3.5" />
              <span>Conformidade & Auditoria</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Trilha de Auditoria e Logs do Sistema</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Registro imutável de acessos, alterações e eventos críticos para total governança.
            </p>
          </div>

          <button
            onClick={() => alert("Relatório de auditoria exportado com assinatura digital E3I.")}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0F172A] border border-[#D4AF37]/40 hover:bg-slate-800 transition-all flex items-center space-x-2 self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-[#D4AF37]" />
            <span>Exportar Relatório</span>
          </button>
        </div>

        {/* Filters bar */}
        <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuário, ação ou detalhe..."
              className="w-full bg-[#0A192F] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-[#D4AF37]" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">Todos os Módulos</option>
              <option value="Autenticação">Autenticação</option>
              <option value="Multi-Tenant">Multi-Tenant</option>
              <option value="RBAC">RBAC</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-[#070D1A] border border-[#D4AF37]/20 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A192F] border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4 sm:px-6">Data / Hora</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Módulo</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Detalhes</th>
                  <th className="p-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 sm:px-6 font-mono text-slate-400">{log.timestamp}</td>
                    <td className="p-4 font-bold text-white">{log.userName}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-[#D4AF37]">{log.action}</td>
                    <td className="p-4 text-slate-300">{log.details}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
