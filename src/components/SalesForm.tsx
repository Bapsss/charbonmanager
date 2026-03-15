import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Sale, Stock, OperationType } from '../types';
import { handleFirestoreError, formatCurrency } from '../utils';
import { ShoppingBag, DollarSign, AlertCircle, CheckCircle2, Package, User as UserIcon } from 'lucide-react';

interface SalesFormProps {
  stock: Stock | null;
  sales: Sale[];
  onComplete: () => void;
}

export default function SalesForm({ stock, sales, onComplete }: SalesFormProps) {
  const [bagsSold, setBagsSold] = useState('');
  const [pricePerBag, setPricePerBag] = useState('');
  const [clientName, setClientName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !stock) return;

    const bags = parseInt(bagsSold);
    const price = parseFloat(pricePerBag);

    if (isNaN(bags) || bags <= 0) {
      setError('Veuillez entrer un nombre de sacs valide (> 0).');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setError('Veuillez entrer un prix valide (> 0).');
      return;
    }
    if (isPending && !clientName.trim()) {
      setError('Veuillez entrer le nom du client.');
      return;
    }
    if (!isPending && bags > stock.remainingBags) {
      setError('Stock insuffisant !');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isPending) {
        // Record as pending sale
        await addDoc(collection(db, 'pendingSales'), {
          uid: auth.currentUser.uid,
          stockId: stock.id,
          clientName: clientName.trim(),
          date: Timestamp.now(),
          bagsTaken: bags,
          pricePerBag: price,
          total: bags * price
        });
      } else {
        // Record as normal sale
        const saleData = {
          uid: auth.currentUser.uid,
          stockId: stock.id,
          date: Timestamp.now(),
          bagsSold: bags,
          pricePerBag: price,
          total: bags * price
        };

        await addDoc(collection(db, 'sales'), saleData);
        
        await updateDoc(doc(db, 'stocks', stock.id!), {
          remainingBags: increment(-bags)
        });
      }

      setSuccess(true);
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, isPending ? 'pendingSales' : 'sales');
    } finally {
      setLoading(false);
    }
  };

  if (!stock) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 py-12">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto">
          <Package className="w-10 h-10 text-stone-300" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Aucun stock actif</h2>
          <p className="text-stone-500">Vous devez démarrer un nouveau stock avant de pouvoir enregistrer des ventes.</p>
        </div>
        <button
          onClick={() => onComplete()}
          className="px-8 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Vente enregistrée !</h2>
        <p className="text-stone-500">Redirection vers le tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Nouvelle vente</h1>
        <p className="text-stone-500">Enregistrez une transaction pour le stock actuel.</p>
      </header>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <div className="mb-8 p-4 bg-orange-50 rounded-2xl flex items-center justify-between">
          <span className="text-stone-600 font-medium">Stock disponible</span>
          <span className="text-xl font-bold text-orange-600">{stock.remainingBags} sacs</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex p-1 bg-stone-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setIsPending(false)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                !isPending ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Vente directe
            </button>
            <button
              type="button"
              onClick={() => setIsPending(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                isPending ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Paiement plus tard
            </button>
          </div>

          {isPending && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Nom du client / revendeur
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Jean"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                required={isPending}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              {isPending ? 'Nombre de sacs pris' : 'Nombre de sacs vendus'}
            </label>
            <input
              type="number"
              value={bagsSold}
              onChange={(e) => setBagsSold(e.target.value)}
              placeholder="Ex: 5"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Prix par sac (Ar)
            </label>
            <input
              type="number"
              value={pricePerBag}
              onChange={(e) => setPricePerBag(e.target.value)}
              placeholder="Ex: 5000"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              required
            />
          </div>

          {bagsSold && pricePerBag && (
            <div className="p-4 bg-stone-50 rounded-2xl flex justify-between items-center">
              <span className="text-stone-500 text-sm">Total calculé</span>
              <span className="text-xl font-bold text-stone-900">
                {formatCurrency(parseInt(bagsSold) * parseFloat(pricePerBag))}
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || stock.remainingBags === 0}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
          >
            {loading ? 'Enregistrement...' : 'Ajouter la vente'}
          </button>
        </form>
      </div>
    </div>
  );
}
