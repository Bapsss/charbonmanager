import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, Timestamp, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Stock, Sale, OperationType, PendingSale } from '../types';
import { handleFirestoreError, formatDate, formatCurrency } from '../utils';
import { User } from 'firebase/auth';
import { Package, Plus, Calendar, History, ArrowRight, AlertTriangle, TrendingUp, Trash2, Check, X } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface StockManagerProps {
  stock: Stock | null;
  allStocks: Stock[];
  sales: Sale[];
  user: User;
}

export default function StockManager({ stock, allStocks, sales, user }: StockManagerProps) {
  const [initialBags, setInitialBags] = useState('');
  const [initialExpenses, setInitialExpenses] = useState('');
  const [transportPerBag, setTransportPerBag] = useState('');
  const [standPerDay, setStandPerDay] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletingStockId, setDeletingStockId] = useState<string | null>(null);

  const handleDeleteStock = async (stockId: string) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Delete sales associated with this stock
      const salesQuery = query(collection(db, 'sales'), where('stockId', '==', stockId));
      const salesSnap = await getDocs(salesQuery);
      salesSnap.forEach((d) => batch.delete(d.ref));

      // 2. Delete pending sales associated with this stock
      const pendingQuery = query(collection(db, 'pendingSales'), where('stockId', '==', stockId));
      const pendingSnap = await getDocs(pendingQuery);
      pendingSnap.forEach((d) => batch.delete(d.ref));

      // 3. Delete the stock itself
      batch.delete(doc(db, 'stocks', stockId));

      await batch.commit();
      setDeletingStockId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `stocks/${stockId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const bags = parseInt(initialBags);
    const expenses = parseFloat(initialExpenses) || 0;
    const transport = parseFloat(transportPerBag) || 0;
    const stand = parseFloat(standPerDay) || 0;

    if (isNaN(bags) || bags <= 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'stocks'), {
        uid: user.uid,
        initialBags: bags,
        remainingBags: bags,
        initialExpenses: expenses,
        transportPerBag: transport,
        standPerDay: stand,
        startDate: Timestamp.fromDate(new Date(startDate)),
        status: 'active'
      });
      setInitialBags('');
      setInitialExpenses('');
      setTransportPerBag('');
      setStandPerDay('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'stocks');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStock = async (stockId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'stocks', stockId), {
        status: 'completed',
        completedAt: Timestamp.now()
      });
      setShowConfirm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stocks/${stockId}`);
    } finally {
      setLoading(false);
    }
  };

  const getStockRevenue = (stockId: string) => {
    return sales
      .filter(s => s.stockId === stockId)
      .reduce((acc, s) => acc + s.total, 0);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Cycles de Stock</h1>
        <p className="text-stone-500">Gérez vos périodes de vente et l'approvisionnement.</p>
      </header>

      {/* Active Stock Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          Stock Actuel
        </h2>
        
        {stock ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  Démarré le {formatDate(stock.startDate.toDate())}
                </div>
                <div className="text-3xl font-bold text-stone-900">
                  {stock.remainingBags} <span className="text-lg font-normal text-stone-400">/ {stock.initialBags} sacs restants</span>
                </div>
                <div className="text-emerald-600 font-bold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Revenu actuel : {formatCurrency(getStockRevenue(stock.id!))}
                </div>
              </div>
              
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                >
                  Terminer ce stock
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => handleCompleteStock(stock.id!)}
                    disabled={loading}
                    className="flex-1 md:flex-none px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                    className="flex-1 md:flex-none px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
            
            {stock.remainingBags === 0 && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3 text-orange-700">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">Stock épuisé. Vous avez terminé de vendre ce stock.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-dashed border-stone-300">
            <div className="max-w-md mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto">
                <Plus className="w-8 h-8 text-stone-300" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">Aucun stock actif</h3>
                <p className="text-sm text-stone-500">Ajoutez un nouveau stock pour commencer à enregistrer des ventes.</p>
              </div>
              
              <form onSubmit={handleCreateStock} className="space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase">Nombre de sacs</label>
                    <input
                      type="number"
                      value={initialBags}
                      onChange={(e) => setInitialBags(e.target.value)}
                      placeholder="Ex: 100"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase">Date de début</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase">Dépenses initiales (Ar)</label>
                    <input
                      type="number"
                      value={initialExpenses}
                      onChange={(e) => setInitialExpenses(e.target.value)}
                      placeholder="Coût charbon, patentes..."
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase">Transport par sac (Ar)</label>
                    <input
                      type="number"
                      value={transportPerBag}
                      onChange={(e) => setTransportPerBag(e.target.value)}
                      placeholder="Ex: 500"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">Location stand par jour (Ar)</label>
                    <input
                      type="number"
                      value={standPerDay}
                      onChange={(e) => setStandPerDay(e.target.value)}
                      placeholder="Ex: 2000"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                >
                  Démarrer un nouveau stock
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* History Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <History className="w-5 h-5 text-stone-400" />
          Historique des Stocks
        </h2>
        
        <div className="space-y-3">
          {allStocks.filter(s => s.status === 'completed').length === 0 ? (
            <p className="text-stone-400 text-sm italic">Aucun stock terminé pour le moment.</p>
          ) : (
            allStocks.filter(s => s.status === 'completed').map((s) => {
              const revenue = getStockRevenue(s.id!);
              const days = s.completedAt ? differenceInDays(s.completedAt.toDate(), s.startDate.toDate()) + 1 : 0;
              const expenses = s.initialExpenses + (s.transportPerBag * s.initialBags) + (s.standPerDay * days);
              const profit = revenue - expenses;

              return (
                <div key={s.id} className="bg-white p-5 rounded-2xl border border-stone-200 flex flex-col md:flex-row justify-between gap-4 relative group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="text-stone-900 font-bold">Stock du {formatDate(s.startDate.toDate())}</div>
                      {deletingStockId === s.id ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                          <span className="text-[10px] font-bold text-red-500 uppercase">Confirmer ?</span>
                          <button
                            onClick={() => handleDeleteStock(s.id!)}
                            disabled={loading}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStockId(null)}
                            disabled={loading}
                            className="p-1 text-stone-400 hover:bg-stone-100 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingStockId(s.id!)}
                          className="p-1 text-stone-400 hover:text-red-500 transition-all"
                          title="Supprimer ce stock et ses données"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-stone-500">
                      Terminé le {s.completedAt ? formatDate(s.completedAt.toDate()) : 'N/A'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:flex gap-4 lg:gap-8">
                    <div className="text-center md:text-left">
                      <div className="text-xs text-stone-400 font-bold uppercase">Vendus</div>
                      <div className="font-bold text-stone-900">{s.initialBags - s.remainingBags} sacs</div>
                    </div>
                    <div className="text-center md:text-left">
                      <div className="text-xs text-stone-400 font-bold uppercase">Revenu</div>
                      <div className="font-bold text-emerald-600">{formatCurrency(revenue)}</div>
                    </div>
                    <div className="text-center md:text-left">
                      <div className="text-xs text-stone-400 font-bold uppercase">Bénéfice Réel</div>
                      <div className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(profit)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
