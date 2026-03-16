import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Sale, Stock, PendingSale, OperationType } from './types';
import { handleFirestoreError } from './utils';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Package, 
  BarChart3, 
  LogOut,
  Flame,
  User as UserIcon,
  Lock,
  AlertCircle,
  Clock
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import SalesForm from './components/SalesForm';
import SalesHistory from './components/SalesHistory';
import StockManager from './components/StockManager';
import Stats from './components/Stats';
import PendingSales from './components/PendingSales';

type Page = 'dashboard' | 'new-sale' | 'history' | 'stock' | 'stats' | 'pending-sales';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [stock, setStock] = useState<Stock | null>(null);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  
  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSales([]);
      setPendingSales([]);
      setStock(null);
      setAllStocks([]);
      return;
    }

    const stocksQuery = query(
      collection(db, 'stocks'),
      where('uid', '==', user.uid),
      orderBy('startDate', 'desc')
    );
    const unsubStock = onSnapshot(stocksQuery, (snapshot) => {
      const stocksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Stock[];
      setAllStocks(stocksData);
      
      const active = stocksData.find(s => s.status === 'active');
      setStock(active || null);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stocks'));

    const salesQuery = query(
      collection(db, 'sales'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
      setSales(salesData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));

    const pendingSalesQuery = query(
      collection(db, 'pendingSales'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubPending = onSnapshot(pendingSalesQuery, (snapshot) => {
      const pendingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PendingSale[];
      setPendingSales(pendingData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pendingSales'));

    return () => {
      unsubStock();
      unsubSales();
      unsubPending();
    };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    const internalEmail = `${username.toLowerCase()}@charbon.manager`;

    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, internalEmail, password);
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          username: username
        });
      } else {
        await signInWithEmailAndPassword(auth, internalEmail, password);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError('Identifiant ou mot de passe incorrect.');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('Cet identifiant est déjà utilisé.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Le mot de passe doit faire au moins 6 caractères.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('La connexion par ID n\'est pas activée. Allez dans votre console Firebase > Authentification > Sign-in method et activez "E-mail/Mot de passe".');
      } else {
        setAuthError('Une erreur est survenue. Vérifiez votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => signOut(auth);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Flame className="w-12 h-12 text-orange-600 animate-pulse" />
          <p className="text-stone-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Flame className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 text-center mb-2">CharbonManager</h1>
          <p className="text-stone-500 text-center mb-8">Connectez-vous pour gérer vos ventes.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                ID Utilisateur
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="Ex: elina123"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Mot de passe
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {authError}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Patientez...' : (isRegistering ? 'Créer mon compte' : 'Se connecter')}
            </button>
          </form>

          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full mt-4 text-sm text-stone-500 hover:text-orange-600 transition-colors"
          >
            {isRegistering ? 'Déjà un compte ? Connectez-vous' : 'Pas encore de compte ? Créer un ID'}
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard sales={sales} stock={stock} pendingSales={pendingSales} />;
      case 'new-sale': return <SalesForm stock={stock} sales={sales} onComplete={() => setCurrentPage('dashboard')} />;
      case 'history': return <SalesHistory sales={sales} allStocks={allStocks} />;
      case 'pending-sales': return <PendingSales pendingSales={pendingSales} user={user!} />;
      case 'stock': return <StockManager stock={stock} allStocks={allStocks} sales={sales} user={user!} />;
      case 'stats': return <Stats sales={sales} stock={stock} />;
      default: return <Dashboard sales={sales} stock={stock} pendingSales={pendingSales} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'new-sale', label: 'Vente', icon: PlusCircle },
    { id: 'pending-sales', label: 'En attente', icon: Clock },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-0 md:pl-64">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-stone-200 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-stone-900">CharbonManager</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                currentPage === item.id 
                  ? 'bg-orange-50 text-orange-600' 
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-stone-100">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id as Page)}
            className={`flex flex-col items-center gap-1 transition-all ${
              currentPage === item.id ? 'text-orange-600' : 'text-stone-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button onClick={logout} className="flex flex-col items-center gap-1 text-red-400">
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-medium">Quitter</span>
        </button>
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        {renderPage()}
      </main>
    </div>
  );
}

