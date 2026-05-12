import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../contexts/useApp';
import { getEnergyLevel } from '../../utils/circadian';

export function CircadianWave() {
  const { chronotype } = useApp();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const waveParams = useMemo(() => {
    const hour = time.getHours();
    const energy = getEnergyLevel(hour, chronotype);
    
    // Dynamically adjust wave based on energy level
    // 85-100: High Intensity (Peak)
    // 60-84: Balanced Intensity
    // 30-59: Low Intensity (Dip)
    // < 30: Recovery (Sleep)
    
    let amplitude = 5 + (energy / 100) * 15; // Amplitude between 5 and 20
    let frequency = 0.005 + (energy / 100) * 0.015; // Frequency between 0.005 and 0.02
    let opacity = 0.05 + (energy / 100) * 0.25; // Opacity between 0.05 and 0.3
    let color = 'stroke-accent';

    if (energy >= 85) {
      color = 'stroke-accent'; // Peak
    } else if (energy >= 60) {
      color = 'stroke-orange-400'; // Steady
    } else if (energy >= 35) {
      color = 'stroke-indigo-400'; // Dip/Slump
    } else {
      color = 'stroke-purple-500'; // Deep Recovery/Sleep
    }

    return { amplitude, frequency, opacity, color };
  }, [time, chronotype]);

  // Generate a simple sine wave path
  const path = useMemo(() => {
    const points = [];
    const width = 1200; // Large width for responsiveness
    const height = 40;
    const { amplitude, frequency } = waveParams;
    
    for (let x = 0; x <= width; x += 10) {
      const y = (height / 2) + Math.sin(x * frequency) * amplitude;
      points.push(`${x},${y}`);
    }
    
    return `M ${points.join(' L ')}`;
  }, [waveParams]);

  return (
    <div className="absolute left-0 right-0 top-0 h-10 pointer-events-none overflow-hidden z-50">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 1200 40" 
        preserveAspectRatio="none"
        className="transition-all duration-1000 ease-in-out"
        style={{ opacity: waveParams.opacity }}
      >
        <path
          d={path}
          fill="none"
          strokeWidth="2"
          className={`${waveParams.color} transition-all duration-1000 ease-in-out`}
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="10s"
            repeatCount="indefinite"
            values={`
              ${path};
              M 0,20 L 1200,20;
              ${path}
            `}
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          />
        </path>
        
        {/* Glow Layer */}
        <path
          d={path}
          fill="none"
          strokeWidth="6"
          className={`${waveParams.color} blur-md transition-all duration-1000 ease-in-out`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
