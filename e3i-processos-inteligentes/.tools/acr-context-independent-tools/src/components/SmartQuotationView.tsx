import React, { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Building2, CircleDollarSign, ExternalLink, Info, PackageSearch, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders, getErrorMessage } from '../utils';

type Offer = { id: string; title: string; seller: string; unitPrice: number; totalPrice: number; delivery: string; rating: number | null; reviews: number | null; url: string; source: string; capturedAt: string };
type Status = { realSearchEnabled: boolean; providers: Array<{ id: string; name: string; configured: boolean }> };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const SmartQuotationView: React.FC = () => {
  const { setCurrentView } = useAuth();
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [budget, setBudget] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const [cached, setCached] = useState(false);

  useEffect(() => {
    fetch('/api/procurement/status', { headers: getAuthHeaders(), credentials: 'include' })
      .then(async response => response.ok ? response.json() : Promise.reject())
      .then(setStatus).catch(() => setStatus(null));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setOffers([]);
    if (query.trim().length < 3) { setError('Informe o produto com pelo menos 3 caracteres.'); return; }
    setSearching(true);
    try {
      const response = await fetch('/api/procurement/search', { method: 'POST', credentials: 'include', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ query, quantity }) });
      const data = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data, 'Não foi possível consultar as fontes de preço.'));
      setOffers(data.offers || []); setCapturedAt(data.capturedAt || ''); setCached(Boolean(data.cached));
      if (!data.offers?.length) setError('Nenhuma oferta válida foi encontrada. Refine marca, modelo ou especificação.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha na pesquisa.'); }
    finally { setSearching(false); }
  };

  const ready = Boolean(status?.realSearchEnabled && status.providers.some(provider => provider.configured));
  const bestTotal = offers[0]?.totalPrice || 0;

  return <div className="min-h-[calc(100vh-80px)] bg-[#F0F2EC] text-[#0E1A29]">
    <header className="border-b border-[#CFD6C6] bg-[#E6EAE0] px-6 py-8"><div className="mx-auto max-w-[1180px]">
      <button onClick={() => setCurrentView('tools')} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#17395C]"><ArrowLeft className="h-4 w-4" /> Voltar às ferramentas</button>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#8F6A11]"><PackageSearch className="h-4 w-4" /> Gestão de Compras</p><h1 className="mt-3 font-display text-4xl font-semibold">Pesquisa real de preços</h1><p className="mt-3 text-[#5C6672]">Compare ofertas rastreáveis e confirme as condições diretamente com a loja.</p></div>
      <span className={`inline-flex items-center gap-2 self-start rounded-sm border px-3 py-2 text-xs font-semibold ${ready ? 'border-[#B9CDBF] bg-[#F4F8F3] text-[#2C5A3C]' : 'border-[#D9A925] bg-[#FFF9E9] text-[#70530C]'}`}><ShieldCheck className="h-4 w-4" /> {ready ? 'Fonte real conectada' : 'Integração pendente'}</span></div>
    </div></header>
    <div className="mx-auto grid max-w-[1180px] gap-6 px-6 py-8 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="h-fit rounded border border-[#CFD6C6] bg-[#FBFBF8] p-6 shadow-sm"><h2 className="font-display text-xl font-semibold">Nova pesquisa</h2><p className="mt-1 text-xs text-[#5C6672]">Use marca, modelo e especificações</p>
        <label className="mt-5 block text-xs font-bold uppercase tracking-[.08em] text-[#465568]">Produto *</label><textarea value={query} onChange={e => setQuery(e.target.value)} rows={4} placeholder="Ex.: Notebook Lenovo ThinkPad E14, 16 GB RAM, SSD 512 GB" className="mt-2 w-full resize-none rounded-sm border border-[#C7CFC1] bg-white px-3 py-3 outline-none focus:border-[#8F6A11]" />
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold uppercase text-[#465568]">Quantidade<input type="number" min="1" max="10000" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))} className="mt-2 w-full rounded-sm border border-[#C7CFC1] bg-white px-3 py-3 text-base font-normal" /></label><label className="text-xs font-bold uppercase text-[#465568]">Orçamento<input type="number" min="0" value={budget || ''} onChange={e => setBudget(Math.max(0, Number(e.target.value)))} placeholder="Opcional" className="mt-2 w-full rounded-sm border border-[#C7CFC1] bg-white px-3 py-3 text-base font-normal" /></label></div>
        {error && <p className="mt-4 rounded-sm border border-[#E3AAA5] bg-[#FFF2F1] p-3 text-sm text-[#93261F]">{error}</p>}
        <button disabled={searching || !ready} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#9F7E16] px-5 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Search className="h-4 w-4" /> {searching ? 'Consultando fontes…' : 'Pesquisar ofertas reais'}</button>
        <p className="mt-3 flex gap-2 text-xs leading-5 text-[#68727C]"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Preço e disponibilidade podem mudar. Confirme na página da loja antes da compra.</p>
      </form>
      <section className="space-y-5">
        {!offers.length ? <div className="grid min-h-[460px] place-items-center rounded border border-dashed border-[#B9C1B3] bg-[#F8F9F5] p-10 text-center"><div className="max-w-md"><Search className="mx-auto h-12 w-12 text-[#17395C]" /><h2 className="mt-5 font-display text-3xl font-semibold">Resultados com evidência</h2><p className="mt-3 leading-7 text-[#5C6672]">Cada oferta exibirá loja, preço capturado, horário e link direto para conferência.</p></div></div> : <>
          <div className="grid gap-4 md:grid-cols-3"><Metric icon={<CircleDollarSign />} label="Menor total encontrado" value={money.format(bestTotal)} /><Metric icon={<Building2 />} label="Ofertas válidas" value={String(offers.length)} /><Metric icon={<ShieldCheck />} label="Saldo do orçamento" value={budget ? money.format(budget - bestTotal) : 'Não informado'} /></div>
          <div className="overflow-hidden rounded border border-[#CFD6C6] bg-white"><div className="border-b border-[#DDE2D7] px-5 py-4"><h3 className="font-display text-xl font-semibold">Ofertas encontradas</h3><p className="text-xs text-[#5C6672]">Captura {capturedAt ? new Date(capturedAt).toLocaleString('pt-BR') : ''}{cached ? ' · cache validado' : ''}</p></div><div className="divide-y divide-[#DDE2D7]">{offers.map((offer, index) => <article key={offer.id} className={`p-5 ${index === 0 ? 'bg-[#F6F8F1]' : ''}`}><div className="flex flex-col gap-4 md:flex-row md:items-center"><div className="flex-1"><div className="flex flex-wrap gap-2"><h4 className="font-semibold">{offer.title}</h4>{index === 0 && <span className="rounded-sm bg-[#E7EDDB] px-2 py-1 text-[10px] font-bold uppercase text-[#4E662C]">Menor preço</span>}</div><p className="mt-1 text-sm text-[#5C6672]">{offer.seller} · {offer.delivery}</p><p className="mt-2 text-xs text-[#68727C]">{offer.source}{offer.rating ? ` · nota ${offer.rating}` : ''}{offer.reviews ? ` · ${offer.reviews} avaliações` : ''}</p></div><div className="md:text-right"><p className="text-xs text-[#5C6672]">{money.format(offer.unitPrice)} por unidade</p><p className="font-display text-2xl font-semibold">{money.format(offer.totalPrice)}</p><a href={offer.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#17395C]">Conferir na loja <ExternalLink className="h-3.5 w-3.5" /></a></div></div></article>)}</div></div>
        </>}
      </section>
    </div>
  </div>;
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => <div className="rounded border border-[#CFD6C6] bg-white p-5"><span className="block h-5 w-5 text-[#8F6A11]">{icon}</span><p className="mt-3 text-xs uppercase text-[#5C6672]">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p></div>;
