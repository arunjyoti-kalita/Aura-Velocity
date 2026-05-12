import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from './ToastContainer';
import { RelationshipNudgeManager } from '../people/RelationshipNudgeManager';

export function AppShell({ children, onOpenSearch }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden text-text-primary font-sans bg-transparent relative">
      <Sidebar onOpenSearch={onOpenSearch} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex flex-col flex-1 overflow-hidden relative bg-transparent">
          {children}
        </main>
      </div>
      <ToastContainer />
      <RelationshipNudgeManager />
    </div>
  );
}
