import { useEffect, useRef, useState } from 'react';
import { 
  Clock, AlignLeft, Tag, Link as LinkIcon, 
  Zap, Pencil, Trash, X 
} from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { formatDisplayRange } from '../../utils/dateHelpers';

export function EventPopover({ log, anchorRect, onClose, onEdit }) {
  const { activities, updateLog, deleteLog, showToast, triggerMechanicalFeedback } = useApp();
  const activity = activities.find(a => a.name === log.activityName) || activities[0] || { name: 'Unknown', baseColor: '#555' };
  
  const [localEnergy, setLocalEnergy] = useState(log.energyLevel ?? 50);
  const [localRegret, setLocalRegret] = useState(log.regretRating);

  useEffect(() => {
    setLocalEnergy(log.energyLevel ?? 50);
    setLocalRegret(log.regretRating);
  }, [log.energyLevel, log.regretRating]);

  const localEnergyColor = localEnergy > 80 ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" : 
                          localEnergy > 40 ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]" : 
                          "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]";

  // Intelligent link lookup: if log doesn't have a link, try to find the protocol default
  const resolvedLink = log.referenceLink || log.link || (() => {
    if (!activity) return null;
    if (log.subcategory) {
      const sub = activity.subcategories?.find(s => 
        (typeof s === 'string' ? s : s.name) === log.subcategory
      );
      if (sub && typeof sub === 'object' && sub.defaultReferenceLink) return sub.defaultReferenceLink;
    }
    return activity.defaultReferenceLink;
  })();

  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!anchorRect || !popoverRef.current) return;

    const popoverWidth = 280;
    const popoverHeight = popoverRef.current.offsetHeight;
    const padding = 12;

    let left = anchorRect.right + 12;
    let top = anchorRect.top;

    // Check right overflow
    if (left + popoverWidth > window.innerWidth - padding) {
      left = anchorRect.left - popoverWidth - 12;
    }

    // Check bottom overflow
    if (top + popoverHeight > window.innerHeight - padding) {
      top = window.innerHeight - popoverHeight - padding;
    }

    // Ensure it doesn't go off top/left
    if (top < padding) top = padding;
    if (left < padding) left = padding;

    setPosition({ top, left });
    setIsVisible(true);

    // Close on escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    // Close on click outside
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRect, onClose]);

  const handleEdit = () => {
    onEdit(log, anchorRect, 'full');
    onClose();
  };

  const handleDelete = () => {
    deleteLog(log.id);
    showToast("Activity deleted", "success");
    onClose();
  };

  // Energy Color logic
  const energyLevel = log.energyLevel ?? 50;
  let energyColor = "bg-blue-500";
  if (energyLevel > 80) energyColor = "bg-orange-500";
  else if (energyLevel > 40) energyColor = "bg-yellow-500";

  return (
    <div
      ref={popoverRef}
      className={clsx(
        "fixed z-[2000] w-[280px] overflow-hidden transition-all",
        isVisible ? "popover-animate-in" : "opacity-0 scale-95"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: 'rgba(10, 10, 14, 0.98)',
        backdropFilter: 'blur(32px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}
    >
      {/* Top Color Strip */}
      <div 
        className="h-[3px] w-full absolute top-0 left-0" 
        style={{ backgroundColor: activity.baseColor }}
      />

      <div className="p-4 flex flex-col gap-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading font-black text-[16px] text-white uppercase tracking-tight truncate flex-1">
            {log.activityName}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={handleEdit}
              className="p-1 text-white/20 hover:text-white transition-all"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            <button 
              onClick={handleDelete}
              className="p-1 text-white/20 hover:text-red-400 transition-all"
              title="Delete"
            >
              <Trash size={14} />
            </button>
            <button 
              onClick={onClose}
              className="p-1 text-white/20 hover:text-white transition-all"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content Rows */}
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Time & Link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-white/20" />
              <span className="font-mono text-[12px] font-bold text-white/60 tracking-tight">
                {formatDisplayRange(log.startTime, log.endTime)}
              </span>
            </div>

            {resolvedLink && (
              <a 
                href={resolvedLink} 
                target="_blank" 
                rel="noreferrer"
                onClick={onClose}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/20 hover:border-cyan-400/40 transition-all group"
                title="Open Reference"
              >
                <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">Link</span>
                <LinkIcon size={12} className="group-hover:scale-110 transition-transform" />
              </a>
            )}
          </div>

          {/* Row 2: Subcategory */}
          {log.subcategory && (
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-white/20" />
              <span className="text-[11px] font-black text-white/30 uppercase tracking-widest">
                {log.subcategory}
              </span>
            </div>
          )}

          {/* Row 3: Notes */}
          {log.notes && (
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
              <p className="text-[12px] text-white/50 leading-relaxed font-medium">
                {log.notes}
              </p>
            </div>
          )}

          {/* Row 4: Energy Vector & Neural Retrospective */}
          <div className="flex flex-col gap-3 mt-1 bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
            {/* Energy Vector Scale */}
            <div className="flex items-center gap-3">
              <Zap size={14} className={clsx("transition-colors shrink-0", localEnergy > 80 ? "text-orange-500" : localEnergy > 40 ? "text-yellow-500" : "text-blue-500")} />
              <div className="relative flex-1 h-6 flex items-center">
                {/* Background Track */}
                <div className="absolute inset-0 h-1.5 top-1/2 -translate-y-1/2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={clsx("h-full transition-all duration-150", localEnergyColor)}
                    style={{ width: `${localEnergy}%` }}
                  />
                </div>
                {/* Transparent Range Input for Interaction */}
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={localEnergy}
                  onChange={(e) => setLocalEnergy(parseInt(e.target.value))}
                  onMouseUp={() => {
                    updateLog(log.id, { energyLevel: localEnergy });
                    triggerMechanicalFeedback('click');
                  }}
                  onTouchEnd={() => {
                    updateLog(log.id, { energyLevel: localEnergy });
                    triggerMechanicalFeedback('click');
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {/* Tooltip indicator */}
                <div 
                  className="absolute top-[-14px] px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-black text-white/60 pointer-events-none transition-all"
                  style={{ left: `calc(${localEnergy}% - 10px)` }}
                >
                  {localEnergy}%
                </div>
              </div>
            </div>

            {/* Neural Retrospective Icons */}
            <div className="flex justify-between items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => {
                const emojis = ["😞", "😐", "🤷", "😊", "🔥"];
                const isActive = localRegret === val;
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setLocalRegret(val);
                      updateLog(log.id, { regretRating: val });
                      triggerMechanicalFeedback('clink');
                    }}
                    className={clsx(
                      "flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-lg transition-all",
                      isActive ? "bg-white/10 scale-110 shadow-lg border border-white/10" : "hover:bg-white/5 grayscale-[0.5] opacity-30 hover:opacity-100 hover:grayscale-0"
                    )}
                  >
                    <span className="text-base">{emojis[val-1]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
