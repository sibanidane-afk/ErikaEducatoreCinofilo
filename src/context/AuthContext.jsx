import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  // 🔥 REGISTRAZIONE CON VERIFICA EMAIL
  const register = async (email, password, userData) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      
      // 🔥 Invia email di verifica
      await sendEmailVerification(cred.user);
      console.log("📧 Email di verifica inviata a:", email);
      
      // Genera il codice amico
      const nomeCane = userData.nomeCane || '';
      const codiceAmicoGenerato = nomeCane 
        ? `AMICODI${nomeCane.replace(/\s/g, '').toUpperCase()}`
        : '';

      const userDoc = {
        nome: userData.nome || '',
        cognome: userData.cognome || '',
        email: userData.email || email,
        telefono: userData.telefono || '',
        nomeCane: userData.nomeCane || '',
        codiceFiscale: userData.codiceFiscale || '',
        dataNascita: userData.dataNascita || '',
        codiceAmico: userData.codiceAmico || '',
        codiceAmicoGenerato: codiceAmicoGenerato,
        indirizzo: userData.indirizzo || {
          via: '',
          numero: '',
          paese: '',
          provincia: '',
          cap: ''
        },
        ruolo: userData.ruolo || 'user',
        managerId: userData.managerId || null,
        crediti: userData.crediti !== undefined ? userData.crediti : 0,
        primoAcquisto: userData.primoAcquisto || false,
        ultimoCompleanno: null,
        emailVerificata: false, // 🔥 CAMPO PER TRACCIARE LA VERIFICA
        createdAt: new Date()
      };
      
      console.log("💾 Salvataggio su Firestore:", userDoc);
      await setDoc(doc(db, "utenti", uid), userDoc);
      
      setRole(userDoc.ruolo);
      return cred;
    } catch (error) {
      console.error("❌ Errore nella registrazione:", error);
      throw error;
    }
  };

  // 🔥 RINVIA EMAIL DI VERIFICA
  const rimandaVerificaEmail = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        console.log("📧 Email di verifica reinviata");
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Errore nell'invio della verifica:", error);
      throw error;
    }
  };

  // 🔥 RESET PASSWORD
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("📧 Email di reset password inviata a:", email);
      return true;
    } catch (error) {
      console.error("❌ Errore nell'invio della reset password:", error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // 🔥 CONTROLLA SE L'EMAIL È VERIFICATA
      if (!cred.user.emailVerified) {
        // Se non è verificata, fai logout e lancia errore
        await signOut(auth);
        throw new Error('email-not-verified');
      }
      
      console.log("✅ Login effettuato per:", email);
      return cred;
    } catch (error) {
      console.error("❌ Errore nel login:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setRole(null);
      console.log("✅ Logout effettuato");
    } catch (error) {
      console.error("❌ Errore nel logout:", error);
      throw error;
    }
  };

  const getManagers = async () => {
    try {
      const q = query(collection(db, "utenti"), where("ruolo", "==", "manager"));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({ 
          id: doc.id, 
          ...data,
          nome: data.nome || 'Sconosciuto',
          cognome: data.cognome || ''
        });
      });
      return list;
    } catch (error) {
      console.error("❌ Errore nel caricamento dei gestori:", error);
      return [];
    }
  };

  const getUserData = async (userId) => {
    try {
      const docSnap = await getDoc(doc(db, "utenti", userId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("❌ Errore nel caricamento dell'utente:", error);
      return null;
    }
  };

  // 🔥 AGGIORNA LO STATO DI VERIFICA EMAIL
  const aggiornaStatoVerifica = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const verificata = auth.currentUser.emailVerified;
      
      if (verificata) {
        // Aggiorna il campo su Firestore
        const userRef = doc(db, "utenti", auth.currentUser.uid);
        await updateDoc(userRef, { emailVerificata: true });
      }
      
      return verificata;
    }
    return false;
  };

  useEffect(() => {
    console.log("🔍 Avvio monitoraggio autenticazione...");
    
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      console.log("👤 Stato autenticazione:", currentUser?.email || "Nessun utente");
      
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const docSnap = await getDoc(doc(db, "utenti", currentUser.uid));
          if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log("📋 Ruolo trovato:", userData.ruolo);
            setRole(userData.ruolo || 'user');
          } else {
            console.log("⚠️ Documento utente non trovato, creazione automatica...");
            try {
              const newUserDoc = {
                nome: 'Utente',
                cognome: 'Registrato',
                email: currentUser.email || '',
                telefono: '',
                nomeCane: '',
                codiceFiscale: '',
                dataNascita: '',
                codiceAmico: '',
                codiceAmicoGenerato: '',
                indirizzo: { via: '', numero: '', paese: '', provincia: '', cap: '' },
                ruolo: 'user',
                managerId: null,
                crediti: 0,
                primoAcquisto: false,
                ultimoCompleanno: null,
                emailVerificata: currentUser.emailVerified || false,
                createdAt: new Date()
              };
              await setDoc(doc(db, "utenti", currentUser.uid), newUserDoc);
              console.log("✅ Documento utente creato automaticamente");
              setRole('user');
            } catch (createError) {
              console.error("❌ Errore nella creazione automatica:", createError);
              setRole('user');
            }
          }
        } catch (error) {
          console.error("❌ Errore nel caricamento del ruolo:", error);
          setRole('user');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    
    return unsub;
  }, []);

  const value = { 
    user, 
    role, 
    loading, 
    register, 
    login, 
    logout, 
    getManagers,
    getUserData,
    rimandaVerificaEmail,
    resetPassword,
    aggiornaStatoVerifica
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  return context;
}