import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc, Timestamp, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PendingSale, OperationType } from '../types';
import { handleFirestoreError, formatCurrency, formatDate } from '../utils';
import { User } from 'firebase/auth';
import { Clock, User as UserIcon, Package, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface PendingSalesProps {
  pendingSales: PendingSale[];
  user: User;
}

export default function PendingSales({ pendingSales, user }: PendingSalesProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState<PendingSale | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [bagsToPay, setBagsToPay] = useState<string>('');

  const handlePaymentReceived = async (sale: PendingSale, bags: number) => {
    if (bags <= 0 || bags > sale.bagsTaken) return;

    setLoading(sale.id!);
    try {
      const totalPaid = bags * sale.pricePerBag;

      // 1. Add to normal sales
      await addDoc(collection(db, 'sales'), {
        uid: user.uid,
        stockId: sale.stockId,
        date: Timestamp.now(),
        bagsSold: bags,
        pricePerBag: sale.pricePerBag,
        total: totalPaid
      });

      // 2. Update stock
      await updateDoc(doc(db, 'stocks', sale.stockId), {
        remainingBags: increment(-bags)
      });

      // 3. Update or delete from pending sales
      if (bags === sale.bagsTaken) {
        await deleteDoc(doc(db, 'pendingSales', sale.id!));
      } else {
        const newBagsTaken = sale.bagsTaken - bags;
        await updateDoc(doc(db, 'pendingSales', sale.id!), {
          bagsTaken: newBagsTaken,
          total: newBagsTaken * sale.pricePerBag,
          amountPaid: increment(totalPaid),
          status: 'partially_paid'
        });
      }
      setConfirmingPayment(null);
      setBagsToPay('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pendingSales/${sale.id}`);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (saleId: string) => {
    setLoading(saleId);
    try {
      await deleteDoc(doc(db, 'pendingSales', saleId));
      setConfirmingDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pendingSales/${saleId}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Charbon pris / en attente</h1>
        <p className="text-stone-500">Gérez les sacs pris par les revendeurs qui paieront plus tard.</p>
      </header>

      {pendingSales.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 border-dashed py-20 text-center">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
            <Clock className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Aucun paiement en attente</h2>
          <p className="text-stone-500">Tous vos comptes sont à jour.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingSales.map((sale) => (
            <div key={sale.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-500">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">{sale.clientName}</h3>
                    <p className="text-xs text-stone-400">Pris le {formatDate(sale.date.toDate())}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setConfirmingDelete(sale.id!)}
                  className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-2xl">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Sacs pris</p>
                  <p className="text-xl font-bold text-stone-900">{sale.bagsTaken}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Prix / Sac</p>
                  <p className="text-xl font-bold text-stone-900">{formatCurrency(sale.pricePerBag)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total à payer</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(sale.total)}</p>
                </div>
                <button
                  onClick={() => setConfirmingPayment(sale)}
                  disabled={loading === sale.id}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-100"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading === sale.id ? 'Traitement...' : 'Paiement reçu'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmingPayment && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-stone-900">Enregistrer un paiement</h3>
              <p className="text-stone-500 text-sm">
                Combien de sacs <span className="font-bold text-stone-900">{confirmingPayment.clientName}</span> règle-t-il aujourd'hui ?
              </p>
            </div>
            
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">Sacs restants à payer :</span>
                  <span className="font-bold text-stone-900">{confirmingPayment.bagsTaken} sacs</span>
                </div>
                <div className="flex gap-2">
                  {[1, 5, confirmingPayment.bagsTaken].map(n => (
                    <button
                      key={n}
                      onClick={() => setBagsToPay(n.toString())}
                      className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-600 transition-all"
                    >
                      {n === confirmingPayment.bagsTaken ? 'Tout' : `+${n}`}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase">Nombre de sacs payés</label>
                  <input
                    type="number"
                    value={bagsToPay}
                    onChange={(e) => setBagsToPay(e.target.value)}
                    placeholder={`Ex: 3`}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none text-center font-bold text-lg"
                  />
                </div>
                {bagsToPay && parseInt(bagsToPay) > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                    <p className="text-xs text-emerald-600 font-bold uppercase text-center">Montant à recevoir</p>
                    <p className="text-2xl font-bold text-emerald-700 text-center">
                      {formatCurrency(parseInt(bagsToPay) * confirmingPayment.pricePerBag)}
                    </p>
                    {parseInt(bagsToPay) < confirmingPayment.bagsTaken && (
                      <p className="text-[10px] text-emerald-600 text-center italic mt-1">
                        Reste après paiement : {confirmingPayment.bagsTaken - parseInt(bagsToPay)} sacs
                      </p>
                    )}
                  </div>
                )}
              </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmingPayment(null);
                  setBagsToPay('');
                }}
                className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => handlePaymentReceived(confirmingPayment, parseInt(bagsToPay))}
                disabled={!!loading || !bagsToPay || parseInt(bagsToPay) <= 0 || parseInt(bagsToPay) > confirmingPayment.bagsTaken}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {loading ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-stone-900">Supprimer l'enregistrement</h3>
              <p className="text-stone-500">
                Cette action est irréversible. Voulez-vous vraiment supprimer cette dette ?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingDelete(null)}
                className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmingDelete)}
                disabled={!!loading}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                {loading ? '...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <h4 className="font-bold text-orange-900">Note sur le stock</h4>
          <p className="text-sm text-orange-700">
            Le stock n'est déduit que lorsque vous cliquez sur <strong>"Paiement reçu"</strong>. 
            Assurez-vous d'avoir assez de sacs en réserve pour couvrir ces transactions.
          </p>
        </div>
      </div>
    </div>
  );
}
