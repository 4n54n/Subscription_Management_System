import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface WorkspaceCopilotContextState {
  activeTab: 'projects' | 'documents';
  activeProjectId?: string;
  activeSubTab?: 'overview' | 'issues' | 'blueprint' | 'cycles' | 'modules' | 'releases' | 'doc';
  activeDocId?: string;
  activeDocTitle?: string;
  activeDocContent?: string;
  selectedBlockId?: string;
  selectedText?: string;
  workspaceMembers?: Array<{ id: string; name: string; email: string }>;
  projects?: Array<{ id: string; name: string }>;
  cycles?: Array<{ id: string; name: string }>;
  modules?: Array<{ id: string; name: string }>;
  releases?: Array<{ id: string; name: string }>;
  activeReleaseId?: string;
  activeReleaseName?: string;
  blueprintNodes?: Array<{ id: string; label: string; role?: string; status?: string }>;
  issues?: Array<{ id: string; title: string; status: string }>;
  categories?: string[];
  onExecuteAction?: (action: string, data: Record<string, any>) => Promise<void>;
}

export type CopilotContextValue = WorkspaceCopilotContextState;

interface CopilotContextType {
  copilotContext: WorkspaceCopilotContextState;
  setCopilotContext: React.Dispatch<React.SetStateAction<WorkspaceCopilotContextState>>;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  toggleCopilot: () => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export const CopilotContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const [copilotContext, setCopilotContext] = useState<WorkspaceCopilotContextState>({
    activeTab: 'projects',
  });

  // Track active navigation tab automatically from location pathname
  useEffect(() => {
    const path = location.pathname;

    let detectedTab: 'projects' | 'documents' = 'projects';
    if (
      path.startsWith('/proposals') ||
      path.startsWith('/quotes') ||
      path.startsWith('/invoices') ||
      path.startsWith('/letterheads')
    ) {
      detectedTab = 'documents';
    } else if (path.startsWith('/projects')) {
      detectedTab = 'projects';
    }

    setCopilotContext(prev => {
      if (prev.activeTab === detectedTab) {
        return prev;
      }
      return {
        ...prev,
        activeTab: detectedTab,
      };
    });
  }, [location.pathname]);

  const toggleCopilot = () => setIsCopilotOpen(prev => !prev);

  return (
    <CopilotContext.Provider
      value={{
        copilotContext,
        setCopilotContext,
        isCopilotOpen,
        setIsCopilotOpen,
        toggleCopilot,
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
};

export const useWorkspaceCopilot = () => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useWorkspaceCopilot must be used within CopilotContextProvider');
  }
  return context;
};
