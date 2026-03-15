import React from 'react';
import { Sale, Stock } from '../types';
import { formatCurrency } from '../utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfDay, eachDayOfInterval, subDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StatsProps {
  sales: Sale[];
  stock: Stock | null;
}

export default function Stats({ sales, stock }: StatsProps) {
  // Prepare data for the last 7 days
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const chartData = last7Days.map(day => {
    const daySales = sales.filter(s => isSameDay(s.date.toDate(), day));
    return {
      name: format(day, 'EEE', { locale: fr }),
      date: format(day, 'dd/MM'),
      sacs: daySales.reduce((acc, s) => acc + s.bagsSold, 0),
      revenu: daySales.reduce((acc, s) => acc + s.total, 0)
    };
  });

  const totalSacsVendus = sales.reduce((acc, s) => acc + s.bagsSold, 0);
  const stockRestant = stock ? stock.initialStock - totalSacsVendus : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Statistiques</h1>
        <p className="text-stone-500">Analyse de vos performances de vente.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Ventes par jour */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Sacs vendus (7 derniers jours)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f5f5f4'}}
                />
                <Bar dataKey="sacs" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenu par jour */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Revenu (7 derniers jours)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="revenu" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenu)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stock Evolution Mockup/Logic */}
      <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-lg">
        <h3 className="text-xl font-bold mb-6">Résumé Global</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Stock Initial</p>
            <p className="text-2xl font-bold">{stock?.initialStock || 0}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Total Vendu</p>
            <p className="text-2xl font-bold">{totalSacsVendus}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Stock Restant</p>
            <p className="text-2xl font-bold text-orange-400">{stockRestant}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Taux d'écoulement</p>
            <p className="text-2xl font-bold">
              {stock?.initialStock ? ((totalSacsVendus / stock.initialStock) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
