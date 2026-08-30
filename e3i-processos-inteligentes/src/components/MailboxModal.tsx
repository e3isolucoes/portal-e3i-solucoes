import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, X, CheckCircle2, Copy, RefreshCw, ShieldAlert } from 'lucide-react';

interface MailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SentEmail {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  inviteLink: string;
  sentAt: string;
  status: 'DELIVERED' | 'PENDING';
}

export const MailboxModal: React.FC<MailboxModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emails/sent', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmails(data);
        }
      }
    } catch (err) {
      console.error("Error fetching sent emails:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const copyToClipboard = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0A192F] border border-[#D4AF37]/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[85vh] flex flex-col e3i-card-glass">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Simulador de Caixa de Entrada (E-mails Enviados)</h3>
              <p className="text-xs text-slate-400">Visualize convites de colaboradores e links de acesso gerados em ambiente seguro</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchEmails}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Atualizar E-mails"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {emails.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Mail className="w-12 h-12 mx-auto opacity-40 text-[#D4AF37]" />
              <p className="text-sm font-medium">Nenhum e-mail de convite disparado recentemente.</p>
              <p className="text-xs text-slate-500">Convide um colaborador na aba "Usuários" para visualizar o e-mail mockado aqui.</p>
            </div>
          ) : (
            emails.map((mail) => (
              <div 
                key={mail.id}
                className="p-5 rounded-xl bg-[#070D1A] border border-slate-800 hover:border-[#D4AF37]/30 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">{mail.subject}</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">Para: {mail.recipientName} &lt;{mail.recipientEmail}&gt;</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400">{mail.sentAt}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Entregue</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  {mail.body}
                </p>

                {mail.inviteLink && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0A192F] p-3 rounded-xl border border-[#3B82F6]/30">
                    <div className="overflow-hidden">
                      <span className="block text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider mb-0.5">Link de Convite / Ativação</span>
                      <span className="block text-xs font-mono text-slate-300 truncate">{mail.inviteLink}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => copyToClipboard(mail.inviteLink, mail.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6]/30 text-xs font-bold transition-all flex items-center space-x-1.5 border border-[#3B82F6]/40"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedId === mail.id ? 'Copiado!' : 'Copiar Link'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-start space-x-3 shrink-0">
          <ShieldAlert className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            O simulador de e-mails da E3I captura todos os disparos corporativos em ambiente isolado para validação imediata de credenciais, links de ativação e auditoria de conformidade.
          </p>
        </div>

      </div>
    </div>
  );
};
