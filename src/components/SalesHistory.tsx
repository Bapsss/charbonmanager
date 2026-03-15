import React from 'react';
import { Sale } from '../types';
import { formatCurrency } from '../utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShoppingBag, Calendar, Tag } from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
}

export default function SalesHistory({ sales }: SalesHistoryProps) {
  if (sales.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Aucune vente enregistrée</h2>
        <p className="text-stone-500">Vos ventes apparaîtront ici une fois enregistrées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Historique des ventes</h1>
        <p className="text-stone-500">Liste complète de vos transactions.</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-bottom border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Sacs</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Prix / Sac</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sales.map((sale) => (
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
    </div>
  );
}
