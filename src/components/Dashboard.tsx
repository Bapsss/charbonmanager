import React from 'react';
import { Sale, Stock } from '../types';
import { formatCurrency } from '../utils';
import { Package, ShoppingBag, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { isToday, differenceInDays } from 'date-fns';

interface DashboardProps {
  sales: Sale[];
  stock: Stock | null;
}

export default function Dashboard({ sales, stock }: DashboardProps) {
  const totalSacsVendus = sales.reduce((acc, s) => acc + s.bagsSold, 0);
  const stockRestant = stock ? stock.initialStock - totalSacsVendus : 0;
  
  const salesToday = sales.filter(s => isToday(s.date.toDate()));
  const sacsVendusAujourdhui = salesToday.reduce((acc, s) => acc + s.bagsSold, 0);
  const revenuAujourdhui = salesToday.reduce((acc, s) => acc + s.total, 0);
  
  const revenuTotal = sales.reduce((acc, s) => acc + s.total, 0);

  // Stats for predictions
  const daysActive = sales.length > 0 ? differenceInDays(new Date(), sales[sales.length - 1].date.toDate()) + 1 : 0;
  const moyenneJournaliere = daysActive > 0 ? totalSacsVendus / daysActive : 0;
  const joursRestants = moyenneJournaliere > 0 ? Math.floor(stockRestant / moyenneJournaliere) : 0;

  const stockStatus = () => {
    if (stockRestant <= 0) return { label: 'Épuisé', color: 'bg-stone-100 text-stone-600', icon: AlertTriangle };
    if (stockRestant < 20) return { label: 'Stock faible', color: 'bg-red-100 text-red-600', icon: AlertTriangle };
    return { label: 'En stock', color: 'bg-emerald-100 text-emerald-600', icon: Package };
  };

  const status = stockStatus();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Tableau de bord</h1>
        <p className="text-stone-500">Aperçu de votre activité aujourd'hui.</p>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-stone-500 text-sm font-medium">Stock restant</p>
          <h2 className="text-4xl font-bold text-stone-900 mt-1">{stockRestant} <span className="text-lg font-normal text-stone-400">sacs</span></h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-stone-500 text-sm font-medium">Vendus aujourd'hui</p>
          <h2 className="text-4xl font-bold text-stone-900 mt-1">{sacsVendusAujourdhui} <span className="text-lg font-normal text-stone-400">sacs</span></h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-stone-500 text-sm font-medium">Revenu aujourd'hui</p>
          <h2 className="text-3xl font-bold text-stone-900 mt-1">{formatCurrency(revenuAujourdhui)}</h2>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-stone-400 text-sm font-medium mb-1">Revenu Total</p>
            <h3 className="text-3xl font-bold mb-6">{formatCurrency(revenuTotal)}</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Total sacs vendus</p>
                <p className="text-xl font-semibold">{totalSacsVendus}</p>
              </div>
              <div className="w-px h-10 bg-stone-800"></div>
              <div className="flex-1">
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Moyenne / jour</p>
                <p className="text-xl font-semibold">{moyenneJournaliere.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <TrendingUp className="w-48 h-48" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex flex-col justify-center text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="text-stone-500 font-medium mb-1">Estimation rupture de stock</h3>
          <p className="text-4xl font-bold text-stone-900">
            {joursRestants} <span className="text-lg font-normal text-stone-400">jours</span>
          </p>
          <p className="text-xs text-stone-400 mt-2 italic">Basé sur votre moyenne de vente journalière.</p>
        </div>
      </div>
    </div>
  );
}
