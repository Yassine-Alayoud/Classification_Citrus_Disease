import React from "react";

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
};

export default function StatCard({ icon: Icon, label, value, sub }: StatCardProps) {
  return (
    <div className="cd-tag rounded-md p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-2 sm:mb-3" style={{ opacity: 0.6 }}>
          <Icon size={14} className="shrink-0" />
          <span className="cd-mono text-xs uppercase tracking-wide truncate">{label}</span>
        </div>
        <p className="cd-display text-2xl sm:text-3xl font-semibold leading-none wrap-break-word">
          {value}
        </p>
      </div>
      {sub && (
        <p className="text-xs mt-2 truncate" style={{ opacity: 0.55 }}>
          {sub}
        </p>
      )}
    </div>
  );
}