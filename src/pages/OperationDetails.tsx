import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Operation, DailyLog, OperationalStatus } from '../types';
import { 
  ArrowLeft, 
  TrendingUp, 
  Activity, 
  Globe, 
  Tag, 
  Calendar, 
  Plus, 
  Trash2,
  AlertCircle,
  ExternalLink,
  Save,
  Clock,
  Briefcase,
  DollarSign,
  Edit2
} from 'lucide-react';
import { formatCurrency, formatROI, cn } from '../lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const statusOptions: OperationalStatus[] = [
  'Teste de criativo',
  'Teste de público',
  'Validação',
  'Pré escala',
  'Escala',
  'Escala agressiva',
  'Pausada',
  'Negativa'
];

export default function OperationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  
  // Edit Operation Form State
  const [editOp, setEditOp] = useState({
    name: '',
    product: '',
    country: '',
    trafficPlatform: 'Meta Ads' as 'Meta Ads' | 'Google' | 'TikTok',
    salesPlatform: '',
    averageTicket: 0,
    offerLink: '',
  });

  // Daily Log Form
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    invested: 0,
    revenue: 0
  });

  useEffect(() => {
    if (!id) return;

    const opUnsubscribe = onSnapshot(doc(db, 'operations', id), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Operation;
        setOperation({ id: doc.id, ...data });
        setEditOp({
          name: data.name,
          product: data.product,
          country: data.country,
          trafficPlatform: data.trafficPlatform,
          salesPlatform: data.salesPlatform,
          averageTicket: data.averageTicket,
          offerLink: data.offerLink,
        });
      } else {
        navigate('/');
      }
      setLoading(false);
    });

    const logsQuery = query(
      collection(db, 'dailyLogs'), 
      where('operationId', '==', id),
      orderBy('date', 'desc')
    );
    const logsUnsubscribe = onSnapshot(logsQuery, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog)));
    });

    return () => {
      opUnsubscribe();
      logsUnsubscribe();
    };
  }, [id, navigate]);

  const handleEditOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await updateDoc(doc(db, 'operations', id), {
        ...editOp,
        updatedAt: serverTimestamp()
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating operation:', error);
    }
  };

  const handleUpdateStatus = async (status: OperationalStatus) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'operations', id), { 
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !operation) return;

    const profit = newLog.revenue - newLog.invested;
    const roi = newLog.invested > 0 ? (profit / newLog.invested) * 100 : 0;

    try {
      if (editingLogId) {
        // Find existing log to calculate difference
        const oldLog = logs.find(l => l.id === editingLogId);
        if (!oldLog) return;

        await updateDoc(doc(db, 'dailyLogs', editingLogId), {
          ...newLog,
          profit,
          roi,
          updatedAt: serverTimestamp()
        });

        // Update operation totals (revert old, add new)
        const newTotalInvested = operation.totalInvested - oldLog.invested + newLog.invested;
        const newTotalRevenue = operation.totalRevenue - oldLog.revenue + newLog.revenue;
        const newTotalProfit = newTotalRevenue - newTotalInvested;
        const newROI = newTotalInvested > 0 ? (newTotalProfit / newTotalInvested) * 100 : 0;

        await updateDoc(doc(db, 'operations', id), {
          totalInvested: newTotalInvested,
          totalRevenue: newTotalRevenue,
          totalProfit: newTotalProfit,
          roi: newROI,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'dailyLogs'), {
          operationId: id,
          ...newLog,
          profit,
          roi,
          createdAt: serverTimestamp()
        });

        // Update operation totals
        const newTotalInvested = (operation.totalInvested || 0) + newLog.invested;
        const newTotalRevenue = (operation.totalRevenue || 0) + newLog.revenue;
        const newTotalProfit = newTotalRevenue - newTotalInvested;
        const newROI = newTotalInvested > 0 ? (newTotalProfit / newTotalInvested) * 100 : 0;
        
        await updateDoc(doc(db, 'operations', id), {
          totalInvested: newTotalInvested,
          totalRevenue: newTotalRevenue,
          totalProfit: newTotalProfit,
          roi: newROI,
          updatedAt: serverTimestamp()
        });
      }

      setIsLogModalOpen(false);
      setEditingLogId(null);
      setNewLog({
        date: new Date().toISOString().split('T')[0],
        invested: 0,
        revenue: 0
      });
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  const handleOpenEditLog = (log: DailyLog) => {
    setNewLog({
      date: log.date,
      invested: log.invested,
      revenue: log.revenue
    });
    setEditingLogId(log.id);
    setIsLogModalOpen(true);
  };

  const handleOpenAddLog = () => {
    setNewLog({
      date: new Date().toISOString().split('T')[0],
      invested: 0,
      revenue: 0
    });
    setEditingLogId(null);
    setIsLogModalOpen(true);
  };

  const handleDeleteLog = async (log: DailyLog) => {
    if (!id || !operation || !confirm('Excluir este lançamento?')) return;

    try {
      await deleteDoc(doc(db, 'dailyLogs', log.id));

      // Revert totals
      const newTotalInvested = operation.totalInvested - log.invested;
      const newTotalRevenue = operation.totalRevenue - log.revenue;
      const newTotalProfit = newTotalRevenue - newTotalInvested;
      const newROI = newTotalInvested > 0 ? (newTotalProfit / newTotalInvested) * 100 : 0;

      await updateDoc(doc(db, 'operations', id), {
        totalInvested: newTotalInvested,
        totalRevenue: newTotalRevenue,
        totalProfit: newTotalProfit,
        roi: newROI,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!id) return;
    await updateDoc(doc(db, 'operations', id), { notes });
  };

  if (loading || !operation) return <div className="p-8 text-center">Carregando detalhes...</div>;

  const chartData = [...logs].reverse();

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para o Dashboard
        </button>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsEditModalOpen(true)}
             className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
           >
             <Edit2 className="w-4 h-4" /> Editar Operação
           </button>
           <span className="text-xs text-slate-400 ml-4">ID: {operation.id.slice(0, 8)}</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{operation.name}</h1>
              <span className="px-3 py-1 bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                {operation.trafficPlatform}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {operation.product}</span>
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> {operation.country}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Início: {new Date(operation.startDate).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[200px]">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Operacional</label>
            <select 
              className={cn(
                "w-full px-4 py-2.5 rounded-xl font-bold border-2 transition-all outline-none focus:ring-0",
                operation.status === 'Negativa' || operation.status === 'Pausada' 
                  ? "bg-slate-100 border-slate-200 text-slate-700" 
                  : "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              )}
              value={operation.status}
              onChange={(e) => handleUpdateStatus(e.target.value as OperationalStatus)}
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          <DetailStat label="ROI" value={formatROI(operation.roi)} variant={operation.roi > 0 ? 'success' : 'danger'} />
          <DetailStat label="Lucro Total" value={formatCurrency(operation.totalProfit)} variant={operation.totalProfit > 0 ? 'success' : 'danger'} />
          <DetailStat label="Investido" value={formatCurrency(operation.totalInvested || 0)} />
          <DetailStat label="Faturado" value={formatCurrency(operation.totalRevenue || 0)} />
        </div>
      </div>

      {/* Main Grid: Charts & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Performance Histórica
              </h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400">30 Dias</button>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.split('-')[2]} 
                    tick={{fontSize: 12, fill: '#94a3b8'}}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{fontSize: 12, fill: '#94a3b8'}}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `R$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Lançamentos Diários
              </h3>
              <button 
                onClick={handleOpenAddLog}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Lançar Dados
              </button>
            </div>
            
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  Nenhum dado lançado ainda.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl group transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-center min-w-[50px]">
                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                          {new Date(log.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                        </p>
                        <p className="text-lg font-black text-slate-800 dark:text-white leading-none">
                          {log.date.split('-')[2]}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{formatCurrency(log.revenue)}</p>
                        <p className="text-[10px] text-slate-500">Investido: {formatCurrency(log.invested)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", log.roi >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatROI(log.roi)}
                        </p>
                        <p className="text-[10px] text-slate-400">Lucro: {formatCurrency(log.profit)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenEditLog(log)}
                          className="p-2 text-slate-300 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteLog(log)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Info & Notes */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Configurações da Oferta</h3>
            <div className="space-y-6">
              <ReadOnlyField label="Ticket Médio" value={formatCurrency(operation.averageTicket || 0)} icon={DollarSign} />
              <ReadOnlyField label="Plataforma de Venda" value={operation.salesPlatform} icon={Activity} />
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Link da Oferta</label>
                <a 
                  href={operation.offerLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 dark:text-blue-400 hover:underline text-sm truncate group"
                >
                  <span className="truncate">{operation.offerLink || 'Nenhum link configurado'}</span>
                  <ExternalLink className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Anotações Internas</h3>
              <Save className="w-4 h-4 text-slate-300" />
            </div>
            <textarea 
              className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500/20 text-sm dark:text-white resize-none"
              placeholder="Estratégias, aprendizados e próximos passos..."
              defaultValue={operation.notes}
              onBlur={(e) => handleUpdateNotes(e.target.value)}
            />
          </div>

          {/* Operational Alerts Card */}
          {operation.roi < 0 && (
             <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-6 rounded-3xl flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-red-800 dark:text-red-400 text-sm">Alerta de Performance</h4>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                  O ROI está negativo nesta operação. Considere pausar o tráfego ou validar novos criativos.
                </p>
              </div>
            </div>
          )}

          {operation.roi > 50 && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-6 rounded-3xl flex items-start gap-4">
               <div className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-xl">
                 <TrendingUp className="w-5 h-5" />
               </div>
               <div>
                 <h4 className="font-bold text-green-800 dark:text-green-400 text-sm">Oportunidade de Escala</h4>
                 <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                   Performance excelente encontrada! ROI acima de 50%. Momento ideal para aumentar orçamento gradualmente.
                 </p>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Log Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <form onSubmit={handleSaveLog}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold dark:text-white">
                    {editingLogId ? 'Editar Resultado Diário' : 'Lançar Resultado Diário'}
                  </h2>
                  <button type="button" onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus className="rotate-45 w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLog.date}
                      onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Investimento (Gasto Ads)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLog.invested}
                      onChange={(e) => setNewLog({...newLog, invested: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Faturamento (Vendas Brutas)</label>
                    <input 
                      required
                      type="number"
                      step="0.01" 
                      placeholder="0.00" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLog.revenue}
                      onChange={(e) => setNewLog({...newLog, revenue: Number(e.target.value)})}
                    />
                  </div>

                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Lucro Estimado</p>
                       <p className="font-bold dark:text-white">{formatCurrency(newLog.revenue - newLog.invested)}</p>
                     </div>
                     <div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ROI Estimado</p>
                       <p className={cn(
                         "font-bold",
                         (newLog.revenue - newLog.invested) >= 0 ? "text-green-600" : "text-red-600"
                       )}>
                         {newLog.invested > 0 ? formatROI(((newLog.revenue - newLog.invested) / newLog.invested) * 100) : '0%'}
                       </p>
                     </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsLogModalOpen(false)}
                    className="px-6 py-2 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                  >
                    Salvar Resultado
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Operation Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <form onSubmit={handleEditOperation}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold dark:text-white">Editar Operação</h2>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus className="rotate-45 w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nome da Operação</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={editOp.name}
                      onChange={(e) => setEditOp({...editOp, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Produto</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={editOp.product}
                      onChange={(e) => setEditOp({...editOp, product: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">País</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={editOp.country}
                      onChange={(e) => setEditOp({...editOp, country: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plataforma de Tráfego</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={editOp.trafficPlatform}
                      onChange={(e) => setEditOp({...editOp, trafficPlatform: e.target.value as any})}
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
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={editOp.salesPlatform}
                      onChange={(e) => setEditOp({...editOp, salesPlatform: e.target.value})}
                    />
                  </div>
                   <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ticket Médio (R$)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={editOp.averageTicket}
                      onChange={(e) => setEditOp({...editOp, averageTicket: Number(e.target.value)})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Link da Oferta</label>
                    <input 
                      type="url" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={editOp.offerLink}
                      onChange={(e) => setEditOp({...editOp, offerLink: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                  >
                    Salvar Alterações
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

function DetailStat({ label, value, variant = 'neutral' }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn(
        "text-xl font-black",
        variant === 'success' ? "text-green-600" : variant === 'danger' ? "text-red-600" : "text-slate-900 dark:text-white"
      )}>
        {value}
      </p>
    </div>
  );
}

function ReadOnlyField({ label, value, icon: Icon }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</label>
      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</span>
      </div>
    </div>
  );
}
