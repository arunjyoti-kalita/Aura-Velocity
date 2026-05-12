import { useMemo } from 'react';
import { useApp } from "../../contexts/useApp";
import { getEnergyLevel, CHRONOTYPES } from "../../utils/circadian";
import { ROW_HEIGHT, GRID_HEIGHT } from "../../utils/dateHelpers";

/**
 * Renders a subtle, beautiful biological energy wave behind the day column.
 */
export function EnergyWave() {
  const { chronotype } = useApp();

  const pathData = useMemo(() => {
    const points = [];
    // We sample every 30 mins (48 segments)
    const segments = 48;
    const width = 100; // SVG relative width
    
    for (let i = 0; i <= segments; i++) {
      const hour = 8 + (i * 0.5); // Starts at 8 AM
      const energy = getEnergyLevel(hour, chronotype);
      const x = width - (energy * 0.6); // Energy determines how far from the right it pushes
      const y = (i / segments) * 100; // 0 to 100% height
      points.push(`${x},${y}`);
    }

    // Close the path to form a shape on the right side
    return `M 100,0 L ${points.join(' L ')} L 100,100 Z`;
  }, [chronotype]);

  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.07] z-0 overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.5" />
          </linearGradient>
          <filter id="energyGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <path
          d={pathData}
          fill="url(#energyGradient)"
          className="opacity-50"
        />
      </svg>
      
      {/* Subtle Peak Markers */}
      <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-between py-4 text-[6px] font-black uppercase text-white/20 tracking-widest pl-2">
        <div style={{ top: '10%' }} className="absolute">Peak Potential</div>
        <div style={{ top: '40%' }} className="absolute">Afternoon Trough</div>
        <div style={{ top: '75%' }} className="absolute">Evening Surge</div>
      </div>
    </div>
  );
}
