import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { register, login, getManagers, user, role, rimandaVerificaEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nomeCane, setNomeCane] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [via, setVia] = useState('');
  const [numero, setNumero] = useState('');
  const [paese, setPaese] = useState('');
  const [provincia, setProvincia] = useState('');
  const [cap, setCap] = useState('');
  const [codiceAmico, setCodiceAmico] = useState('');
  
  const [codiceGestore, setCodiceGestore] = useState('');
  const CODICE_SEGRETO = 'GESTORE2026';
  const [managerList, setManagerList] = useState([]);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // 🔥 STATO PER VERIFICA EMAIL
  const [mostraMessaggioVerifica, setMostraMessaggioVerifica] = useState(false);
  const [emailRegistrata, setEmailRegistrata] = useState('');

  useEffect(() => {
    if (user && role && !isRedirecting) {
      setIsRedirecting(true);
      if (role === 'manager') {
        navigate('/manager');
      } else if (role === 'user') {
        navigate('/user');
      }
    }
  }, [user, role, navigate, isRedirecting]);

  useEffect(() => {
    if (isRegister) {
      loadManagers();
    }
  }, [isRegister]);

  const loadManagers = async () => {
    try {
      const list = await getManagers();
      setManagerList(list);
    } catch (err) {
      console.error("❌ Errore nel caricamento dei gestori:", err);
    }
  };

  // 🔥 RINVIA EMAIL DI VERIFICA
  const handleRimandaVerifica = async () => {
    try {
      await rimandaVerificaEmail();
      setSuccessMessage('📧 Email di verifica reinviata! Controlla la tua casella di posta.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError('❌ Errore nell\'invio della verifica: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsRedirecting(false);
    
    try {
      if (isRegister) {
        if (password.length < 6) {
          setError('❌ La password deve essere di almeno 6 caratteri!');
          return;
        }
        
        let ruoloFinale = 'user';
        let managerIdFinale = null;
        
        if (codiceGestore === CODICE_SEGRETO) {
          ruoloFinale = 'manager';
          managerIdFinale = null;
        } else if (codiceGestore !== '') {
          setError('❌ Codice gestore non valido!');
          return;
        }
        
        if (ruoloFinale === 'user') {
          managerIdFinale = null;
        }
        
        let userData;
        
        if (ruoloFinale === 'manager') {
          userData = {
            nome: 'Erika',
            cognome: 'Educatore Cinofilo',
            email: email,
            telefono: telefono || '',
            nomeCane: '',
            codiceFiscale: '',
            dataNascita: '',
            codiceAmico: '',
            indirizzo: { via: '', numero: '', paese: '', provincia: '', cap: '' },
            ruolo: 'manager',
            managerId: null,
            crediti: 0,
            primoAcquisto: false
          };
        } else {
          userData = {
            nome,
            cognome,
            email,
            telefono: telefono || '',
            nomeCane,
            codiceFiscale,
            dataNascita,
            codiceAmico: codiceAmico || '',
            indirizzo: { via, numero, paese, provincia, cap },
            ruolo: 'user',
            managerId: null,
            crediti: 0,
            primoAcquisto: false
          };
        }
        
        await register(email, password, userData);
        
        // 🔥 MOSTRA MESSAGGIO DI VERIFICA EMAIL
        setEmailRegistrata(email);
        setMostraMessaggioVerifica(true);
        setSuccessMessage('📧 Email di verifica inviata! Controlla la tua casella di posta e clicca sul link per verificare il tuo account prima di effettuare il login.');
        
      } else {
        if (password.length < 6) {
          setError('❌ La password deve essere di almeno 6 caratteri!');
          return;
        }
        await login(email, password);
      }
    } catch (err) {
      console.error('❌ Errore:', err);
      
      // 🔥 GESTISCI L'ERRORE EMAIL NON VERIFICATA
      if (err.message === 'email-not-verified' || err.code === 'auth/email-not-verified') {
        setEmailRegistrata(email);
        setMostraMessaggioVerifica(true);
        setError('⚠️ Devi verificare la tua email prima di accedere. Controlla la tua casella di posta.');
        return;
      }
      
      if (err.code === 'auth/weak-password') {
        setError('❌ La password è troppo debole. Usa almeno 6 caratteri.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('❌ Questa email è già registrata.');
      } else if (err.code === 'auth/invalid-email') {
        setError('❌ L\'email inserita non è valida.');
      } else if (err.code === 'auth/user-not-found') {
        setError('❌ Nessun utente trovato con questa email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('❌ Password errata. Riprova.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('❌ Troppi tentativi. Riprova più tardi.');
      } else {
        setError('❌ ' + err.message);
      }
    }
  };

  // 🔥 HANDLE RESET PASSWORD
  const handleResetPassword = async () => {
    if (!email) {
      setError('❌ Inserisci la tua email per ricevere il link di reset.');
      return;
    }
    try {
      await resetPassword(email);
      setSuccessMessage('📧 Email di reset password inviata! Controlla la tua casella di posta.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError('❌ Errore: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
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
      
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/30 relative z-10">
        <div className="text-center mb-6">
          <img 
            src="/disegno-erika2-font.png" 
            alt="Erika Educatore Cinofilo"
            className="h-24 mx-auto mb-3 object-contain"
          />
          <h2 className="text-2xl font-bold text-indigo-700">🐕 Erika Educatore Cinofilo</h2>
          <p className="text-sm text-gray-500">Gestione crediti per attività</p>
        </div>
        
        {/* 🔥 MESSAGGIO DI VERIFICA EMAIL */}
        {mostraMessaggioVerifica && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-medium">📧 Verifica la tua email</p>
            <p className="text-xs text-yellow-700 mt-1">
              Abbiamo inviato un link di verifica a <span className="font-bold">{emailRegistrata}</span>
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Clicca sul link nell'email per attivare il tuo account, poi effettua il login.
            </p>
            <button
              onClick={handleRimandaVerifica}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
            >
              🔄 Non hai ricevuto l'email? Clicca qui per reinviarla
            </button>
            <button
              onClick={() => {
                setMostraMessaggioVerifica(false);
                setError('');
              }}
              className="mt-2 ml-4 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              ✕ Chiudi
            </button>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              {codiceGestore === CODICE_SEGRETO ? (
                <>
                  <div className="bg-green-50/80 border border-green-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-green-700 font-medium">✅ Registrazione Gestore</p>
                    <p className="text-xs text-green-600">Inserisci email, password e telefono</p>
                  </div>
                  
                  <input 
                    type="email" 
                    placeholder="Email *" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" 
                    required 
                  />
                  
                  <input 
                    type="tel" 
                    placeholder="Telefono" 
                    value={telefono} 
                    onChange={e => setTelefono(e.target.value)} 
                    className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" 
                  />
                  
                  <input 
                    type="password" 
                    placeholder="Password (min 6 caratteri) *" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" 
                    required 
                  />
                  
                  <p className="text-xs text-gray-400 mt-1">
                    📧 Riceverai un'email di verifica per attivare il tuo account
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-700 font-medium">📋 Registrazione Cliente</p>
                    <p className="text-xs text-blue-600">Compila tutti i campi</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nome *" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                    <input type="text" placeholder="Cognome *" value={cognome} onChange={e => setCognome(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  </div>
                  
                  <input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  
                  <input 
                    type="tel" 
                    placeholder="Telefono" 
                    value={telefono} 
                    onChange={e => setTelefono(e.target.value)} 
                    className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" 
                  />
                  
                  <input type="text" placeholder="Nome del cane *" value={nomeCane} onChange={e => setNomeCane(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  <input type="text" placeholder="Codice Fiscale *" value={codiceFiscale} onChange={e => setCodiceFiscale(e.target.value)} className="w-full p-2 border rounded-lg mb-2 uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  <input type="date" placeholder="Data di nascita *" value={dataNascita} onChange={e => setDataNascita(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 mb-1">🎁 Codice amico (se hai ricevuto un invito)</label>
                    <input 
                      type="text" 
                      placeholder="Inserisci il codice amico (es. AMICODIFIDO)" 
                      value={codiceAmico} 
                      onChange={e => setCodiceAmico(e.target.value.toUpperCase())} 
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white/80 uppercase"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Via *" value={via} onChange={e => setVia(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                    <input type="text" placeholder="Numero *" value={numero} onChange={e => setNumero(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Paese *" value={paese} onChange={e => setPaese(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                    <input type="text" placeholder="Provincia *" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full p-2 border rounded-lg mb-2 uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                    <input type="text" placeholder="CAP *" value={cap} onChange={e => setCap(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  </div>
                  
                  <input type="password" placeholder="Password (min 6 caratteri) *" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" required />
                  
                  <p className="text-xs text-gray-400 mt-1">
                    📧 Riceverai un'email di verifica per attivare il tuo account
                  </p>
                </>
              )}
              
              <div className="mb-2 mt-2">
                <input 
                  type="password" 
                  placeholder="🔑 Codice gestore (solo per responsabili)" 
                  value={codiceGestore} 
                  onChange={e => setCodiceGestore(e.target.value)} 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80"
                />
              </div>
              
              {codiceGestore === CODICE_SEGRETO && (
                <p className="text-xs text-green-600 mb-2">✅ Codice gestore valido!</p>
              )}
              
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg">
                Registrati
              </button>
            </>
          ) : (
            <>
              <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full p-2 border rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" 
                required 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-2 border rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80" 
                required 
              />
              
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg">
                Accedi
              </button>
              
              <button 
                type="button"
                onClick={handleResetPassword}
                className="w-full text-sm text-indigo-600 hover:text-indigo-800 underline mt-2"
              >
                🔑 Hai dimenticato la password?
              </button>
            </>
          )}
        </form>

        <p className="text-center text-sm mt-4">
          {isRegister ? 'Hai già un account?' : 'Non hai un account?'}
          <button 
            onClick={() => { 
              setIsRegister(!isRegister); 
              setError(''); 
              setSuccessMessage('');
              setCodiceGestore('');
              setIsRedirecting(false);
              setMostraMessaggioVerifica(false);
            }} 
            className="text-indigo-600 ml-1 hover:underline font-medium"
          >
            {isRegister ? 'Accedi' : 'Registrati'}
          </button>
        </p>
      </div>
    </div>
  );
}