import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <div className="flex items-center gap-1 text-red-500 font-medium text-xs animate-pulse">
        <Clock size={14} />
        <span>Class Started / Expired</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs font-bold">
      <div className="flex flex-col items-center bg-blue-100 text-blue-800 rounded px-2 py-1 min-w-[36px]">
        <span className="text-sm leading-none">{timeLeft.days}</span>
        <span className="text-[8px] uppercase tracking-wider">Days</span>
      </div>
      <span className="text-gray-400">:</span>
      <div className="flex flex-col items-center bg-blue-100 text-blue-800 rounded px-2 py-1 min-w-[36px]">
        <span className="text-sm leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-[8px] uppercase tracking-wider">Hrs</span>
      </div>
      <span className="text-gray-400">:</span>
      <div className="flex flex-col items-center bg-blue-100 text-blue-800 rounded px-2 py-1 min-w-[36px]">
        <span className="text-sm leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-[8px] uppercase tracking-wider">Min</span>
      </div>
      <span className="text-gray-400">:</span>
      <div className="flex flex-col items-center bg-blue-100 text-blue-800 rounded px-2 py-1 min-w-[36px] animate-pulse">
        <span className="text-sm leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span className="text-[8px] uppercase tracking-wider">Sec</span>
      </div>
    </div>
  );
}
