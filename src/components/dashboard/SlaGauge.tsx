import React from 'react'
import { ShieldCheck } from 'lucide-react'

interface SlaGaugeProps {
  score: number // 0 to 100
  lastMonthScore: number
}

export const SlaGauge: React.FC<SlaGaugeProps> = ({ score = 94.2, lastMonthScore = 88.5 }) => {
  // SVG Semi circle gauge
  const radius = 70
  const circumference = Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-between h-full pt-1">
      <div className="relative flex items-center justify-center w-48 h-28 overflow-hidden">
        <svg className="w-48 h-48 transform -rotate-180" viewBox="0 0 160 160">
          {/* Background track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset="0"
          />
          {/* Colored progress arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="70%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center icon / badge matching VertexLab */}
        <div className="absolute bottom-1 flex items-center justify-center">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center px-4 mt-2">
        Team response score is <strong className="text-slate-800">{score}%</strong>, higher than corporate benchmark.
      </p>

      {/* Score and Last Month pills */}
      <div className="flex items-center justify-center gap-8 w-full pt-3 mt-2 border-t border-slate-100">
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-semibold text-slate-400">Score</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 justify-center">
            <span className="text-base font-bold text-slate-900">{score}%</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
              +{(score - lastMonthScore).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            <span className="text-[11px] font-semibold text-slate-400">Last Month</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 justify-center">
            <span className="text-base font-bold text-slate-900">{lastMonthScore}%</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
              +10%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

