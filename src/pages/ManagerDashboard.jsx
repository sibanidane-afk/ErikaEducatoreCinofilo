import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, query, where, doc, 
  onSnapshot, runTransaction, updateDoc, getDocs 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [utenti, setUtenti] = useState([]);
  const [utentiFiltrati, setUtentiFiltrati] = useState([]);
  const [ricerca, setRicerca] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [creditiRapidi, setCreditiRapidi] = useState('');
  const [dataRapida, setDataRapida] = useState(new Date().toISOString().split('T')[0]);
  const [utenteSelezionato, setUtenteSelezionato] = useState(null);
  const [mostraDropdown, setMostraDropdown] = useState(false);
  const [attivita, setAttivita] = useState('');

  const [mostraModale, setMostraModale] = useState(false);
  const [utenteModifica, setUtenteModifica] = useState(null);
  const [modificaNome, setModificaNome] = useState('');
  const [modificaCognome, setModificaCognome] = useState('');
  const [modificaTelefono, setModificaTelefono] = useState('');
  const [modificaNomeCane, setModificaNomeCane] = useState('');
  const [modificaCodiceFiscale, setModificaCodiceFiscale] = useState('');
  const [modificaDataNascita, setModificaDataNascita] = useState('');
  const [modificaVia, setModificaVia] = useState('');
  const [modificaNumero, setModificaNumero] = useState('');
  const [modificaPaese, setModificaPaese] = useState('');
  const [modificaProvincia, setModificaProvincia] = useState('');
  const [modificaCap, setModificaCap] = useState('');
  const [modificaEmail, setModificaEmail] = useState('');

  const [mostraStorico, setMostraStorico] = useState(false);
  const [utenteStorico, setUtenteStorico] = useState(null);
  const [transazioniUtente, setTransazioniUtente] = useState([]);
  const [loadingStorico, setLoadingStorico] = useState(false);

  const calcolaBonus = (crediti) => {
    if (crediti >= 80) return 10;
    if (crediti >= 50) return 6;
    if (crediti >= 30) return 3.3;
    return 0;
  };

  const calcolaTotaleConBonus = (crediti) => {
    const bonus = calcolaBonus(crediti);
    const bonusCrediti = (crediti * bonus) / 100;
    const totale = crediti + bonusCrediti;
    return Math.round(totale);
  };

  const formattaData = (data) => {
    if (!data) return 'Non specificata';
    try {
      const date = data instanceof Date ? data : new Date(data);
      if (isNaN(date.getTime())) return 'Non valida';
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Non specificata';
    }
  };

  const formattaDataOra = (data) => {
    if (!data) return 'Data non disponibile';
    try {
      const date = data instanceof Date ? data : new Date(data);
      if (isNaN(date.getTime())) return 'Data non valida';
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data non disponibile';
    }
  };

  useEffect(() => {
    if (!user) {
      console.log("❌ Nessun utente loggato");
      return;
    }

    const q = query(collection(db, "utenti"), where("ruolo", "==", "user"));

    const unsub = onSnapshot(q, 
      (snapshot) => {
        const list = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          list.push({ 
            id: doc.id, 
            ...data,
            nome: data.nome || 'Sconosciuto',
            cognome: data.cognome || '',
            nomeCane: data.nomeCane || 'Nessun cane',
            telefono: data.telefono || '',
            crediti: typeof data.crediti === 'number' ? data.crediti : 0
          });
        });
        setUtenti(list);
        setUtentiFiltrati(list);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error("❌ Errore nel caricamento utenti:", err);
        setError('Errore nel caricamento degli utenti: ' + err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  useEffect(() => {
    if (ricerca.trim() === '') {
      setUtentiFiltrati(utenti);
    } else {
      const filtered = utenti.filter(u => 
        u.nomeCane && u.nomeCane.toLowerCase().includes(ricerca.toLowerCase())
      );
      setUtentiFiltrati(filtered);
    }
  }, [ricerca, utenti]);

  const gestisciCredito = async (userId, delta, descrizione, dataPersonalizzata = null, creditiAcquistati = null, creditiOmaggio = null) => {
    if (!userId) {
      alert('❌ Errore: ID utente non valido');
      return;
    }

    try {
      const userRef = doc(db, "utenti", userId);
      
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("Utente non trovato");
        
        const current = userSnap.data().crediti || 0;
        const nuovo = current + delta;

        if (nuovo < 0) {
          throw new Error("Crediti insufficienti! Saldo attuale: " + current);
        }

        transaction.update(userRef, { crediti: nuovo });
        
        const timestamp = dataPersonalizzata ? new Date(dataPersonalizzata) : new Date();
        
        const transazioneData = {
          userId: userId,
          managerId: user.uid,
          importo: delta,
          descrizione: descrizione,
          timestamp: timestamp,
          nuovoSaldo: nuovo
        };
        
        if (creditiAcquistati !== null && creditiOmaggio !== null) {
          transazioneData.creditiAcquistati = creditiAcquistati;
          transazioneData.creditiOmaggio = creditiOmaggio;
        }
        
        transaction.set(doc(collection(db, "transazioni")), transazioneData);
      });

      alert('✅ Operazione completata con successo!');
      
      setCreditiRapidi('');
      setUtenteSelezionato(null);
      setRicerca('');
      setAttivita('');
      
    } catch (err) {
      alert('❌ Errore: ' + err.message);
    }
  };

  // 🔥 GESTIONE INSERIMENTO RAPIDO CON BONUS AMICO
  const gestisciInserimentoRapido = async (tipo) => {
    if (!utenteSelezionato) {
      alert('❌ Seleziona un utente dalla lista!');
      return;
    }

    const valore = parseInt(creditiRapidi);
    if (isNaN(valore) || valore <= 0) {
      alert('❌ Inserisci un numero valido di crediti (maggiore di 0)!');
      return;
    }
    
    // 🔥 CONTROLLO BONUS AMICO
    let bonusAmicoAttivato = false;
    let nomeAmico = '';
    
    if (tipo === 'aggiungi' && valore >= 10 && utenteSelezionato.codiceAmico && !utenteSelezionato.primoAcquisto) {
      // Cerca l'utente che ha quel codice amico (AMICODI + nome cane)
      const qAmico = query(
        collection(db, "utenti"),
        where("codiceAmicoGenerato", "==", utenteSelezionato.codiceAmico)
      );
      const amicoSnap = await getDocs(qAmico);
      
      if (!amicoSnap.empty) {
        const amicoDoc = amicoSnap.docs[0];
        const amicoId = amicoDoc.id;
        const amicoData = amicoDoc.data();
        
        // Aggiungi 2 crediti all'amico
        try {
          const amicoRef = doc(db, "utenti", amicoId);
          await runTransaction(db, async (transaction) => {
            const amicoSnapTx = await transaction.get(amicoRef);
            if (amicoSnapTx.exists()) {
              const current = amicoSnapTx.data().crediti || 0;
              transaction.update(amicoRef, { crediti: current + 2 });
              
              transaction.set(doc(collection(db, "transazioni")), {
                userId: amicoId,
                managerId: user.uid,
                importo: 2,
                descrizione: `🎁 Bonus amico: ${utenteSelezionato.nomeCane} ha portato ${utenteSelezionato.nome} ${utenteSelezionato.cognome} (acquisto ${valore} crediti)`,
                timestamp: new Date(),
                creditiAcquistati: 0,
                creditiOmaggio: 2,
                nuovoSaldo: current + 2
              });
            }
          });
          
          bonusAmicoAttivato = true;
          nomeAmico = amicoData.nome + ' ' + amicoData.cognome;
          
          // Marca il primo acquisto dell'utente
          const userRef = doc(db, "utenti", utenteSelezionato.id);
          await updateDoc(userRef, { primoAcquisto: true });
          
        } catch (err) {
          console.error("❌ Errore nel bonus amico:", err);
          alert("⚠️ Errore nell'attivazione del bonus amico. Riprova.");
          return;
        }
      } else {
        // Se il codice amico non viene trovato, chiedi conferma
        if (!window.confirm(`⚠️ Codice amico "${utenteSelezionato.codiceAmico}" non trovato. Procedere comunque?`)) {
          return;
        }
      }
    }
    
    let delta = valore;
    let descrizione = '';
    let creditiAcquistati = null;
    let creditiOmaggio = null;
    
    if (tipo === 'aggiungi') {
      const bonus = calcolaBonus(valore);
      const totaleConBonus = calcolaTotaleConBonus(valore);
      const bonusCrediti = totaleConBonus - valore;
      
      if (bonus > 0) {
        delta = totaleConBonus;
        creditiAcquistati = valore;
        creditiOmaggio = bonusCrediti;
        descrizione = `Aggiunta ${valore} crediti + bonus ${bonus}% (${bonusCrediti} crediti extra) = ${delta} crediti`;
        alert(`🎉 Bonus applicato: +${bonus}% (${bonusCrediti} crediti extra)\nTotale: ${delta} crediti`);
      } else {
        delta = valore;
        creditiAcquistati = valore;
        creditiOmaggio = 0;
        descrizione = `Aggiunta ${valore} crediti`;
      }
    } else {
      if (!attivita.trim()) {
        alert('❌ Inserisci il nome dell\'attività!');
        return;
      }
      delta = -valore;
      descrizione = `${attivita}`;
    }
    
    await gestisciCredito(
      utenteSelezionato.id, 
      delta, 
      descrizione, 
      dataRapida || null,
      creditiAcquistati,
      creditiOmaggio
    );
    
    // 🔥 MESSAGGIO DI CONFERMA BONUS AMICO
    if (bonusAmicoAttivato) {
      alert(`🎉 Bonus amico attivato!\n${nomeAmico} ha ricevuto 2 crediti omaggio!`);
    }
  };

  const apriModifica = (utente) => {
    setUtenteModifica(utente);
    setModificaNome(utente.nome || '');
    setModificaCognome(utente.cognome || '');
    setModificaEmail(utente.email || '');
    setModificaTelefono(utente.telefono || '');
    setModificaNomeCane(utente.nomeCane || '');
    setModificaCodiceFiscale(utente.codiceFiscale || '');
    setModificaDataNascita(utente.dataNascita || '');
    setModificaVia(utente.indirizzo?.via || '');
    setModificaNumero(utente.indirizzo?.numero || '');
    setModificaPaese(utente.indirizzo?.paese || '');
    setModificaProvincia(utente.indirizzo?.provincia || '');
    setModificaCap(utente.indirizzo?.cap || '');
    setMostraModale(true);
  };

  const salvaModifica = async () => {
    if (!utenteModifica) return;
    
    try {
      const userRef = doc(db, "utenti", utenteModifica.id);
      await updateDoc(userRef, {
        nome: modificaNome,
        cognome: modificaCognome,
        email: modificaEmail,
        telefono: modificaTelefono,
        nomeCane: modificaNomeCane,
        codiceFiscale: modificaCodiceFiscale,
        dataNascita: modificaDataNascita,
        indirizzo: {
          via: modificaVia,
          numero: modificaNumero,
          paese: modificaPaese,
          provincia: modificaProvincia,
          cap: modificaCap
        }
      });
      
      alert('✅ Dati utente aggiornati con successo!');
      setMostraModale(false);
      setUtenteModifica(null);
    } catch (err) {
      alert('❌ Errore durante l\'aggiornamento: ' + err.message);
    }
  };

  const apriStorico = async (utente) => {
    setUtenteStorico(utente);
    setLoadingStorico(true);
    setMostraStorico(true);
    
    try {
      const q = query(
        collection(db, "transazioni"), 
        where("userId", "==", utente.id)
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({ 
          id: doc.id, 
          ...data,
          dataTransazione: data.timestamp?.toDate?.() || data.timestamp || new Date()
        });
      });
      list.sort((a, b) => {
        const timeA = a.dataTransazione instanceof Date ? a.dataTransazione.getTime() : 0;
        const timeB = b.dataTransazione instanceof Date ? b.dataTransazione.getTime() : 0;
        return timeB - timeA;
      });
      setTransazioniUtente(list);
    } catch (err) {
      console.error("❌ Errore nel caricamento dello storico:", err);
      alert("❌ Errore nel caricamento dello storico");
    }
    setLoadingStorico(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const calcolaValore = (crediti) => {
    const num = typeof crediti === 'number' ? crediti : 0;
    return (num * 5).toFixed(2);
  };

  const utentiDropdown = utenti.filter(u => 
    u.nomeCane && u.nomeCane.toLowerCase().includes(ricerca.toLowerCase())
  );

  const creditiInseriti = parseInt(creditiRapidi) || 0;
  const bonusPercentuale = calcolaBonus(creditiInseriti);
  const totaleConBonus = calcolaTotaleConBonus(creditiInseriti);
  const bonusCrediti = totaleConBonus - creditiInseriti;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">⏳ Caricamento utenti...</p>
          <p className="text-sm text-gray-400">Attendi un momento</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-600 font-medium">❌ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

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
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-700">👨‍💼 Gestione Crediti</h1>
          <button 
            onClick={handleLogout} 
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition shadow-md hover:shadow-lg"
          >
            Esci
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-4 sticky top-4 border border-white/30">
              <h2 className="font-semibold text-gray-700 mb-3">📝 Inserimento Rapido</h2>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">🔍 Cerca cliente (nome cane)</label>
                <input
                  type="text"
                  placeholder="Cerca per nome cane..."
                  value={ricerca}
                  onChange={(e) => {
                    setRicerca(e.target.value);
                    setMostraDropdown(true);
                    if (e.target.value === '') {
                      setUtenteSelezionato(null);
                    }
                  }}
                  onFocus={() => setMostraDropdown(true)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white/80"
                />
                
                {mostraDropdown && ricerca.trim() !== '' && utentiDropdown.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto border rounded-lg bg-white/90 shadow-lg">
                    {utentiDropdown.map(u => (
                      <div
                        key={u.id}
                        className={`p-2 hover:bg-indigo-50 cursor-pointer text-sm ${utenteSelezionato?.id === u.id ? 'bg-indigo-100' : ''}`}
                        onClick={() => {
                          setUtenteSelezionato(u);
                          setRicerca(u.nomeCane);
                          setMostraDropdown(false);
                        }}
                      >
                        <span className="font-medium">{u.nomeCane}</span>
                        <span className="text-gray-500 ml-2">({u.nome} {u.cognome})</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {mostraDropdown && ricerca.trim() !== '' && utentiDropdown.length === 0 && (
                  <div className="mt-1 p-2 border rounded-lg bg-gray-50/80 text-sm text-gray-400">
                    Nessun utente trovato
                  </div>
                )}
                
                {utenteSelezionato && (
                  <div className="mt-2 p-2 bg-indigo-50/80 rounded-lg text-sm">
                    <span className="font-medium">✅ {utenteSelezionato.nomeCane}</span>
                    <span className="text-gray-500 ml-2">({utenteSelezionato.nome} {utenteSelezionato.cognome})</span>
                    <br />
                    <span className="text-xs text-gray-400">Crediti attuali: {utenteSelezionato.crediti || 0}</span>
                  </div>
                )}
              </div>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">📊 Numero crediti</label>
                <input
                  type="number"
                  min="1"
                  placeholder="es. 3"
                  value={creditiRapidi}
                  onChange={(e) => setCreditiRapidi(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white/80"
                />
              </div>

              {creditiInseriti > 0 && (
                <div className="mb-3 p-3 bg-yellow-50/80 border border-yellow-300 rounded-lg">
                  <p className="text-xs text-gray-600 font-medium">🎁 Bonus acquisto:</p>
                  {bonusPercentuale > 0 ? (
                    <>
                      <p className="text-sm font-bold text-green-700">
                        +{bonusPercentuale}% ({bonusCrediti} crediti extra)
                      </p>
                      <p className="text-xs text-gray-500">
                        Totale: <span className="font-bold text-indigo-600">{totaleConBonus}</span> crediti
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Acquista almeno 30 crediti per avere un bonus!
                    </p>
                  )}
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">💶 Valore economico</label>
                <div className="w-full p-3 bg-green-50/80 border-2 border-green-300 rounded-lg text-center">
                  <span className="text-3xl font-bold text-green-700">
                    {(creditiInseriti * 5).toFixed(2)} €
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  {creditiInseriti > 0 
                    ? `${creditiInseriti} crediti × 5€ = ${(creditiInseriti * 5).toFixed(2)}€` 
                    : 'Inserisci un numero per calcolare il valore'}
                </p>
              </div>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">📋 Attività (per il consumo)</label>
                <input
                  type="text"
                  placeholder="es. Agility, Obbedienza..."
                  value={attivita}
                  onChange={(e) => setAttivita(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white/80"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Compila solo se stai scalando crediti per un'attività
                </p>
              </div>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">📅 Data</label>
                <input
                  type="date"
                  value={dataRapida}
                  onChange={(e) => setDataRapida(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white/80"
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => gestisciInserimentoRapido('aggiungi')}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition shadow-md hover:shadow-lg"
                >
                  ➕ Aggiungi
                </button>
                <button 
                  onClick={() => gestisciInserimentoRapido('scala')}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-md hover:shadow-lg"
                >
                  ➖ Scala
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50/80 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">💡 1 credito = 5€</p>
                
                {utenteSelezionato && (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                      <div>
                        <span className="text-gray-500">Saldo attuale:</span>
                        <br />
                        <span className="font-bold text-indigo-600">{utenteSelezionato.crediti || 0}</span>
                        <span className="text-xs text-gray-400 ml-1">crediti</span>
                        <br />
                        <span className="text-xs text-green-600">{(utenteSelezionato.crediti || 0) * 5} €</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Nuovo saldo:</span>
                        <br />
                        <span className="font-bold text-purple-600">{(utenteSelezionato.crediti || 0) + (creditiInseriti)}</span>
                        <span className="text-xs text-gray-400 ml-1">crediti</span>
                        <br />
                        <span className="text-xs text-green-600">{(utenteSelezionato.crediti || 0) * 5 + (creditiInseriti) * 5} €</span>
                      </div>
                    </div>
                    {attivita && creditiInseriti > 0 && (
                      <div className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
                        <span className="font-medium">Attività:</span> {attivita}
                      </div>
                    )}
                  </>
                )}
                
                {!utenteSelezionato && (
                  <p className="text-xs text-gray-400 mt-1">Seleziona un utente per vedere il riepilogo</p>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="space-y-4">
              {utentiFiltrati.length === 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center text-gray-400 border border-white/30">
                  <p className="text-lg">😕 Nessun utente trovato</p>
                  <p className="text-sm mt-1">
                    {ricerca ? 'Prova con un altro nome' : 'Registra nuovi clienti dalla pagina di registrazione'}
                  </p>
                </div>
              )}

              {utentiFiltrati.map((u) => {
                if (!u || typeof u !== 'object') return null;
                
                const valoreCrediti = calcolaValore(u.crediti);
                const nomeCompleto = `${u.nome || ''} ${u.cognome || ''}`.trim() || 'Sconosciuto';
                
                return (
                  <div key={u.id || Math.random()} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-4 hover:shadow-2xl transition border border-white/30">
                    <div className="flex flex-wrap justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">
                          {nomeCompleto}
                        </h3>
                        <p className="text-sm text-gray-500">
                          🐕 {u.nomeCane || 'Nessun cane registrato'} 
                          {u.telefono && ` • 📞 ${u.telefono}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          📧 {u.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          🎂 {formattaData(u.dataNascita)}
                        </p>
                        {u.codiceAmico && (
                          <p className="text-xs text-gray-400">
                            🎁 Codice amico inserito: <span className="font-mono">{u.codiceAmico}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="bg-indigo-50/80 rounded-xl px-4 py-2 mb-2">
                          <div>
                            <span className="text-2xl font-bold text-indigo-600">{typeof u.crediti === 'number' ? u.crediti : 0}</span>
                            <span className="text-sm text-gray-500 ml-1">crediti</span>
                          </div>
                          <div>
                            <span className="text-sm text-green-600 font-medium">
                              💰 {valoreCrediti} €
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => apriStorico(u)}
                            className="flex-1 bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-600 transition"
                          >
                            📋 Storico
                          </button>
                          <button 
                            onClick={() => apriModifica(u)}
                            className="flex-1 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                          >
                            ✏️ Modifica
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* MODALE DI MODIFICA */}
      {mostraModale && utenteModifica && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">✏️ Modifica Dati</h2>
            <p className="text-sm text-gray-500 mb-4">Modifica i dati di {utenteModifica.nome} {utenteModifica.cognome}</p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome</label>
                  <input
                    type="text"
                    value={modificaNome}
                    onChange={(e) => setModificaNome(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cognome</label>
                  <input
                    type="text"
                    value={modificaCognome}
                    onChange={(e) => setModificaCognome(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={modificaEmail}
                  onChange={(e) => setModificaEmail(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefono</label>
                <input
                  type="text"
                  value={modificaTelefono}
                  onChange={(e) => setModificaTelefono(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome del cane</label>
                <input
                  type="text"
                  value={modificaNomeCane}
                  onChange={(e) => setModificaNomeCane(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Codice Fiscale</label>
                <input
                  type="text"
                  value={modificaCodiceFiscale}
                  onChange={(e) => setModificaCodiceFiscale(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm uppercase focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data di nascita</label>
                <input
                  type="date"
                  value={modificaDataNascita}
                  onChange={(e) => setModificaDataNascita(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Via</label>
                  <input
                    type="text"
                    value={modificaVia}
                    onChange={(e) => setModificaVia(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Numero</label>
                  <input
                    type="text"
                    value={modificaNumero}
                    onChange={(e) => setModificaNumero(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Paese</label>
                  <input
                    type="text"
                    value={modificaPaese}
                    onChange={(e) => setModificaPaese(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Provincia</label>
                  <input
                    type="text"
                    value={modificaProvincia}
                    onChange={(e) => setModificaProvincia(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CAP</label>
                  <input
                    type="text"
                    value={modificaCap}
                    onChange={(e) => setModificaCap(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={salvaModifica}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                💾 Salva
              </button>
              <button
                onClick={() => {
                  setMostraModale(false);
                  setUtenteModifica(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE STORICO TRANSAZIONI */}
      {mostraStorico && utenteStorico && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                📋 Storico Transazioni
              </h2>
              <button
                onClick={() => {
                  setMostraStorico(false);
                  setUtenteStorico(null);
                  setTransazioniUtente([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {utenteStorico.nome} {utenteStorico.cognome} • 🐕 {utenteStorico.nomeCane || 'Nessun cane'}
            </p>
            
            {loadingStorico ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-gray-500">⏳ Caricamento storico...</p>
              </div>
            ) : transazioniUtente.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-gray-400">Nessuna transazione registrata</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <ul className="divide-y divide-gray-100">
                  {transazioniUtente.map((tx, index) => {
                    const importo = tx.importo || 0;
                    const descrizione = tx.descrizione || 'Operazione';
                    const dataFormattata = formattaDataOra(tx.dataTransazione);
                    
                    return (
                      <li key={tx.id || index} className="py-3 flex flex-wrap justify-between items-center">
                        <div className="flex-1 pr-4">
                          <span className="text-sm text-gray-700 block">{descrizione}</span>
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
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
              <span className="text-sm text-gray-500">
                Totale transazioni: <span className="font-bold text-indigo-600">{transazioniUtente.length}</span>
              </span>
              <span className="text-sm text-gray-500">
                Saldo attuale: <span className="font-bold text-indigo-600">{utenteStorico.crediti || 0}</span> crediti
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}