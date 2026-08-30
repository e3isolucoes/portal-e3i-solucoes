import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, CheckCircle2, UserCheck, Shield } from 'lucide-react';

export const RbacManager: React.FC = () => {
  const { user } = useAuth();

  const permissionsMatrix = [
    { module: 'Gerenciamento de Empresas (Tenants)', admin: true, manager: false, operator: false, auditor: true },
    { module: 'Controle de Usuários e RBAC', admin: true, manager: false, operator: false, auditor: true },
    { module: 'Execução de Processos Automatizados', admin: true, manager: true, operator: true, auditor: false },
    { module: 'Visualização de Trilha de Auditoria', admin: true, manager: true, operator: false, auditor: true },
    { module: 'Configurações de Segurança e API Keys', admin: true, manager: false, operator: false, auditor: false },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0A192F] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-2 border border-[#D4AF37]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Segurança Enterprise • RBAC</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Controle de Permissões por Papel (RBAC)</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Matriz de autorização e privilégios garantindo conformidade total e segurança de acesso.
          </p>
        </div>

        {/* Current user role card */}
        <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Seu perfil atual na sessão:</div>
              <div className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
                <span>{user?.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-mono uppercase">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Último acesso autenticado com sucesso via JWT.
          </div>
        </div>

        {/* Matrix Table */}
        <div className="bg-[#070D1A] border border-[#D4AF37]/20 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Matriz de Autorizações E3I</h3>
            <p className="text-xs text-slate-400 mt-0.5">Comparativo de acessos entre os perfis do sistema</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A192F] border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4 sm:px-6">Módulo / Funcionalidade</th>
                  <th className="p-4 text-center">Administrador</th>
                  <th className="p-4 text-center">Gestor</th>
                  <th className="p-4 text-center">Operador</th>
                  <th className="p-4 text-center">Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
                {permissionsMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 sm:px-6 font-semibold text-white">{item.module}</td>
                    <td className="p-4 text-center">
                      {item.admin ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {item.manager ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {item.operator ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {item.auditor ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
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
