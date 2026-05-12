import { useApp } from './contexts/useApp';
import { AppShell } from './components/layout/AppShell';
import clsx from 'clsx';
import { DayLogView } from './components/daylog/DayLogView';
import { PeopleView } from './components/people/PeopleView';
import { JournalView } from './components/journal/JournalView';
import { TaskView } from './components/tasks/TaskView';
import { AnalysisView } from './components/analysis/AnalysisView';
import { SubtractionEngine } from './components/analysis/SubtractionEngine';
import { GhostSetupDrawer } from './components/layout/GhostSetupDrawer';
import { NeuralProtocolsModal } from './components/modals/NeuralProtocolsModal';
import { LifeCapitalModal } from './components/modals/LifeCapitalModal';
import { CopilotPanel } from './components/modals/CopilotPanel';
import { LogInteractionModal } from './components/people/LogInteractionModal';
import { AddPersonModal } from './components/people/AddPersonModal';
import { AddTransactionModal } from './components/finance/modals/AddTransactionModal';

import { BlueprintsView } from './components/blueprints/BlueprintsView';
import { FinanceModule } from './components/finance/FinanceModule';
import { LedgerView } from './components/finance/LedgerView';
import { MonthlyView } from './components/finance/MonthlyView';

export default function App() {
  const { 
    activeModule, 
    activeModal, 
    setActiveModal,
    isGhostSetupOpen,
    setIsGhostSetupOpen,
    isShaking
  } = useApp();

  return (
    <>
      <div className="living-bg-container">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="bg-blob blob-3" />
      </div>
      <div className={clsx("flex flex-col h-screen", isShaking && "animate-screen-shake")}>
        <AppShell>
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {activeModule === 'daylog' && <DayLogView />}
        {activeModule === 'tasks' && <TaskView />}
        {activeModule === 'people' && <PeopleView />}
        {activeModule === 'journal' && <JournalView />}
        {activeModule === 'analysis' && <AnalysisView />}
        {activeModule === 'subtraction' && <SubtractionEngine />}
        {activeModule === 'blueprints' && <BlueprintsView />}
        {activeModule === 'finance-terminal' && <FinanceModule />}
        {activeModule === 'finance-ledger' && <LedgerView />}
        {activeModule === 'finance-month' && <MonthlyView />}
      </div>

      {isGhostSetupOpen && <GhostSetupDrawer onClose={() => setIsGhostSetupOpen(false)} />}
      
      {activeModal?.type === 'shortcuts' && (
        <NeuralProtocolsModal onClose={() => setActiveModal(null)} />
      )}
      
      {activeModal?.type === 'life_capital' && (
        <LifeCapitalModal onClose={() => setActiveModal(null)} />
      )}
      
      {activeModal?.type === 'oracle' && (
        <CopilotPanel isOpen={true} onClose={() => setActiveModal(null)} />
      )}

      {activeModal?.type === 'log_interaction' && (
        <LogInteractionModal 
          person={activeModal.person} 
          onClose={() => setActiveModal(null)} 
        />
      )}

      {activeModal?.type === 'add_person' && (
        <AddPersonModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal?.type === 'add_transaction' && (
        <AddTransactionModal onClose={() => setActiveModal(null)} />
      )}
      </AppShell>
      </div>
    </>
  );
}
