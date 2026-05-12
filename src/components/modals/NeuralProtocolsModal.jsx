import React from 'react';
import { useApp } from "../../contexts/useApp";
import { X, Key, Zap, Command, MoveUp, MoveDown, ArrowLeft, ArrowRight, MousePointer2 } from 'lucide-react';
import clsx from 'clsx';

export function NeuralProtocolsModal({ onClose }) {
  const sections = [
    {
      title: "LOGIC & HISTORY",
      shortcuts: [
        { keys: ["⌘", "Z"], desc: "Undo" },
        { keys: ["Del"], desc: "Delete" },
      ]
    },
    {
      title: "FLOW CONTROL",
      shortcuts: [
        { keys: ["⌘", "C"], desc: "Copy" },
        { keys: ["⌘", "V"], desc: "Paste" },
        { keys: ["S", "↑"], desc: "Up 30m" },
        { keys: ["S", "↓"], desc: "Down 30m" },
      ]
    },
    {
      title: "NAVIGATION",
      shortcuts: [
        { keys: ["←"], desc: "Prev" },
        { keys: ["→"], desc: "Next" },
        { keys: ["T"], desc: "Today" },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div 
        className="absolute inset-0 z-[-1]" 
        onClick={onClose}
      />
      
      <div className="w-full max-w-[420px] bg-[#14141c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col relative z-10">
            <h2 className="text-sm font-black text-white tracking-tight uppercase italic leading-none">
              SECURITY<span className="text-orange-500 ml-1">KEY</span>
            </h2>
            <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">System Override Protocols</p>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all relative z-10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-1">{section.title}</h3>
              <div className="grid grid-cols-1 gap-3">
                {section.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between group p-2 hover:bg-white/[0.02] rounded-lg transition-all">
                    <div className="flex gap-1.5">
                      {s.keys.map((key, ki) => (
                        <div key={ki} className="min-w-[24px] h-6 px-1.5 bg-white/[0.03] border border-white/10 rounded-md flex items-center justify-center shadow-sm">
                          <span className={clsx(
                            "text-[10px] font-black tracking-tight",
                            key === "⌘" || key === "S" ? "text-white/30" : "text-orange-500"
                          )}>
                            {key}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-white/40 group-hover:text-white transition-colors uppercase tracking-tight">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em] text-center italic leading-relaxed">
            Shortcuts are prioritized for high-bandwidth scheduling workflows
          </p>
        </div>
      </div>
    </div>
  );
}
