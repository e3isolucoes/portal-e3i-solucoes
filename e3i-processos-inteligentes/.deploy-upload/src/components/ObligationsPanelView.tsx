import React, { useState } from 'react';
import { ExternalLink, LoaderCircle, RefreshCw, Scale } from 'lucide-react';

const PANEL_URL = 'https://obrigacoes.e3isolucoes.com.br/';

export const ObligationsPanelView: React.FC = () => {
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <section className="min-h-[calc(100vh-80px)] bg-[#F0F2EC] p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded border border-[#CFD6C6] bg-[#FBFBF8] shadow-sm">
        <header className="flex flex-col gap-4 border-b border-[#CFD6C6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-sm bg-[#E6EAE0] text-[#17395C]"><Scale className="h-5 w-5" /></span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#8F6A11]">Compliance e prazos</p>
              <h1 className="font-display text-xl font-semibold text-[#0E1A29]">Painel de Obrigações</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setLoading(true); setFrameKey(key => key + 1); }} className="inline-flex items-center gap-2 rounded-sm border border-[#B9C1B3] px-3 py-2 text-sm font-semibold text-[#17395C]"><RefreshCw className="h-4 w-4" /> Atualizar</button>
            <a href={PANEL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm border border-[#17395C] px-3 py-2 text-sm font-semibold text-[#17395C]">Nova janela <ExternalLink className="h-4 w-4" /></a>
          </div>
        </header>

        <div className="relative h-[calc(100vh-190px)] min-h-[680px] bg-white">
          {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-white"><div className="flex items-center gap-3 text-sm text-[#5C6672]"><LoaderCircle className="h-5 w-5 animate-spin text-[#8F6A11]" /> Carregando o Painel de Obrigações…</div></div>}
          <iframe
            key={frameKey}
            title="Painel de Obrigações E3I"
            src={PANEL_URL}
            className="h-full w-full border-0"
            sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </section>
  );
};
