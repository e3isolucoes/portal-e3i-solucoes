import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast, Button, IconButton, Card, Field, Input, Select, Textarea, Modal, ConfirmDialog, Badge, Skeleton, EmptyState, ErrorState, DataTable, PageHeader } from './ui';
import { Layers, Satellite, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, Plus, Trash2, Edit, Search } from 'lucide-react';

export const DesignSystem: React.FC = () => {
  const { theme, setTheme } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('option1');

  const sampleTableData = [
    { id: 1, nome: 'Discovery Estratégico', status: 'Ativo', progresso: '85%', responsavel: 'Ana Souza' },
    { id: 2, nome: 'Mapeamento de Processos', status: 'Revisão', progresso: '40%', responsavel: 'Carlos Lima' },
    { id: 3, nome: 'Strategy Canvas 2026', status: 'Concluído', progresso: '100%', responsavel: 'Mariana Costa' },
  ];

  const tableColumns = [
    { key: 'nome', header: 'Módulo / Processo', sortable: true },
    { 
      key: 'status', 
      header: 'Status', 
      render: (item: any) => (
        <Badge variant={item.status === 'Concluído' ? 'success' : item.status === 'Ativo' ? 'info' : 'warning'}>
          {item.status}
        </Badge>
      ) 
    },
    { key: 'progresso', header: 'Progresso', sortable: true, className: 'font-mono' },
    { key: 'responsavel', header: 'Responsável' },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="max-w-7xl mx-auto space-y-12">

        <PageHeader
          eyebrow={{ icon: <Layers className="w-3.5 h-3.5" />, text: 'Design System E3I v2.0' }}
          title="Biblioteca de Componentes e Tokens Semânticos"
          description="Guia institucional vivo construído sobre Tailwind CSS v4, garantindo acessibilidade WCAG AA, suporte a temas (Dark/Light) e zero tokens literais."
          actions={
            <Button
              variant="gold"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              Alternar Tema ({theme === 'dark' ? 'Dark' : 'Light'})
            </Button>
          }
        />

        {/* 1. Paleta de Cores & Tokens */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            1. Tokens de Design Institucionais
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card elevation="flat" className="p-6 space-y-3">
              <div className="w-full h-16 rounded-xl bg-surface border border-border-subtle shadow-inner" />
              <div>
                <h4 className="font-bold text-text-primary">Superfície Corporativa</h4>
                <p className="text-xs text-text-secondary">token: `--color-surface`</p>
                <p className="text-xs text-text-muted mt-1">Fundo base para cards, modais e containers.</p>
              </div>
            </Card>

            <Card elevation="flat" className="p-6 space-y-3 border-gold/30">
              <div className="w-full h-16 rounded-xl bg-gold shadow-md" />
              <div>
                <h4 className="font-bold text-gold">Metallic Gold</h4>
                <p className="text-xs text-text-secondary">token: `--color-gold`</p>
                <p className="text-xs text-text-muted mt-1">Acento escasso para prestígio e status crítico.</p>
              </div>
            </Card>

            <Card elevation="flat" className="p-6 space-y-3 border-accent/30">
              <div className="w-full h-16 rounded-xl bg-accent shadow-md" />
              <div>
                <h4 className="font-bold text-accent">Accent Blue</h4>
                <p className="text-xs text-text-secondary">token: `--color-accent`</p>
                <p className="text-xs text-text-muted mt-1">Ações primárias, navegação e interatividade.</p>
              </div>
            </Card>
          </div>
        </div>

        {/* 2. Botões & Ícones */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            2. Botões e Ações Interativas
          </h2>
          <Card elevation="raised" className="p-8">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                Primário Azul
              </Button>
              <Button variant="gold" icon={<Satellite className="w-4 h-4" />}>
                Dourado Executivo
              </Button>
              <Button variant="secondary">
                Secundário
              </Button>
              <Button variant="ghost">
                Fantasma
              </Button>
              <Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>
                Destrutivo
              </Button>
              <Button variant="primary" loading>
                Carregando
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-border-subtle">
              <IconButton aria-label="Adicionar item" icon={<Plus className="w-4 h-4" />} variant="surface" />
              <IconButton aria-label="Editar item" icon={<Edit className="w-4 h-4" />} variant="gold" />
              <IconButton aria-label="Deletar item" icon={<Trash2 className="w-4 h-4" />} variant="danger" />
            </div>
          </Card>
        </div>

        {/* 3. Badges & Toasts */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            3. Badges e Sistema de Notificações (Toasts)
          </h2>
          <Card elevation="raised" className="p-8 space-y-6">
            <div className="flex flex-wrap gap-3">
              <Badge variant="neutral">Neutro</Badge>
              <Badge variant="info">Em Andamento</Badge>
              <Badge variant="success">Aprovado</Badge>
              <Badge variant="warning">Revisão Pendente</Badge>
              <Badge variant="danger">Crítico</Badge>
              <Badge variant="gold">E³I Master</Badge>
            </div>
            <div className="flex flex-wrap gap-4 pt-4 border-t border-border-subtle">
              <Button variant="secondary" onClick={() => showToast('Operação realizada com sucesso!', 'success')}>
                Testar Toast Sucesso
              </Button>
              <Button variant="secondary" onClick={() => showToast('Falha na conexão com o banco.', 'error')}>
                Testar Toast Erro
              </Button>
            </div>
          </Card>
        </div>

        {/* 4. Formulários & Campos */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            4. Campos de Formulário Acessíveis (Field + Input)
          </h2>
          <Card elevation="raised" className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Nome da Empresa" required helperText="Insira a razão social registrada.">
                <Input
                  placeholder="Ex: E³I Soluções S/A"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </Field>

              <Field label="Setor de Atuação" error="Campo obrigatório para validação B2B.">
                <Select value={selectValue} onChange={(e) => setSelectValue(e.target.value)}>
                  <option value="option1">Tecnologia & Governança</option>
                  <option value="option2">Indústria & Logística</option>
                  <option value="option3">Serviços Financeiros</option>
                </Select>
              </Field>
            </div>
          </Card>
        </div>

        {/* 5. Modais e Dialogs de Confirmação */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            5. Modais e Caixa de Confirmação
          </h2>
          <Card elevation="raised" className="p-8 flex flex-wrap gap-4">
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Abrir Modal Customizada
            </Button>
            <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
              Abrir ConfirmDialog
            </Button>
          </Card>
        </div>

        {/* 6. DataTable Responsiva */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            6. Tabela de Dados (DataTable com ordenação e responsividade mobile)
          </h2>
          <DataTable
            data={sampleTableData}
            columns={tableColumns}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => showToast(`Selecionado: ${item.nome}`, 'info')}
          />
        </div>

        {/* 7. Estados Vazios e Erros */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            7. Estados de Erro e Vazio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              title="Nenhum processo mapeado"
              description="Comece criando seu primeiro fluxo no módulo Discovery."
              actionText="Criar Processo"
              onAction={() => showToast('Ação de criar acionada', 'success')}
            />
            <ErrorState
              title="Erro de Sincronização"
              message="Não foi possível estabelecer conexão segura com o servidor Supabase."
              onRetry={() => showToast('Tentando reconectar...', 'info')}
            />
          </div>
        </div>

        {/* 8. Skeletons */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary border-b border-border-subtle pb-2">
            8. Skeletons de Carregamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        </div>

      </div>

      {/* Modal Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Demonstração de Modal Acessível"
        description="Esta janela gerencia foco automático, fecha com ESC e bloqueia o scroll do body."
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            Conteúdo interno da modal com suporte total a navegação por teclado e leitores de tela.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Fechar
            </Button>
            <Button variant="primary" onClick={() => { setIsModalOpen(false); showToast('Salvo com sucesso!', 'success'); }}>
              Salvar Alterações
            </Button>
          </div>
        </div>
      </Modal>

      {/* ConfirmDialog Demo */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => { setIsConfirmOpen(false); showToast('Registro excluído com sucesso.', 'success'); }}
        title="Confirmar exclusão permanente"
        message="Tem certeza que deseja remover este item da organização? Esta ação não poderá ser desfeita."
        confirmText="Sim, excluir"
        variant="danger"
      />
    </div>
  );
};
