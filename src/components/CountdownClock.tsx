import React, { useEffect, useRef, useState } from 'react';
import { Clock, Lock } from 'lucide-react';

interface CountdownClockProps {
  targetTimeIso: string;
  isPublished: boolean;
  onCountdownFinished?: () => void;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateRemaining(targetIso: string, nowMs: number): TimeRemaining {
  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { totalMs: diff, days, hours, minutes, seconds };
}

export function formatScheduleDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  const datePart = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} · Pukul ${timePart} WIB`;
}

export const CountdownClock: React.FC<CountdownClockProps> = ({
  targetTimeIso,
  isPublished,
  onCountdownFinished,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const wasCountingDownRef = useRef<boolean>(
    calculateRemaining(targetTimeIso, Date.now()).totalMs > 0
  );
  const hasTriggeredFinishRef = useRef<boolean>(false);

  useEffect(() => {
    const initialRemaining = calculateRemaining(targetTimeIso, Date.now()).totalMs;
    wasCountingDownRef.current = initialRemaining > 0;
    hasTriggeredFinishRef.current = false;
  }, [targetTimeIso]);

  useEffect(() => {
    if (isPublished) return;

    const timer = setInterval(() => {
      const current = Date.now();
      setNowMs(current);

      const targetMs = new Date(targetTimeIso).getTime();
      if (
        !Number.isNaN(targetMs) &&
        wasCountingDownRef.current &&
        current >= targetMs &&
        !hasTriggeredFinishRef.current
      ) {
        hasTriggeredFinishRef.current = true;
        if (onCountdownFinished) {
          onCountdownFinished();
        }
      }
    }, 250);

    return () => clearInterval(timer);
  }, [targetTimeIso, isPublished, onCountdownFinished]);

  const remaining = calculateRemaining(targetTimeIso, nowMs);

  // Hide the countdown timer completely once the announcement is opened (isPublished === true)
  // or once an active countdown reaches 0
  if (isPublished || (wasCountingDownRef.current && remaining.totalMs <= 0)) {
    return null;
  }

  const currentLiveClock = new Date(nowMs).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const pad2 = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="bg-palette-text text-white border border-palette-primary/50 rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-sm">
      {/* Top Bar: Label & Live Digital Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/15">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-palette-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Clock className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-palette-accent leading-snug">
              Hitung Mundur Pembukaan Pengumuman Kelulusan
            </p>
            <p className="text-[11px] sm:text-xs text-palette-accent/80 mt-0.5 font-mono tabular-nums break-words">
              Jadwal Dibuka: {formatScheduleDateTime(targetTimeIso)}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-lg bg-palette-primary/50 border border-white/15 font-mono tabular-nums text-xs sm:text-sm w-full sm:w-auto shrink-0">
          <span className="text-palette-accent">Waktu Server:</span>
          <strong className="text-white font-bold tracking-wider">{currentLiveClock} WIB</strong>
        </div>
      </div>

      {/* LARGE 4-Segment Digital Countdown Display */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { label: 'HARI', value: pad2(remaining.days) },
          { label: 'JAM', value: pad2(remaining.hours) },
          { label: 'MENIT', value: pad2(remaining.minutes) },
          { label: 'DETIK', value: pad2(remaining.seconds) },
        ].map((unit) => (
          <div
            key={unit.label}
            className="bg-palette-primary/45 border border-palette-accent/25 rounded-xl py-4 sm:py-6 px-3 sm:px-4 text-center flex flex-col items-center justify-center"
          >
            <div className="font-mono tabular-nums text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-none">
              {unit.value}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase text-palette-accent mt-2 sm:mt-2.5">
              {unit.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs sm:text-sm">
        <div className="flex items-start sm:items-center gap-2">
          <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
          <span className="text-amber-200 font-semibold leading-relaxed">
            Portal verifikasi akan otomatis terbuka dan hitung mundur ini akan tertutup saat waktu
            pengumuman tiba
          </span>
        </div>

        <span className="text-[11px] sm:text-xs text-palette-accent/80 shrink-0">
          Sinkronisasi Waktu Real-Time
        </span>
      </div>
    </div>
  );
};
