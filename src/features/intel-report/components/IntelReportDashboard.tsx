import { Activity, ShieldCheck, Lock, Globe, ShieldAlert, FileText, ArrowUpRight, Clock } from "lucide-react";

export function IntelReportDashboard({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      
      {/* ========================================= */}
      {/* 1. KPI CARDS (Thin lines / Clean) */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Records</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
              <FileText size={20} />
            </div>
          </div>
          <div className="text-xs text-blue-600 font-medium mt-3 flex items-center gap-1">
            <ArrowUpRight size={14} /> Total Intelligence Entries
          </div>
        </div>

        {/* Card 2: Confidential */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Confidential</div>
              <div className="text-3xl font-bold text-gray-900">{stats.confidentialCount}</div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:scale-110 transition-transform">
              <Lock size={20} />
            </div>
          </div>
          <div className="text-xs text-purple-600 font-medium mt-3 flex items-center gap-1">
            High Priority Security
          </div>
        </div>

        {/* Card 3: Secret */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Secret</div>
              <div className="text-3xl font-bold text-gray-900">{stats.secretCount}</div>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg text-teal-600 group-hover:scale-110 transition-transform">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="text-xs text-teal-600 font-medium mt-3 flex items-center gap-1">
            Medium Priority Security
          </div>
        </div>

        {/* Card 4: Public */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Public</div>
              <div className="text-3xl font-bold text-gray-900">{stats.publicCount}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-600 group-hover:scale-110 transition-transform">
              <Globe size={20} />
            </div>
          </div>
          <div className="text-xs text-gray-500 font-medium mt-3 flex items-center gap-1">
            Low Priority / Public Info
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* 2. MAIN CONTENT GRID (Chart vs Takeaways) */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: Security Distribution Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide">Security Distribution</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">Live Data</span>
          </div>
          
          <div className="space-y-5">
            {[
              { label: "Confidential", value: stats.confidentialCount, color: "bg-purple-500", text: "text-purple-700" },
              { label: "Secret", value: stats.secretCount, color: "bg-teal-500", text: "text-teal-700" },
              { label: "Public", value: stats.publicCount, color: "bg-gray-400", text: "text-gray-700" },
            ].map((item) => {
              const percentage = stats.total === 0 ? 0 : Math.round((item.value / stats.total) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span className="text-gray-700">{item.label}</span>
                    <span className={item.text}>{item.value} records ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className={`${item.color} h-3 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded shadow-sm text-blue-600">
                  <Activity size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase">Most Tagged Entity</h4>
                  <div className="text-sm font-bold text-gray-800">{stats.topEntity}</div>
                </div>
              </div>
              <span className="text-xs text-blue-600 font-medium">View Details →</span>
            </div>
          </div>
        </div>
        
        {/* RIGHT: Key Security Takeaways (Shortened & Cleaned) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={20} className="text-[#2c5282]" /> 
            <h2 className="text-sm font-bold text-[#2c5282] uppercase tracking-wide">Key Security Takeaways</h2>
          </div>
          
          <div className="flex-1 space-y-4">
            {stats.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Clock size={40} className="mb-2 opacity-50" />
                <p className="text-sm">No data available to generate insights.</p>
              </div>
            ) : (
              <>
                {/* Insight 1 */}
                <div className="flex gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                  <div className="mt-0.5 text-purple-600"><Lock size={16} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">High-Risk Records Detected</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>{stats.confidentialCount}</strong> records are marked as <strong>Confidential</strong>. Strict access controls are required.
                    </p>
                  </div>
                </div>

                {/* Insight 2 */}
                <div className="flex gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <div className="mt-0.5 text-blue-600"><Activity size={16} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Primary Intelligence Focus</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>"{stats.topEntity}"</strong> is the most frequently referenced entity in current operations.
                    </p>
                  </div>
                </div>

                {/* Insight 3 */}
                <div className="flex gap-3 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                  <div className="mt-0.5 text-orange-600"><ShieldAlert size={16} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Clearance Requirement</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>{Math.round(((stats.confidentialCount + stats.secretCount) / stats.total) * 100)}%</strong> of records require elevated security clearance.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}