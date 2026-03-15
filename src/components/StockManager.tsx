import React, { useState } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Stock, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { User } from 'firebase/auth';
import { Package, Save, AlertCircle, CheckCircle2, Plus, Minus } from 'lucide-react';

interface StockManagerProps {
  stock: Stock | null;
  user: User;
}

export default function StockManager({ stock, user }: StockManagerProps) {
  const [adjustment, setAdjustment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAdjust = async (type: 'add' | 'sub') => {
    const val = parseInt(adjustment);
    if (isNaN(val) || val <= 0) return;

    setLoading(true);
    try {
      const currentInitial = stock?.initialStock || 0;
      const newInitial = type === 'add' ? currentInitial + val : Math.max(0, currentInitial - val);

      await setDoc(doc(db, 'stocks', user.uid), {
        uid: user.uid,
        initialStock: newInitial,
        updatedAt: Timestamp.now()
      });
      setAdjustment('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `stocks/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Gestion du stock</h1>
        <p className="text-stone-500">Ajoutez ou retirez des sacs de votre stock total.</p>
      </header>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
              <Package className="w-6 h-6 text-stone-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900">Stock Initial Actuel</h2>
              <p className="text-sm text-stone-500">Total cumulé des sacs reçus.</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-stone-900">{stock?.initialStock || 0}</span>
            <p className="text-xs text-stone-400 uppercase font-bold">sacs</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Ajuster le stock (Nombre de sacs)</label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="Ex: 50"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleAdjust('add')}
              disabled={loading || !adjustment}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              Ajouter
            </button>
            <button
              onClick={() => handleAdjust('sub')}
              disabled={loading || !adjustment}
              className="flex items-center justify-center gap-2 bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all disabled:opacity-50"
            >
              <Minus className="w-5 h-5" />
              Retirer
            </button>
          </div>

          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5" />
              Stock mis à jour avec succès !
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-stone-50 rounded-2xl border border-stone-100">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-stone-400 flex-shrink-0" />
            <p className="text-xs text-stone-500 leading-relaxed">
              Utilisez ces boutons pour enregistrer une nouvelle livraison (Ajouter) ou corriger une erreur (Retirer). 
              Le stock restant sur votre tableau de bord sera mis à jour automatiquement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
