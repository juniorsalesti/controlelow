import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Operation, OperationalStatus } from '../types';
import { 
  TrendingUp, 
  Plus, 
  MoreVertical, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Search,
  Globe,
  Tag,
  Activity,
  Edit2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { formatCurrency, formatROI, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';

const statusColors: Record<OperationalStatus, string> = {
  'Teste de criativo': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Teste de público': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Validação': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Pré escala': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Escala': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Escala agressiva': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Pausada': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  'Negativa': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OperationalStatus | 'Todos'>('Todos');
  
  // New Operation Form State
  const [newOp, setNewOp] = useState({
    name: '',
    product: '',
    country: 'Brasil',
    trafficPlatform: 'Meta Ads' as const,
    salesPlatform: 'Hotmart',
    averageTicket: 0,
    status: 'Teste de criativo' as OperationalStatus,
    offerLink: '',
  });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'operations'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation));
      setOperations(ops);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'operations'), {
        ...newOp,
        userId: user.uid,
        totalInvested: 0,
        totalRevenue: 0,
        totalProfit: 0,
        roi: 0,
        cpa: 0,
        roas: 0,
        margin: 0,
        startDate: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setNewOp({
        name: '',
        product: '',
        country: 'Brasil',
        trafficPlatform: 'Meta Ads',
        salesPlatform: 'Hotmart',
        averageTicket: 0,
        status: 'Teste de criativo',
        offerLink: '',
      });
    } catch (error) {
      console.error('Error creating operation:', error);
    }
  };

  const handleDeleteOperation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta operação?')) {
      try {
        await deleteDoc(doc(db, 'operations', id));
      } catch (error) {
        console.error('Error deleting operation:', error);
      }
    }
  };

  const filteredOperations = operations.filter(op => {
    const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          op.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || op.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totals = filteredOperations.reduce((acc, op) => ({
    invested: acc.invested + (op.totalInvested || 0),
    revenue: acc.revenue + (op.totalRevenue || 0),
    profit: acc.profit + (op.totalProfit || 0),
  }), { invested: 0, revenue: 0, profit: 0 });

  const totalROI = totals.invested > 0 ? (totals.profit / totals.invested) * 100 : 0;

  const platformBreakdown = filteredOperations.reduce((acc: any, op) => {
    const platform = op.trafficPlatform || 'Outros';
    if (!acc[platform]) acc[platform] = { invested: 0, revenue: 0, profit: 0, count: 0 };
    acc[platform].invested += op.totalInvested || 0;
    acc[platform].revenue += op.totalRevenue || 0;
    acc[platform].profit += op.totalProfit || 0;
    acc[platform].count += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Comando Central</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie e monitore suas operações de escala.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nova Operação
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Visão Geral (Consolidado)
        </h2>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard 
            label="Faturamento Total" 
            value={formatCurrency(totals.revenue)} 
            description="Receita bruta filtrada"
            icon={ArrowUpRight}
          />
          <SummaryCard 
            label="Investimento Total" 
            value={formatCurrency(totals.invested)} 
            description="Gasto em tráfego filtrado"
            icon={Activity}
            variant="neutral"
          />
          <SummaryCard 
            label="Lucro Líquido" 
            value={formatCurrency(totals.profit)} 
            description="Saldo final filtrado"
            icon={TrendingUp}
            variant={totals.profit >= 0 ? 'success' : 'danger'}
          />
          <SummaryCard 
            label="ROI Médio" 
            value={formatROI(totalROI)} 
            description="Retorno sobre investimento"
            icon={Tag}
            variant={totalROI >= 0 ? 'success' : 'danger'}
          />
        </div>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(platformBreakdown).map(([platform, data]: [string, any]) => (
            <div key={platform} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">{platform}</p>
                <p className="text-lg font-bold dark:text-white">{formatCurrency(data.profit)}</p>
                <p className="text-[10px] text-slate-500">{data.count} operações</p>
              </div>
              <div className="text-right">
                <p className={cn("text-xs font-bold", (data.profit / (data.invested || 1)) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatROI(data.invested > 0 ? (data.profit / data.invested) * 100 : 0)}
                </p>
                <p className="text-[10px] text-slate-400">ROI Plataforma</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Performance por Operação
          </h2>
          <div className="text-xs text-slate-500 font-medium">
            {filteredOperations.length} operações encontradas
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou produto..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <select 
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="Todos">Todos os Status</option>
              {Object.keys(statusColors).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Operations Table/Grid */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium text-sm border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Operação</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Faturamento</th>
                  <th className="px-6 py-4 text-center">ROI</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando operações...</td>
                  </tr>
                ) : filteredOperations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                         <Plus className="w-8 h-8 opacity-20" />
                         <p>Nenhuma operação encontrada.</p>
                         <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-semibold hover:underline mt-2">
                           Crie sua primeira operação
                         </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredOperations.map((op) => (
                      <tr 
                        key={op.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/operation/${op.id}`)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                              {op.trafficPlatform === 'Meta Ads' && <span className="text-blue-500 font-bold text-xs">M</span>}
                              {op.trafficPlatform === 'Google' && <span className="text-red-500 font-bold text-xs">G</span>}
                              {op.trafficPlatform === 'TikTok' && <span className="text-pink-500 font-bold text-xs">T</span>}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{op.name}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Globe className="w-3 h-3" /> {op.country} • {op.product}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap", statusColors[op.status])}>
                            {op.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(op.totalRevenue)}</p>
                            <p className="text-xs text-slate-500">Lucro: {formatCurrency(op.totalProfit)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1 font-bold text-sm",
                            op.roi > 0 ? "text-green-600" : op.roi < 0 ? "text-red-600" : "text-slate-500"
                          )}>
                            {formatROI(op.roi)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => handleDeleteOperation(op.id, e)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <Link to={`/operation/${op.id}`}>
                               <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-slate-400 hover:text-blue-500 rounded-lg transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* TOTAL ROW */}
                    <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="px-6 py-4 dark:text-white">TOTAL (Filtrado)</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{filteredOperations.length} Operações</td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-sm dark:text-white">{formatCurrency(totals.revenue)}</p>
                          <p className="text-xs text-slate-500">Lucro: {formatCurrency(totals.profit)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "text-sm",
                          totals.profit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatROI(totalROI)}
                        </span>
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Create Operation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <form onSubmit={handleCreateOperation}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold dark:text-white">Criar Nova Operação</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus className="rotate-45 w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nome da Operação</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Escala de Verão Caps" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newOp.name}
                      onChange={(e) => setNewOp({...newOp, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Produto</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Produto X" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newOp.product}
                      onChange={(e) => setNewOp({...newOp, product: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">País</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Brasil" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newOp.country}
                      onChange={(e) => setNewOp({...newOp, country: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plataforma de Tráfego</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newOp.trafficPlatform}
                      onChange={(e) => setNewOp({...newOp, trafficPlatform: e.target.value as any})}
                    >
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="Google">Google Ads</option>
                      <option value="TikTok">TikTok Ads</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plataforma de Venda</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Hotmart" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newOp.salesPlatform}
                      onChange={(e) => setNewOp({...newOp, salesPlatform: e.target.value})}
                    />
                  </div>
                   <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ticket Médio (R$)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newOp.averageTicket}
                      onChange={(e) => setNewOp({...newOp, averageTicket: Number(e.target.value)})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Link da Oferta</label>
                    <input 
                      type="url" 
                      placeholder="https://..." 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newOp.offerLink}
                      onChange={(e) => setNewOp({...newOp, offerLink: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                  >
                    Criar Operação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value, description, icon: Icon, trend, variant = 'info' }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <Icon className="w-4 h-4 text-blue-500" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold flex items-center mb-1",
            trend > 0 ? "text-green-600" : "text-red-600"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}
