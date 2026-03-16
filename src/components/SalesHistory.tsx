import React, { useState } from 'react';
import { Sale, Stock, OperationType } from '../types';
import { formatCurrency, handleFirestoreError } from '../utils';
import { format, isToday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShoppingBag, Calendar, Tag, Filter, ChevronDown, Trash2, Edit2, X, Check } from 'lucide-react';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface SalesHistoryProps {
  sales: Sale[];
  allStocks: Stock[];
}

type FilterType = 'all' | 'today' | 'date';

export default function SalesHistory({ sales, allStocks }: SalesHistoryProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editBags, setEditBags] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  const handleDeleteSale = async (sale: Sale) => {
    setLoading(sale.id!);
    try {
      // 1. Update stock remaining bags
      const stockRef = doc(db, 'stocks', sale.stockId);
      await updateDoc(stockRef, {
        remainingBags: increment(sale.bagsSold)
      });

      // 2. Delete the sale
      await deleteDoc(doc(db, 'sales', sale.id!));
      setDeletingSaleId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sales/${sale.id}`);
    } finally {
      setLoading(null);
    }
  };

  const handleStartEdit = (sale: Sale) => {
    setEditingSale(sale);
    setEditBags(sale.bagsSold.toString());
    setEditPrice(sale.pricePerBag.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingSale) return;
    const newBags = parseInt(editBags);
    const newPrice = parseFloat(editPrice);
    
    if (isNaN(newBags) || newBags <= 0 || isNaN(newPrice) || newPrice <= 0) return;

    setLoading(editingSale.id!);
    try {
      const bagsDiff = newBags - editingSale.bagsSold;
      
      // 1. Update stock remaining bags (subtract the difference)
      const stockRef = doc(db, 'stocks', editingSale.stockId);
      await updateDoc(stockRef, {
        remainingBags: increment(-bagsDiff)
      });

      // 2. Update the sale
      await updateDoc(doc(db, 'sales', editingSale.id!), {
        bagsSold: newBags,
        pricePerBag: newPrice,
        total: newBags * newPrice
      });

      setEditingSale(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sales/${editingSale.id}`);
    } finally {
      setLoading(null);
    }
  };

  const filteredSales = sales
    .filter((sale) => {
      const saleDate = sale.date.toDate();
      if (filterType === 'today') {
        return isToday(saleDate);
      }
      if (filterType === 'date') {
        return isSameDay(saleDate, new Date(selectedDate));
      }
      return true;
    })
    .sort((a, b) => b.date.toMillis() - a.date.toMillis());

  const noSalesMessage = () => {
    if (sales.length === 0) return "Aucune vente enregistrée";
    if (filterType === 'today') return "Aucune vente aujourd'hui";
    if (filterType === 'date') return `Aucune vente le ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}`;
    return "Aucune vente trouvée";
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Historique des ventes</h1>
          <p className="text-stone-500">Consultez et filtrez vos transactions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterType === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            Toutes les ventes
          </button>
          <button
            onClick={() => setFilterType('today')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterType === 'today'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            Aujourd'hui
          </button>
          <div className="relative flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setFilterType('date');
              }}
              className={`pl-4 pr-10 py-2 rounded-xl text-sm font-bold border transition-all outline-none appearance-none cursor-pointer ${
                filterType === 'date'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            />
            <Calendar className={`absolute right-3 w-4 h-4 pointer-events-none ${
              filterType === 'date' ? 'text-stone-400' : 'text-stone-400'
            }`} />
          </div>
        </div>
      </header>

      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 border-dashed py-20 text-center">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">{noSalesMessage()}</h2>
          <p className="text-stone-500">Ajustez vos filtres pour voir d'autres résultats.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Sacs vendus</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Prix / Sac</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-stone-500">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {format(sale.date.toDate(), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-xs text-stone-400">
                            {format(sale.date.toDate(), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingSale?.id === sale.id ? (
                        <input
                          type="number"
                          value={editBags}
                          onChange={(e) => setEditBags(e.target.value)}
                          className="w-20 px-2 py-1 border border-stone-200 rounded-lg text-sm"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-stone-400" />
                          <span className="text-sm font-medium text-stone-700">{sale.bagsSold} sacs</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500">
                      {editingSale?.id === sale.id ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 px-2 py-1 border border-stone-200 rounded-lg text-sm"
                        />
                      ) : (
                        formatCurrency(sale.pricePerBag)
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingSale?.id === sale.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={loading === sale.id}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSale(null)}
                            className="p-1 text-stone-400 hover:bg-stone-100 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : deletingSaleId === sale.id ? (
                        <div className="flex justify-end items-center gap-2 animate-in fade-in slide-in-from-right-2">
                          <span className="text-[10px] font-bold text-red-500 uppercase">Confirmer ?</span>
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            disabled={loading === sale.id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSaleId(null)}
                            disabled={loading === sale.id}
                            className="p-1 text-stone-400 hover:bg-stone-100 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleStartEdit(sale)}
                            className="p-1 text-stone-400 hover:text-blue-600 transition-all"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSaleId(sale.id!)}
                            disabled={loading === sale.id}
                            className="p-1 text-stone-400 hover:text-red-500 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
