import { Activity, ShieldCheck } from "lucide-react";

export function IntelReportDashboard({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#e6f0fa] border-l-4 border-blue-600 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Total Records</div>
          <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
          <div className="text-xs text-blue-700 mt-1">Total Intelligence Entries</div>
        </div>
        <div className="bg-[#f3e8ff] border-l-4 border-purple-600 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">Confidential</div>
          <div className="text-3xl font-bold text-purple-900">{stats.confidentialCount}</div>
          <div className="text-xs text-purple-700 mt-1">High Priority Security</div>
        </div>
        <div className="bg-[#e6fffa] border-l-4 border-teal-500 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-1">Secret</div>
          <div className="text-3xl font-bold text-teal-900">{stats.secretCount}</div>
          <div className="text-xs text-teal-700 mt-1">Medium Priority Security</div>
        </div>
        <div className="bg-[#fff5f5] border-l-4 border-red-500 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-red-900 uppercase tracking-wider mb-1">Public</div>
          <div className="text-3xl font-bold text-red-900">{stats.publicCount}</div>
          <div className="text-xs text-red-700 mt-1">Low Priority / Public Info</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide mb-4 border-b pb-2">Security Distribution</h2>
          <div className="space-y-4">
            {[
              { label: "Confidential", value: stats.confidentialCount, color: "bg-purple-500" },
              { label: "Secret", value: stats.secretCount, color: "bg-teal-500" },
              { label: "Public", value: stats.publicCount, color: "bg-red-500" },
            ].map((item) => {
              const percentage = stats.total === 0 ? 0 : Math.round((item.value / stats.total) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>{item.label}</span><span>{item.value} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Most Tagged Entity</h4>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded">
              <Activity size={16} className="text-blue-500" /> {stats.topEntity}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide mb-3 flex items-center gap-2">
            <ShieldCheck size={16} /> Key Security Takeaways
          </h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
            {stats.total === 0 ? (
              <li>No data available to generate insights.</li>
            ) : (
              <>
                <li><strong>{stats.confidentialCount}</strong> records are marked as <strong>Confidential</strong>. Ensure appropriate access controls are in place.</li>
                <li>The most frequently referenced entity across all submissions is <strong>"{stats.topEntity}"</strong>.</li>
                <li>Out of {stats.total} total records, <strong>{Math.round(((stats.confidentialCount + stats.secretCount) / stats.total) * 100)}%</strong> require elevated security clearance to view.</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}