'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TimelineControlProps {
  minDate: string;
  maxDate: string;
  selectedDate?: string;
  onDateChange: (date: string) => void;
  onRangeChange?: (from: string, to: string) => void;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  interval?: number; // ms between steps
}

export default function TimelineControl({
  minDate,
  maxDate,
  selectedDate,
  onDateChange,
  onRangeChange,
  isPlaying = false,
  onPlayToggle,
  interval = 500,
}: TimelineControlProps) {
  const [playing, setPlaying] = useState(isPlaying);
  const [currentDate, setCurrentDate] = useState(selectedDate || maxDate);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const minTime = parseDateToUtcMs(minDate);
  const maxTime = parseDateToUtcMs(maxDate);
  const currentTime = parseDateToUtcMs(currentDate);
  const totalDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24));

  // Calculate position percentage
  const position = totalDays > 0 
    ? ((currentTime - minTime) / (maxTime - minTime)) * 100 
    : 100;

  // Generate tick marks for months
  const ticks = generateMonthTicks(minDate, maxDate);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value);
    const newTime = minTime + (percent / 100) * (maxTime - minTime);
    const newDate = utcMsToDateString(newTime);
    setCurrentDate(newDate);
    onDateChange(newDate);
    
    if (onRangeChange) {
      onRangeChange(minDate, newDate);
    }
  };

  const stepForward = useCallback(() => {
    setCurrentDate(prev => {
      const nextTime = parseDateToUtcMs(prev) + 24 * 60 * 60 * 1000;
      
      if (nextTime > maxTime) {
        setPlaying(false);
        return maxDate;
      }
      
      const newDate = utcMsToDateString(nextTime);
      onDateChange(newDate);
      if (onRangeChange) {
        onRangeChange(minDate, newDate);
      }
      return newDate;
    });
  }, [maxTime, maxDate, minDate, onDateChange, onRangeChange]);

  const stepBackward = useCallback(() => {
    setCurrentDate(prev => {
      const nextTime = parseDateToUtcMs(prev) - 24 * 60 * 60 * 1000;
      
      if (nextTime < minTime) {
        setPlaying(false);
        return minDate;
      }
      
      const newDate = utcMsToDateString(nextTime);
      onDateChange(newDate);
      if (onRangeChange) {
        onRangeChange(minDate, newDate);
      }
      return newDate;
    });
  }, [minTime, minDate, onDateChange, onRangeChange]);

  const togglePlay = () => {
    const newPlaying = !playing;
    setPlaying(newPlaying);
    if (onPlayToggle) onPlayToggle();
  };

  const reset = () => {
    setPlaying(false);
    setCurrentDate(minDate);
    onDateChange(minDate);
    if (onRangeChange) {
      onRangeChange(minDate, minDate);
    }
  };

  const goToEnd = () => {
    setPlaying(false);
    setCurrentDate(maxDate);
    onDateChange(maxDate);
    if (onRangeChange) {
      onRangeChange(minDate, maxDate);
    }
  };

  // Auto-play effect
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        if (direction === 1) {
          stepForward();
        } else {
          stepBackward();
        }
      }, interval / speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playing, interval, speed, stepForward, stepBackward, direction]);

  // Sync with external isPlaying
  useEffect(() => {
    setPlaying(isPlaying);
  }, [isPlaying]);

  // Sync with external selectedDate
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  return (
    <div style={{
      background: 'rgba(10, 10, 10, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid #2a2a2a',
      padding: '12px 20px',
    }}>
      {/* Current Date Display */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Điều khiển thời gian
        </div>
        <div style={{ 
          fontSize: 14, 
          fontWeight: 700,
          color: '#1f77b4',
          background: '#1f77b420',
          padding: '4px 12px',
          borderRadius: 6,
        }}>
          📅 {formatDateVi(currentDate)}
        </div>
      </div>

      {/* Slider Track */}
      <div style={{ position: 'relative', height: 40, marginBottom: 8 }}>
        {/* Track Background */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 0,
          right: 0,
          height: 8,
          background: '#1a1a1a',
          borderRadius: 4,
        }}>
          {/* Progress Fill */}
          <div style={{
            height: '100%',
            width: `${position}%`,
            background: 'linear-gradient(90deg, #1f77b4, #2ca02c)',
            borderRadius: 4,
            transition: 'width 0.1s ease',
          }} />
        </div>

        {/* Month Ticks */}
        {ticks.map((tick) => (
          <div
            key={tick.date}
            style={{
              position: 'absolute',
              left: `${tick.position}%`,
              top: 0,
              transform: 'translateX(-50%)',
            }}
          >
            <div style={{
              width: 1,
              height: tick.isYear ? 12 : 8,
              background: tick.isYear ? '#666' : '#333',
              margin: '0 auto',
            }} />
            {tick.showLabel && (
              <div style={{
                fontSize: 9,
                opacity: 0.5,
                whiteSpace: 'nowrap',
                marginTop: 26,
                textAlign: 'center',
              }}>
                {tick.label}
              </div>
            )}
          </div>
        ))}

        {/* Hidden Range Input */}
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={handleSliderChange}
          title="Mốc thời gian"
          aria-label="Mốc thời gian"
          style={{
            position: 'absolute',
            top: 12,
            left: 0,
            width: '100%',
            height: 16,
            opacity: 0,
            cursor: 'pointer',
            zIndex: 10,
          }}
        />

        {/* Thumb Indicator */}
        <div style={{
          position: 'absolute',
          left: `${position}%`,
          top: 12,
          transform: 'translateX(-50%)',
          width: 16,
          height: 16,
          background: '#1f77b4',
          borderRadius: '50%',
          border: '3px solid #fff',
          boxShadow: '0 2px 8px rgba(31, 119, 180, 0.5)',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: 12,
      }}>
        {/* Date Range Info */}
        <div style={{ fontSize: 10, opacity: 0.5 }}>
          {formatDateVi(minDate)} → {formatDateVi(maxDate)}
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={reset} style={controlButtonStyle} title="Về đầu">
            ⏮
          </button>
          <button onClick={stepBackward} style={controlButtonStyle} title="Lùi 1 ngày">
            ◀
          </button>
          <button
            onClick={() => {
              setDirection(-1);
              setPlaying(true);
            }}
            style={{
              ...controlButtonStyle,
              background: direction === -1 && playing ? '#d97706' : '#21262d',
            }}
            title="Tua ngược"
          >
            ⏪
          </button>
          <button 
            onClick={togglePlay} 
            style={{
              ...controlButtonStyle,
              background: playing ? '#d62728' : '#2ca02c',
              width: 40,
            }} 
            title={playing ? 'Dừng' : 'Phát'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={stepForward} style={controlButtonStyle} title="Tiến 1 ngày">
            ▶
          </button>
          <button
            onClick={() => {
              setDirection(1);
              setPlaying(true);
            }}
            style={{
              ...controlButtonStyle,
              background: direction === 1 && playing ? '#2563eb' : '#21262d',
            }}
            title="Tua xuôi"
          >
            ⏩
          </button>
          <button onClick={goToEnd} style={controlButtonStyle} title="Về cuối">
            ⏭
          </button>
        </div>

        {/* Speed Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, opacity: 0.5 }}>Tốc độ:</span>
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                ...speedButtonStyle,
                background: speed === s ? '#1f77b4' : 'transparent',
                borderColor: speed === s ? '#1f77b4' : '#333',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper: Generate month ticks
function generateMonthTicks(minDate: string, maxDate: string): Array<{
  date: string;
  position: number;
  label: string;
  isYear: boolean;
  showLabel: boolean;
}> {
  const ticks: Array<{
    date: string;
    position: number;
    label: string;
    isYear: boolean;
    showLabel: boolean;
  }> = [];

  const min = parseDateToUtc(minDate);
  const max = parseDateToUtc(maxDate);
  const totalTime = max.getTime() - min.getTime();

  // Start from first day of min month
  const current = new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), 1));
  
  let tickCount = 0;
  while (current <= max) {
    const position = ((current.getTime() - min.getTime()) / totalTime) * 100;
    const isYear = current.getUTCMonth() === 0;
    
    ticks.push({
      date: current.toISOString().split('T')[0],
      position: Math.max(0, Math.min(100, position)),
      label: isYear 
        ? current.getUTCFullYear().toString()
        : `T${current.getUTCMonth() + 1}`,
      isYear,
      showLabel: tickCount % 2 === 0 || isYear,
    });
    
    current.setUTCMonth(current.getUTCMonth() + 1);
    tickCount++;
    
    // Safety limit
    if (tickCount > 100) break;
  }

  return ticks;
}

// Helper: Format date in Vietnamese with time
function formatDateVi(dateStr: string): string {
  const date = parseDateToUtc(dateStr);
  const dateFormatted = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateFormatted} ${timeFormatted}`;
}

// Helper: Format date without time
function formatDateOnlyVi(dateStr: string): string {
  const date = parseDateToUtc(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function parseDateToUtc(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return new Date(dateStr);
}

function parseDateToUtcMs(dateStr: string): number {
  return parseDateToUtc(dateStr).getTime();
}

function utcMsToDateString(ms: number): string {
  return new Date(ms).toISOString().split('T')[0];
}

const controlButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: '1px solid #30363d',
  background: '#21262d',
  color: '#c9d1d9',
  fontSize: 12,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const speedButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #30363d',
  background: 'transparent',
  color: '#c9d1d9',
  fontSize: 10,
  cursor: 'pointer',
};
