import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, FileSearch, Fingerprint, LockKeyhole, Network, Scale, ShieldCheck, Sparkles } from 'lucide-react';

const tools = [
  { icon: ClipboardCheck, tag: 'Compras e suprimentos', name: 'Gestão de Compras', description: 'Cotações, comparativos e decisões de compra organizados em um fluxo rastreável e pronto para auditoria.' },
  { icon: Scale, tag: 'Compliance e prazos', name: 'Painel de Obrigações', description: 'Obrigações, vencimentos, responsáveis e comprovantes reunidos em uma única visão operacional.' },
  { icon: Network, tag: 'Diagnóstico empresarial', name: 'Contexto Empresarial E³I', description: 'Estratégia, organização, processos e sistemas transformados em um contexto versionado e confiável.' }
];

const services = [
  { icon: FileSearch, title: 'Diagnóstico e mapeamento', text: 'Levantamento estruturado da operação, das responsabilidades, dos sistemas e dos pontos críticos.' },
  { icon: BarChart3, title: 'Dados e indicadores', text: 'Organização de bases, indicadores gerenciais e painéis para decisões sustentadas por evidências.' },
  { icon: Sparkles, title: 'Automação de processos', text: 'Desenho e implantação de fluxos digitais adequados à maturidade e às prioridades da empresa.' }
];

export const LandingPage: React.FC = () => {
  const { setAuthModalOpen, setAuthMode } = useAuth();
  const openLogin = () => { setAuthMode('login'); setAuthModalOpen(true); };

  return (
    <div className="min-h-screen bg-[#F0F2EC] text-[#0E1A29]">
      <section className="relative overflow-hidden border-b border-[#CFD6C6]">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(23,57,92,.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,57,92,.05)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="relative mx-auto grid max-w-[1180px] gap-12 px-6 py-16 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-5 flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[.18em] text-[#8F6A11] before:h-px before:w-10 before:bg-[#D9A925]">Portal de soluções empresariais</p>
            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.04] tracking-[-.025em] sm:text-6xl lg:text-[4.45rem]">Conhecimento aplicado para uma gestão <span className="text-[#17395C] underline decoration-[#D9A925] decoration-4 underline-offset-8">mais confiável.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#33404F]">Um único ambiente para acessar as ferramentas, os diagnósticos e os serviços da E³I Soluções — com contexto, responsabilidade e segurança em cada entrega.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={openLogin} className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-[#0E1A29] bg-[#0E1A29] px-6 py-3.5 font-semibold text-[#F5F6F2] transition hover:-translate-y-0.5 hover:bg-[#17395C]">Acessar área do cliente <ArrowRight className="h-4 w-4" /></button>
              <a href="#solucoes" className="inline-flex items-center justify-center rounded-[3px] border border-[#B9C1B3] bg-[#FBFBF8] px-6 py-3.5 font-semibold transition hover:border-[#17395C]">Conhecer soluções</a>
            </div>
            <div className="mt-9 flex flex-wrap gap-2 border-t border-[#CFD6C6] pt-5">
              {['Acesso por concessão', 'Dados segregados', 'Rastreabilidade'].map(item => <span key={item} className="inline-flex items-center gap-2 rounded-sm border border-[#B9CDBF] bg-[#FBFBF8] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.1em] text-[#2C5A3C]"><CheckCircle2 className="h-3 w-3" /> {item}</span>)}
            </div>
          </div>
          <aside className="overflow-hidden rounded border border-[#CFD6C6] bg-[#FBFBF8] shadow-[0_24px_60px_-38px_rgba(14,26,41,.65)]">
            <div className="flex items-center justify-between bg-[#0E1A29] px-6 py-5 text-white"><div><p className="font-display text-xl font-semibold">Ambiente do cliente</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-[#9FB0C2]">Acesso seguro e personalizado</p></div><Fingerprint className="h-7 w-7 text-[#D9A925]" /></div>
            <div className="divide-y divide-[#CFD6C6]">
              {[['Ferramentas contratadas', 'Disponíveis por organização'], ['Serviços e entregáveis', 'Contexto reunido em um só lugar'], ['Permissões e auditoria', 'Controle por perfil e empresa']].map(([title, text], index) => <div key={title} className={`flex gap-4 px-6 py-5 ${index === 1 ? 'bg-[#E6EAE0]' : ''}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-[#17395C] font-mono text-xs text-white">0{index + 1}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-[#5C6672]">{text}</p></div></div>)}
            </div>
            <div className="flex items-center gap-3 border-t border-dashed border-[#CFD6C6] px-6 py-4 font-mono text-[10px] uppercase tracking-[.1em] text-[#5C6672]"><LockKeyhole className="h-4 w-4 text-[#8F6A11]" /> Cada acesso é validado no servidor</div>
          </aside>
        </div>
      </section>

      <section id="solucoes" className="border-b border-[#CFD6C6] px-6 py-20 lg:py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-11 max-w-3xl"><p className="mb-4 font-mono text-[11px] uppercase tracking-[.18em] text-[#8F6A11]">Ferramentas digitais</p><h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Soluções para transformar rotina em gestão.</h2><p className="mt-5 text-lg leading-8 text-[#5C6672]">Aplicações objetivas, desenvolvidas a partir de problemas reais e liberadas conforme a contratação de cada cliente.</p></div>
          <div className="grid gap-5 lg:grid-cols-3">
            {tools.map((tool, index) => { const Icon = tool.icon; return <article key={tool.name} className="group flex min-h-[330px] flex-col rounded border border-[#CFD6C6] bg-[#FBFBF8] p-7 transition hover:-translate-y-1 hover:border-[#17395C] hover:shadow-[0_20px_45px_-35px_rgba(14,26,41,.7)]"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-sm border border-[#C8D1C3] bg-[#E6EAE0] text-[#17395C]"><Icon className="h-6 w-6" /></span><span className="font-mono text-xs text-[#8F6A11]">0{index + 1}</span></div><p className="mt-8 font-mono text-[10px] font-medium uppercase tracking-[.14em] text-[#8F6A11]">{tool.tag}</p><h3 className="mt-3 font-display text-2xl font-semibold">{tool.name}</h3><p className="mt-3 flex-1 text-[15px] leading-7 text-[#5C6672]">{tool.description}</p><button onClick={openLogin} className="mt-6 inline-flex items-center gap-2 border-t border-[#CFD6C6] pt-5 text-sm font-semibold text-[#17395C]">Acessar com sua conta <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button></article>; })}
          </div>
        </div>
      </section>

      <section id="servicos" className="border-b border-[#22303F] bg-[#0E1A29] px-6 py-20 text-[#E8EBE4] lg:py-24">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="mb-4 font-mono text-[11px] uppercase tracking-[.18em] text-[#D9A925]">Serviços especializados</p><h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Tecnologia com método e acompanhamento.</h2><p className="mt-5 text-base leading-8 text-[#AFBBC8]">Além das ferramentas, a E³I conduz a leitura do negócio, estrutura prioridades e acompanha a evolução das soluções.</p><a href="mailto:contato@e3isolucoes.com.br?subject=Quero%20conhecer%20os%20serviços%20E3I" className="mt-8 inline-flex items-center gap-2 rounded-sm bg-[#D9A925] px-5 py-3 font-semibold text-[#0E1A29]">Conversar com a E³I <ArrowRight className="h-4 w-4" /></a></div>
          <div className="divide-y divide-[#2C3B4D] border-y border-[#2C3B4D]">{services.map((service, index) => { const Icon = service.icon; return <div key={service.title} className="grid gap-4 py-7 sm:grid-cols-[52px_1fr]"><span className="grid h-11 w-11 place-items-center border border-[#3C4D61] text-[#D9A925]"><Icon className="h-5 w-5" /></span><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#8192A5]">Serviço 0{index + 1}</p><h3 className="mt-1 font-display text-2xl font-semibold text-white">{service.title}</h3><p className="mt-2 leading-7 text-[#AFBBC8]">{service.text}</p></div></div>; })}</div>
        </div>
      </section>

      <section id="governanca" className="px-6 py-16"><div className="mx-auto grid max-w-[1180px] gap-6 rounded border border-[#CFD6C6] bg-[#FBFBF8] p-8 md:grid-cols-[1fr_auto] md:items-center lg:p-10"><div className="flex gap-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-[#E6EAE0] text-[#17395C]"><ShieldCheck className="h-6 w-6" /></span><div><p className="font-display text-2xl font-semibold">Governança desde o primeiro acesso</p><p className="mt-2 max-w-3xl leading-7 text-[#5C6672]">Cada cliente enxerga apenas sua organização e as ferramentas concedidas. Perfis, ações administrativas e acessos ficam sujeitos a controle e auditoria.</p></div></div><button onClick={openLogin} className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#17395C] px-5 py-3 font-semibold text-[#17395C]">Entrar no portal <ArrowRight className="h-4 w-4" /></button></div></section>

      <footer className="border-t border-[#CFD6C6] bg-[#E6EAE0] px-6 py-10"><div className="mx-auto flex max-w-[1180px] flex-col gap-5 text-sm text-[#5C6672] md:flex-row md:items-center md:justify-between"><div><p className="font-display text-xl font-semibold text-[#0E1A29]">E³I Soluções</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em]">Contexto antes da resposta</p></div><p>© {new Date().getFullYear()} E³I Soluções. Todos os direitos reservados.</p><a href="https://e3isolucoes.com.br" className="font-semibold text-[#17395C]">Site institucional</a></div></footer>
    </div>
  );
};
