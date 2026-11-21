import { Activity, ShieldCheck } from "lucide-react";

type Props = {
  stats: {
    total: number;
    lowCount: number;
    mediumCount: number;
    highCount: number;
    criticalCount: number;
    topEntity: string;
  };
};

export function IntelRequestDashboard({ stats }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#e6f0fa] border-l-4 border-blue-600 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Total Requests</div>
          <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
          <div className="text-xs text-blue-700 mt-1">All time requests</div>
        </div>
        <div className="bg-[#e6fffa] border-l-4 border-teal-500 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-1">Low Urgency</div>
          <div className="text-3xl font-bold text-teal-900">{stats.lowCount}</div>
          <div className="text-xs text-teal-700 mt-1">Standard processing</div>
        </div>
        <div className="bg-[#fff5f5] border-l-4 border-orange-500 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-1">Medium Urgency</div>
          <div className="text-3xl font-bold text-orange-900">{stats.mediumCount}</div>
          <div className="text-xs text-orange-700 mt-1">Elevated priority</div>
        </div>
        <div className="bg-[#f3e8ff] border-l-4 border-purple-600 rounded-lg p-5 shadow-sm">
          <div className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">High & Critical</div>
          <div className="text-3xl font-bold text-purple-900">{stats.highCount + stats.criticalCount}</div>
          <div className="text-xs text-purple-700 mt-1">Requires immediate action</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide mb-4 border-b pb-2">Urgency Distribution</h2>
          <div className="space-y-4">
            {[
              { label: "Low", value: stats.lowCount, color: "bg-teal-500" },
              { label: "Medium", value: stats.mediumCount, color: "bg-orange-500" },
              { label: "High", value: stats.highCount, color: "bg-red-500" },
              { label: "Critical", value: stats.criticalCount, color: "bg-purple-600" },
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
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Most Requested Entity</h4>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded">
              <Activity size={16} className="text-blue-500" /> {stats.topEntity}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide mb-3 flex items-center gap-2">
            <ShieldCheck size={16} /> Key Management Takeaways
          </h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
            {stats.total === 0 ? (
              <li>No data available to generate insights.</li>
            ) : (
              <>
                <li><strong>{stats.highCount + stats.criticalCount}</strong> requests are marked as <strong>High or Critical</strong>. These require immediate attention and prioritization.</li>
                <li>The most frequently requested entity is <strong>"{stats.topEntity}"</strong>, indicating a concentrated focus of intelligence gathering.</li>
                <li>Currently, <strong>{Math.round(((stats.highCount + stats.criticalCount) / stats.total) * 100)}%</strong> of all requests are of elevated priority (High/Critical).</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}