import React, { useState } from 'react';
import { Sale } from '../types';
import { formatCurrency } from '../utils';
import { format, isToday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShoppingBag, Calendar, Tag, Filter, ChevronDown } from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
}

type FilterType = 'all' | 'today' | 'date';

export default function SalesHistory({ sales }: SalesHistoryProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
                  <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Total</th>
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
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-stone-400" />
                        <span className="text-sm font-medium text-stone-700">{sale.bagsSold} sacs</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500">
                      {formatCurrency(sale.pricePerBag)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-stone-900">{formatCurrency(sale.total)}</span>
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
