import { memo } from 'react';
import { ROW_HEIGHT, GRID_HEIGHT, generateTimeLabels } from '../../utils/dateHelpers';

export const TimeColumn = memo(function TimeColumn() {
  const labels = generateTimeLabels();

  return (
    <div className="w-full flex-shrink-0 bg-transparent relative z-10 select-none">
      <div className="relative w-full" style={{ height: `${GRID_HEIGHT}px` }}>
        {labels.map((label, index) => (
          <div
            key={label + index}
            className="absolute left-0 transform -translate-y-1/2 flex items-center justify-center w-full"
            style={{ top: `${(index * ROW_HEIGHT * 2)}px` }}
          >
            <span className="font-heading text-[8px] font-bold text-white/50 uppercase tracking-tighter whitespace-nowrap transition-opacity drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
