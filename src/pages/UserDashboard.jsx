import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, query, collection, where, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [crediti, setCrediti] = useState(0);
  const [transazioni, setTransazioni] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bonusCompleannoAttivo, setBonusCompleannoAttivo] = useState(false);

  const [totaleAcquistati, setTotaleAcquistati] = useState(0);
  const [totaleOmaggio, setTotaleOmaggio] = useState(0);

  // 🔥 FUNZIONE PER CONTROLLARE IL COMPLEANNO E REGALARE 2 CREDITI
  const controllaCompleanno = async (data) => {
    if (!user || !data || !data.dataNascita) return;

    const oggi = new Date();
    const nascita = new Date(data.dataNascita);
    
    const isCompleanno = 
      oggi.getDate() === nascita.getDate() && 
      oggi.getMonth() === nascita.getMonth();

    if (!isCompleanno) return;

    const ultimoCompleanno = data.ultimoCompleanno;
    if (ultimoCompleanno) {
      const ultimoAnno = new Date(ultimoCompleanno).getFullYear();
      if (ultimoAnno === oggi.getFullYear()) {
        return;
      }
    }

    try {
      const userRef = doc(db, "utenti", user.uid);
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) return;
        
        const current = userSnap.data().crediti || 0;
        const nuovo = current + 2;

        transaction.update(userRef, { 
          crediti: nuovo,
          ultimoCompleanno: new Date()
        });
        
        transaction.set(doc(collection(db, "transazioni")), {
          userId: user.uid,
          managerId: null,
          importo: 2,
          descrizione: "🎂 Buon Compleanno! (+2 crediti)",
          timestamp: new Date(),
          creditiAcquistati: 0,
          creditiOmaggio: 2,
          nuovoSaldo: nuovo
        });
      });
      
      setBonusCompleannoAttivo(true);
      alert('🎉🎂 Buon Compleanno! Hai ricevuto 2 crediti omaggio!');
    } catch (err) {
      console.error("❌ Errore nel regalo di compleanno:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "utenti", user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCrediti(data.crediti || 0);
        setUserData(data);
        controllaCompleanno(data);
      }
    });

    const q = query(collection(db, "transazioni"), where("userId", "==", user.uid));
    const unsubTx = onSnapshot(q, (snapshot) => {
      const list = [];
      let acquistati = 0;
      let omaggio = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({ 
          id: doc.id, 
          ...data,
          dataTransazione: data.timestamp?.toDate?.() || data.timestamp || new Date()
        });
        
        if (data.creditiAcquistati) {
          acquistati += data.creditiAcquistati;
        }
        if (data.creditiOmaggio) {
          omaggio += data.creditiOmaggio;
        }
      });
      
      setTotaleAcquistati(acquistati);
      setTotaleOmaggio(omaggio);
      
      list.sort((a, b) => {
        const timeA = a.dataTransazione instanceof Date ? a.dataTransazione.getTime() : 0;
        const timeB = b.dataTransazione instanceof Date ? b.dataTransazione.getTime() : 0;
        return timeA - timeB;
      });
      
      setTransazioni(list);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubTx();
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formattaData = (data) => {
    if (!data) return 'Data non disponibile';
    try {
      const date = data instanceof Date ? data : new Date(data);
      if (isNaN(date.getTime())) return 'Data non valida';
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data non disponibile';
    }
  };

  const pulisciDescrizione = (descrizione) => {
    if (!descrizione) return 'Operazione';
    return descrizione.replace(/\s*\(\d+\s*crediti\)\s*$/, '');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>⏳ Caricamento...</p>
    </div>
  );

  const totaleGenerale = totaleAcquistati + totaleOmaggio;

  // 🔥 GENERA IL CODICE AMICO DAL NOME DEL CANE
  const codiceAmicoGenerato = userData?.nomeCane 
    ? `AMICODI${userData.nomeCane.replace(/\s/g, '').toUpperCase()}`
    : 'NESSUN CANE REGISTRATO';

  return (
    <div className="min-h-screen p-4 relative overflow-hidden"
         style={{
           background: 'linear-gradient(180deg, #FFFFFF 0%, #B3E0FF 50%, #66B5FF 100%)'
         }}>
      
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none select-none">
        <div className="text-center">
          <img 
            src="/disegno-erika2-font.png" 
            alt="Erika Educatore Cinofilo"
            className="w-[600px] h-auto max-w-[90vw] object-contain"
          />
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-700">🐕 I miei crediti</h1>
          <button 
            onClick={handleLogout} 
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition shadow-md hover:shadow-lg"
          >
            Esci
          </button>
        </div>

        {userData && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4 border border-white/30">
            <h2 className="font-semibold text-gray-700 mb-2">📋 I miei dati</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Nome:</span> {userData.nome} {userData.cognome}</div>
              <div><span className="text-gray-500">Email:</span> {userData.email}</div>
              <div><span className="text-gray-500">Telefono:</span> {userData.telefono}</div>
              <div><span className="text-gray-500">Cane:</span> {userData.nomeCane}</div>
              <div><span className="text-gray-500">Data di nascita:</span> {userData.dataNascita ? formattaData(userData.dataNascita) : 'Non specificata'}</div>
              <div className="col-span-2">
                <span className="text-gray-500">🎁 Codice porta un amico:</span> 
                <span className="font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded ml-1">
                  {codiceAmicoGenerato}
                </span>
                <span className="text-xs text-gray-400 ml-2">(dai questo codice ai tuoi amici)</span>
              </div>
              <div className="col-span-2"><span className="text-gray-500">Indirizzo:</span> {userData.indirizzo?.via} {userData.indirizzo?.numero}, {userData.indirizzo?.paese} ({userData.indirizzo?.provincia}) {userData.indirizzo?.cap}</div>
            </div>
          </div>
        )}

        {/* 🔥 RIEPILOGO CREDITI CON VALORE IN EURO */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4 border border-white/30">
          <h2 className="font-semibold text-gray-700 mb-2 text-center">📊 Riepilogo crediti</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50/80 rounded-xl p-3">
              <p className="text-xs text-gray-500">Acquistati</p>
              <p className="text-2xl font-bold text-blue-600">{totaleAcquistati}</p>
              <p className="text-xs text-green-600 font-medium">
                💰 {(totaleAcquistati * 5).toFixed(2)} €
              </p>
            </div>
            <div className="bg-green-50/80 rounded-xl p-3">
              <p className="text-xs text-gray-500">Omaggio</p>
              <p className="text-2xl font-bold text-green-600">{totaleOmaggio}</p>
              <p className="text-xs text-green-600 font-medium">
                💰 {(totaleOmaggio * 5).toFixed(2)} €
              </p>
            </div>
            <div className="bg-indigo-50/80 rounded-xl p-3">
              <p className="text-xs text-gray-500">Disponibili</p>
              <p className="text-2xl font-bold text-indigo-600">{crediti}</p>
              <p className="text-xs text-green-600 font-medium">
                💰 {(crediti * 5).toFixed(2)} €
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-4 border border-white/30">
          <h2 className="font-semibold text-gray-700 mb-3">📋 Storico transazioni</h2>
          {transazioni.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">Nessuna attività registrata.</p>
          )}
          <ul className="divide-y divide-gray-100">
            {transazioni.slice(0, 15).map(tx => {
              const importo = tx.importo || 0;
              const descrizione = pulisciDescrizione(tx.descrizione || 'Operazione');
              const dataFormattata = formattaData(tx.dataTransazione);
              
              const dettaglioBonus = tx.creditiAcquistati && tx.creditiOmaggio > 0
                ? ` (${tx.creditiAcquistati} acquistati + ${tx.creditiOmaggio} omaggio)`
                : '';
              
              return (
                <li key={tx.id} className="py-3 flex flex-wrap justify-between items-center">
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 block">
                      {descrizione}
                      {dettaglioBonus && (
                        <span className="text-xs text-gray-400">{dettaglioBonus}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 block">
                      📅 {dataFormattata}
                    </span>
                  </div>
                  <span className={`font-bold ${importo > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {importo > 0 ? '+' : ''}{importo}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}