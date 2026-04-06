import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Factory, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { DASHBOARD_DATA } from './data';
import { ProductData } from './types';
import { cn } from './lib/utils';

const StatCard = ({ title, value, unit, icon: Icon, trend, trendValue, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4"
  >
    <div className="flex justify-between items-start">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
          trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}%
        </div>
      )}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <h3 className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</h3>
        <span className="text-slate-400 text-sm font-medium">{unit}</span>
      </div>
    </div>
  </motion.div>
);

const StatusBadge = ({ status }: { status: '이상' | '미달' }) => (
  <span className={cn(
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
    status === '이상' 
      ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
      : "bg-rose-100 text-rose-700 border border-rose-200"
  )}>
    {status === '이상' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
    {status}
  </span>
);

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);

  const customers = useMemo(() => {
    const list = Array.from(new Set(DASHBOARD_DATA.products.map(p => p.customer)));
    return ['All', ...list];
  }, []);

  const filteredProducts = useMemo(() => {
    return DASHBOARD_DATA.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCustomer = selectedCustomer === 'All' || p.customer === selectedCustomer;
      return matchesSearch && matchesCustomer;
    });
  }, [searchTerm, selectedCustomer]);

  const stats = useMemo(() => {
    const totalBacklog = DASHBOARD_DATA.products.reduce((acc, p) => acc + p.backlog, 0);
    const totalTarget = DASHBOARD_DATA.products.reduce((acc, p) => acc + p.productionTarget, 0);
    const avgMaterialProgress = Math.round(DASHBOARD_DATA.products.reduce((acc, p) => acc + p.materialProgress, 0) / DASHBOARD_DATA.products.length);
    const avgProductionProgress = Math.round(DASHBOARD_DATA.products.reduce((acc, p) => acc + p.productionProgress, 0) / DASHBOARD_DATA.products.length);
    
    return { totalBacklog, totalTarget, avgMaterialProgress, avgProductionProgress };
  }, []);

  const chartData = useMemo(() => {
    // Aggregate daily data across all products
    const dailyMap: Record<string, { date: string; target: number; arrival: number; achievement: number }> = {};
    
    DASHBOARD_DATA.products.forEach(p => {
      p.daily.forEach(d => {
        if (!dailyMap[d.date]) {
          dailyMap[d.date] = { date: d.date, target: 0, arrival: 0, achievement: 0 };
        }
        dailyMap[d.date].target += d.target;
        dailyMap[d.date].arrival += d.arrival;
        dailyMap[d.date].achievement += d.achievement;
      });
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">SCM Dashboard</h1>
              <p className="text-xs text-slate-500 font-medium">{DASHBOARD_DATA.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4" />
              기준일자: {DASHBOARD_DATA.baseDate}
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
              SCM
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="전체 수주 잔량" 
            value={stats.totalBacklog} 
            unit="만개" 
            icon={Package} 
            color="bg-indigo-500"
          />
          <StatCard 
            title="당월 생산 목표" 
            value={stats.totalTarget} 
            unit="만개" 
            icon={Factory} 
            color="bg-blue-500"
          />
          <StatCard 
            title="자재 입고 진도율" 
            value={stats.avgMaterialProgress} 
            unit="%" 
            icon={Truck} 
            trend="up"
            trendValue={12}
            color="bg-amber-500"
          />
          <StatCard 
            title="생산 실적 진도율" 
            value={stats.avgProductionProgress} 
            unit="%" 
            icon={TrendingUp} 
            trend="down"
            trendValue={3}
            color="bg-emerald-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                일별 생산 및 입고 추이
              </h3>
              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" /> 목표
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" /> 입고
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" /> 실적
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorArrival" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAchievement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="target" stroke="#6366f1" fillOpacity={1} fill="url(#colorTarget)" strokeWidth={2} />
                  <Area type="monotone" dataKey="arrival" stroke="#f59e0b" fillOpacity={1} fill="url(#colorArrival)" strokeWidth={2} />
                  <Area type="monotone" dataKey="achievement" stroke="#10b981" fillOpacity={1} fill="url(#colorAchievement)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              진도율 현황 요약
            </h3>
            <div className="space-y-6">
              {DASHBOARD_DATA.products.slice(0, 5).map((p, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{p.name}</span>
                    <span className="font-bold text-indigo-600">{p.productionProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${p.productionProgress}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={cn(
                        "h-full rounded-full",
                        p.status === '이상' ? "bg-emerald-500" : "bg-rose-500"
                      )}
                    />
                  </div>
                </div>
              ))}
              <button className="w-full py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                전체 현황 보기
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="제품명 또는 코드로 검색..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                {customers.map(c => <option key={c} value={c}>{c === 'All' ? '모든 고객사' : c}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">고객사</th>
                  <th className="px-6 py-4">제품 정보</th>
                  <th className="px-6 py-4 text-center">수주잔량</th>
                  <th className="px-6 py-4 text-center">생산목표</th>
                  <th className="px-6 py-4 text-center">자재진도</th>
                  <th className="px-6 py-4 text-center">생산진도</th>
                  <th className="px-6 py-4 text-center">상태</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <React.Fragment key={product.code}>
                    <tr 
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors cursor-pointer group",
                        selectedProduct?.code === product.code && "bg-indigo-50/30"
                      )}
                      onClick={() => setSelectedProduct(selectedProduct?.code === product.code ? null : product)}
                    >
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                          {product.customer}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {product.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{product.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-slate-600">
                        {product.backlog.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-900">
                        {product.productionTarget.toLocaleString()}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-amber-600">{product.materialProgress}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: `${product.materialProgress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-emerald-600">{product.productionProgress}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${product.productionProgress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <ChevronRight className={cn(
                          "w-5 h-5 text-slate-300 transition-transform",
                          selectedProduct?.code === product.code && "rotate-90 text-indigo-500"
                        )} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {selectedProduct?.code === product.code && (
                        <tr>
                          <td colSpan={8} className="px-6 py-0">
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="py-6 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    일별 상세 현황 (단위: 만개)
                                  </h4>
                                  <div className="bg-slate-50 rounded-xl p-4 overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-slate-400">
                                          <th className="pb-2 text-left">구분</th>
                                          {product.daily.map(d => <th key={d.date} className="pb-2 text-center">{d.date}</th>)}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        <tr>
                                          <td className="py-2 font-medium text-slate-500">생산목표</td>
                                          {product.daily.map((d, i) => <td key={i} className="py-2 text-center font-bold text-slate-700">{d.target || '-'}</td>)}
                                        </tr>
                                        <tr>
                                          <td className="py-2 font-medium text-slate-500">자재입고</td>
                                          {product.daily.map((d, i) => <td key={i} className="py-2 text-center font-bold text-amber-600">{d.arrival || '-'}</td>)}
                                        </tr>
                                        <tr>
                                          <td className="py-2 font-medium text-slate-500">생산실적</td>
                                          {product.daily.map((d, i) => <td key={i} className="py-2 text-center font-bold text-emerald-600">{d.achievement || '-'}</td>)}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                                    생산 진척도 시각화
                                  </h4>
                                  <div className="h-48 w-full bg-slate-50 rounded-xl p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={product.daily}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                        <Tooltip />
                                        <Bar dataKey="target" name="목표" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="achievement" name="실적" fill="#10b981" radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-indigo-900 rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-xl font-bold">SCM 담당자 가이드</h2>
            <p className="text-indigo-200 text-sm max-w-md">
              매일 자재 입고 현황과 생산 실적을 체크하여 미달 품목에 대한 조율을 진행하세요. 
              진도율이 20% 미만인 품목은 즉시 유관부서와 확인이 필요합니다.
            </p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
              보고서 내보내기
            </button>
            <button className="px-6 py-3 bg-indigo-700 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors border border-indigo-500">
              일정 조율 요청
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
