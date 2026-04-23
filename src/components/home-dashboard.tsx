"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ─── Mock practice data ────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MINUTES = [25, 40, 15, 60, 45, 70, 30];

// ─── Smooth line chart ─────────────────────────────────────────────────────────

function PracticeChart() {
  const W = 600;
  const H = 160;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(...MINUTES) + 10;
  const total = MINUTES.reduce((s, m) => s + m, 0);

  const pts = MINUTES.map((m, i) => ({
    x: padL + (i / (MINUTES.length - 1)) * innerW,
    y: padT + innerH - (m / max) * innerH,
  }));

  // Catmull-Rom → cubic bezier for smooth curve
  function smooth(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
    }
    return d;
  }

  const linePath = smooth(pts);
  const bottomY = padT + innerH;
  const fillPath = `${linePath} L${pts[pts.length - 1].x},${bottomY} L${pts[0].x},${bottomY} Z`;

  // Y-axis gridlines
  const gridLines = [0, 25, 50, 75].map((pct) => ({
    y: padT + innerH - (pct / 100) * innerH,
    label: Math.round((pct / 100) * max),
  }));

  return (
    <div className="dash-chart-wrap">
      <div className="dash-chart-meta">
        <span className="dash-card-label">Practice time</span>
        <div className="dash-chart-total">
          <strong>{total}</strong>
          <span>min this week</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="dash-chart-svg"
        preserveAspectRatio="none"
        aria-label="Practice time chart"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#004aad" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#004aad" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridLines.map(({ y, label }) => (
          <g key={label}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="#e2eaf5"
              strokeWidth="1"
            />
            <text
              x={padL - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#8faac8"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Fill area */}
        <path d={fillPath} fill="url(#chartFill)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#004aad"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#004aad" />
            <circle cx={p.x} cy={p.y} r="3" fill="#fff" />
          </g>
        ))}

        {/* X-axis labels */}
        {DAYS.map((d, i) => (
          <text
            key={d}
            x={pts[i].x}
            y={H - 4}
            textAnchor="middle"
            fontSize="11"
            fill="#8faac8"
            fontFamily="JetBrains Mono, monospace"
          >
            {d}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Countdown ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function CountdownCard() {
  const [examDate, setExamDate] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ielts-exam-date");
    if (saved) {
      setExamDate(saved);
      setDays(daysUntil(saved));
    }
  }, []);

  function handleChange(val: string) {
    setExamDate(val);
    localStorage.setItem("ielts-exam-date", val);
    setDays(val ? daysUntil(val) : null);
  }

  const urgent = days !== null && days <= 7 && days > 0;

  return (
    <div className="dash-countdown-card">
      <span className="dash-countdown-eyebrow">Exam date</span>

      <div className="dash-date-row">
        <input
          ref={inputRef}
          type="date"
          className="dash-date-input"
          value={examDate}
          onChange={(e) => handleChange(e.target.value)}
          aria-label="Set your IELTS exam date"
        />
        {examDate && (
          <button
            className="dash-date-clear"
            type="button"
            onClick={() => { handleChange(""); }}
            aria-label="Clear exam date"
          >
            ×
          </button>
        )}
      </div>

      <div className="dash-countdown-display">
        {days === null ? (
          <p className="dash-countdown-hint">Add your exam date to see the countdown</p>
        ) : days <= 0 ? (
          <div className="dash-countdown-today">
            <span className="dash-countdown-num">0</span>
            <span className="dash-countdown-label">Good luck today!</span>
          </div>
        ) : (
          <div className={`dash-countdown-body${urgent ? " dash-countdown-urgent" : ""}`}>
            <span className="dash-countdown-num">{days}</span>
            <span className="dash-countdown-label">days left</span>
            {urgent && <span className="dash-countdown-tag">Final stretch!</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skill cards ───────────────────────────────────────────────────────────────

const SKILLS = [
  { href: "/reading", label: "Reading" },
  { href: "/writing", label: "Writing" },
  { href: "/speaking", label: "Speaking" },
  { href: "/listening", label: "Listening" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export function HomeDashboard() {
  return (
    <div className="dash-page">
      {/* Top row: chart + countdown */}
      <div className="dash-top">
        <div className="dash-chart-card">
          <PracticeChart />
        </div>
        <CountdownCard />
      </div>

      {/* 4 skill sections */}
      <div className="dash-skills">
        {SKILLS.map((s) => (
          <Link key={s.href} href={s.href} className="dash-skill-card">
            <span className="dash-skill-name">{s.label}</span>
            <span className="dash-skill-arrow">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
