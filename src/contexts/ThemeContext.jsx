import { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ThemeContext = createContext();

// Helper to get or create a persistent anonymous ID
const getAnonymousId = () => {
  let id = localStorage.getItem('aura_velocity_anon_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('aura_velocity_anon_id', id);
  }
  return id;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      if (!isFirebaseConfigured || !db) {
        const localTheme = localStorage.getItem('aura_velocity_theme') || 'dark';
        setTheme(localTheme);
        setLoading(false);
        return;
      }

      const anonId = getAnonymousId();
      const docRef = doc(db, 'user_preferences', anonId);
      
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().theme) {
          setTheme(docSnap.data().theme);
        } else {
          // Fallback to localStorage or default
          const localTheme = localStorage.getItem('aura_velocity_theme') || 'dark';
          setTheme(localTheme);
        }
      } catch (error) {
        console.error("Error loading theme from Firestore:", error);
        const localTheme = localStorage.getItem('aura_velocity_theme') || 'dark';
        setTheme(localTheme);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('aura_velocity_theme', theme);
    
    // Persist to Firestore
    const persistTheme = async () => {
      const anonId = getAnonymousId();
      try {
        await setDoc(doc(db, 'user_preferences', anonId), { theme }, { merge: true });
      } catch (error) {
        console.error("Error saving theme to Firestore:", error);
      }
    };

    if (!loading && isFirebaseConfigured && db) {
      persistTheme();
    }
  }, [theme, loading]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {!loading && children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
