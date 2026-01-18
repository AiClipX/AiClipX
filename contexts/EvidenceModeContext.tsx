import React, { createContext, useContext, useEffect, useState } from 'react';

interface EvidenceModeContextType {
  isEnabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

const EvidenceModeContext = createContext<EvidenceModeContextType | undefined>(undefined);

export const EvidenceModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check for query param ?evidence=true or localStorage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const evidenceParam = urlParams.get('evidence');
      const storedValue = localStorage.getItem('evidence_mode');
      
      if (evidenceParam === 'true' || storedValue === 'true') {
        setIsEnabled(true);
      }
    }
  }, []);

  const toggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('evidence_mode', String(newValue));
    }
  };

  const enable = () => {
    setIsEnabled(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('evidence_mode', 'true');
    }
  };

  const disable = () => {
    setIsEnabled(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('evidence_mode', 'false');
    }
  };

  return (
    <EvidenceModeContext.Provider value={{ isEnabled, toggle, enable, disable }}>
      {children}
    </EvidenceModeContext.Provider>
  );
};

export function useEvidenceMode() {
  const context = useContext(EvidenceModeContext);
  if (!context) {
    throw new Error('useEvidenceMode must be used within EvidenceModeProvider');
  }
  return context;
}

export default EvidenceModeContext;