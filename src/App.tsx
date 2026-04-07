import React, { useState, useMemo, useCallback } from 'react';
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
  ArrowDownRight,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap",
    status === '이상' 
      ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
      : "bg-rose-100 text-rose-700 border border-rose-200"
  )}>
    {status === '이상' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
    {status}
  </span>
);

const DATA_VERSION = '2';

const loadProducts = (): ProductData[] => {
  const savedVersion = localStorage.getItem('scm_data_version');
  if (savedVersion !== DATA_VERSION) {
    localStorage.removeItem('scm_products');
    localStorage.setItem('scm_data_version', DATA_VERSION);
  }
  const saved = localStorage.getItem('scm_products');
  if (saved) {
    return JSON.parse(saved);
  }
  return DASHBOARD_DATA.products.map(p => ({ ...p, daily: p.daily.map(d => ({ ...d })) }));
};

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [products, setProducts] = useState<ProductData[]>(loadProducts);
  const [editingTargets, setEditingTargets] = useState<Record<string, number[]>>({});
  const [editingArrivals, setEditingArrivals] = useState<Record<string, number[]>>({});
  const [editingAchievements, setEditingAchievements] = useState<Record<string, number[]>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving'>>({});

  // 2026년 4월: 수요일 시작. 일~토 7열 고정, 주차별 행 구분
  // 각 주차: [일,월,화,수,목,금,토] 에 해당하는 daily index (null = 빈 칸)
  const calendarWeeks = [
    { label: '1주차', cols: [null, null, null, 0, 1, 2, 3] },    // 4/1(수)~4/4(토)
    { label: '2주차', cols: [4, 5, 6, 7, 8, 9, 10] },            // 4/5(일)~4/11(토)
    { label: '3주차', cols: [11, 12, 13, 14, 15, 16, 17] },      // 4/12(일)~4/18(토)
    { label: '4주차', cols: [18, 19, 20, 21, 22, 23, 24] },      // 4/19(일)~4/25(토)
    { label: '5주차', cols: [25, 26, 27, 28, 29, null, null] },   // 4/26(일)~4/30(수)
  ];

  const customers = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.customer)));
    return ['All', ...list];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCustomer = selectedCustomer === 'All' || p.customer === selectedCustomer;
      return matchesSearch && matchesCustomer;
    });
  }, [searchTerm, selectedCustomer, products]);

  const stats = useMemo(() => {
    const totalBacklog = products.reduce((acc, p) => acc + p.backlog, 0);
    const totalTarget = products.reduce((acc, p) => acc + p.productionTarget, 0);
    const totalAchievement = products.reduce((acc, p) => acc + p.daily.reduce((s, d) => s + d.achievement, 0), 0);
    const avgMaterialProgress = Math.round(products.reduce((acc, p) => acc + p.materialProgress, 0) / products.length);
    const avgProductionProgress = Math.round(products.reduce((acc, p) => acc + p.productionProgress, 0) / products.length);
    const targetProgressRate = Math.round((7 / 30) * 100);

    return { totalBacklog, totalTarget, totalAchievement, avgMaterialProgress, avgProductionProgress, targetProgressRate };
  }, [products]);

  const handleTargetChange = useCallback((productCode: string, dayIndex: number, value: string) => {
    if (value === '') { value = '0'; }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setEditingTargets(prev => {
      const current = prev[productCode] || products.find(p => p.code === productCode)!.daily.map(d => d.target);
      const updated = [...current];
      updated[dayIndex] = num;
      return { ...prev, [productCode]: updated };
    });
  }, [products]);

  const handleArrivalChange = useCallback((productCode: string, dayIndex: number, value: string) => {
    if (value === '') { value = '0'; }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setEditingArrivals(prev => {
      const current = prev[productCode] || products.find(p => p.code === productCode)!.daily.map(d => d.arrival);
      const updated = [...current];
      updated[dayIndex] = num;
      return { ...prev, [productCode]: updated };
    });
  }, [products]);

  const handleAchievementChange = useCallback((productCode: string, dayIndex: number, value: string) => {
    if (value === '') { value = '0'; }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setEditingAchievements(prev => {
      const current = prev[productCode] || products.find(p => p.code === productCode)!.daily.map(d => d.achievement);
      const updated = [...current];
      updated[dayIndex] = num;
      return { ...prev, [productCode]: updated };
    });
  }, [products]);

  const handleSave = useCallback((productCode: string) => {
    const targets = editingTargets[productCode];
    const arrivals = editingArrivals[productCode];
    const achievements = editingAchievements[productCode];
    if (!targets && !arrivals && !achievements) return;

    setSaveStatus(prev => ({ ...prev, [productCode]: 'saving' }));

    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.code !== productCode) return p;
        const newDaily = p.daily.map((d, i) => ({
          ...d,
          ...(targets ? { target: targets[i] } : {}),
          ...(arrivals ? { arrival: arrivals[i] } : {}),
          ...(achievements ? { achievement: achievements[i] } : {}),
        }));
        return { ...p, daily: newDaily };
      });
      localStorage.setItem('scm_products', JSON.stringify(updated));
      return updated;
    });

    setEditingTargets(prev => {
      const next = { ...prev };
      delete next[productCode];
      return next;
    });
    setEditingArrivals(prev => {
      const next = { ...prev };
      delete next[productCode];
      return next;
    });
    setEditingAchievements(prev => {
      const next = { ...prev };
      delete next[productCode];
      return next;
    });

    setSaveStatus(prev => ({ ...prev, [productCode]: 'saved' }));
    setTimeout(() => setSaveStatus(prev => {
      const next = { ...prev };
      delete next[productCode];
      return next;
    }), 2000);
  }, [editingTargets, editingArrivals, editingAchievements]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-4">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1860px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{DASHBOARD_DATA.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4" />
              기준일자: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1860px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* 종합 현황 보드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">종합 현황</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500 shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">4/1 기준 수주잔량</p>
                <p className="text-lg font-bold text-slate-900">{stats.totalBacklog.toLocaleString()}<span className="text-xs text-slate-400 ml-0.5">만개</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500 shrink-0">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">당월 생산 목표</p>
                <p className="text-lg font-bold text-slate-900">{stats.totalTarget.toLocaleString()}<span className="text-xs text-slate-400 ml-0.5">만개</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">당월 생산 완료</p>
                <p className="text-lg font-bold text-slate-900">{Math.round(stats.totalAchievement / 10).toLocaleString()}<span className="text-xs text-slate-400 ml-0.5">만개</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 shrink-0">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">자재 입고 진도율</p>
                <p className="text-lg font-bold text-amber-600">{stats.avgMaterialProgress}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500 shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">생산 실적 진도율</p>
                <p className="text-lg font-bold text-emerald-600">{stats.avgProductionProgress}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500 shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">목표 진도율</p>
                <p className="text-lg font-bold text-indigo-600">{stats.targetProgressRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 고객사별 진도율 + 주차별 진도율 그래프 */}
        {(() => {
          const customerStats = customers.filter(c => c !== 'All').map(customer => {
            const custProducts = products.filter(p => p.customer === customer);
            const avgMaterial = Math.round(custProducts.reduce((s, p) => s + p.materialProgress, 0) / custProducts.length);
            const avgProduction = Math.round(custProducts.reduce((s, p) => s + p.productionProgress, 0) / custProducts.length);
            const totalTarget = custProducts.reduce((s, p) => s + p.productionTarget, 0);
            const itemCount = custProducts.length;
            return { customer, avgMaterial, avgProduction, totalTarget, itemCount };
          });

          // 주차별 누적 진도율 계산 (일요일 기준)
          // 4월 2026: 1주차 4/1(수)~4/5(일), 2주차 4/6(월)~4/12(일), 3주차 4/13~4/19, 4주차 4/20~4/26, 5주차 4/27~4/30
          // 근무일: 1주차 3일, 2주차 5일, 3주차 5일, 4주차 5일, 5주차 4일 = 총 22일
          const workingDays = [3, 5, 5, 5, 4]; // 주차별 근무일수
          const totalWorkingDays = workingDays.reduce((a, b) => a + b, 0); // 22
          const weekLabels = ['1주차', '2주차', '3주차', '4주차', '5주차'];

          // 1주차 실적 계산 (index 0~4: 4/1~4/5)
          const totalProductionTarget = products.reduce((s, p) => s + p.productionTarget, 0);
          let week1Arrival = 0, week1Achievement = 0;
          products.forEach(p => {
            for (let i = 0; i <= 4 && i < p.daily.length; i++) {
              week1Arrival += p.daily[i].arrival;
              week1Achievement += p.daily[i].achievement;
            }
          });

          const weeklyChartData = weekLabels.map((label, idx) => {
            const cumDays = workingDays.slice(0, idx + 1).reduce((a, b) => a + b, 0);
            const targetRate = Math.round((cumDays / totalWorkingDays) * 1000) / 10;
            return {
              name: label,
              목표: targetRate,
              자재입고: idx === 0 ? Math.round((week1Arrival / totalProductionTarget) * 1000) / 10 : undefined,
              생산실적: idx === 0 ? Math.round((week1Achievement / totalProductionTarget) * 1000) / 10 : undefined,
            };
          });

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 좌측: 고객사별 진도율 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">고객사별 진도율</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customerStats.map(cs => (
                    <div key={cs.customer} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">{cs.customer}</span>
                        <span className="text-[10px] text-slate-400">{cs.itemCount}개 · {cs.totalTarget.toLocaleString()}만개</span>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-amber-600">자재 진도율</span>
                            <span className="text-[11px] font-bold text-amber-600">{cs.avgMaterial}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(cs.avgMaterial, 100)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-emerald-600">생산 진도율</span>
                            <span className="text-[11px] font-bold text-emerald-600">{cs.avgProduction}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(cs.avgProduction, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 우측: 주차별 진도율 그래프 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">주차별 진도율 추이</h3>
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number) => [`${value}%`]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="목표" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="자재입고" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="생산실적" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Filters & Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  {customers.map(c => <option key={c} value={c}>{c === 'All' ? '모든 고객사' : c}</option>)}
                </select>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="제품명 또는 코드로 검색..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {/* 금일 기준 목표 진도율 */}
            {(() => {
              const today = new Date();
              const dayOfMonth = today.getDate();
              const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
              const progressPct = Math.round((dayOfMonth / daysInMonth) * 100);
              return (
                <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-xs font-bold text-indigo-700 whitespace-nowrap">금일 목표 진도율</span>
                  <div className="w-32 h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 whitespace-nowrap">{progressPct}%</span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">({today.getMonth() + 1}/{dayOfMonth} 기준, {dayOfMonth}일/{daysInMonth}일 경과)</span>
                </div>
              );
            })()}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-700 text-sm font-bold tracking-wider whitespace-nowrap">
                  <th className="px-3 py-3 text-center">고객사</th>
                  <th className="px-3 py-3 text-center">품목코드</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap min-w-[200px]">품목명</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">수주잔량<span className="text-xs text-slate-400 font-medium ml-1">(만개)</span></th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">월자재CAPA<span className="text-xs text-slate-400 font-medium ml-1">(만개)</span></th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">월생산CAPA<span className="text-xs text-slate-400 font-medium ml-1">(만개)</span></th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">생산목표<span className="text-xs text-slate-400 font-medium ml-1">(만개)</span></th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">자재진도율</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">생산진도율</th>
                  <th className="px-2 py-3 w-[30px]"></th>
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
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                          {product.customer}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-base font-bold text-slate-900 font-mono">{product.code}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                          {product.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-base font-bold text-slate-900">
                        {product.backlog.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center text-base font-bold text-amber-700">
                        {product.materialCapa.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center text-base font-bold text-emerald-700">
                        {product.productionCapa === 0 ? '-' : product.productionCapa.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center text-base font-bold text-slate-900">
                        {product.productionTarget.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={product.materialProgress >= 20 ? '이상' : '미달'} />
                        <p className="text-sm text-slate-500 mt-1">{product.materialProgress}%</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={product.productionProgress >= 20 ? '이상' : '미달'} />
                        <p className="text-sm text-slate-500 mt-1">{product.productionProgress}%</p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ChevronRight className={cn(
                          "w-5 h-5 text-slate-300 transition-transform",
                          selectedProduct?.code === product.code && "rotate-90 text-indigo-500"
                        )} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {selectedProduct?.code === product.code && (
                        <tr>
                          <td colSpan={10} className="px-6 py-0">
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="py-6 border-t border-slate-100 space-y-4">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                                  <Calendar className="w-4 h-4 text-indigo-500" />
                                  일별 상세 현황 — 4월 (단위: 천개)
                                </h4>
                                <div>
                                  {/* 월간 달력 */}
                                  <div className="bg-slate-50 rounded-xl p-4 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2 mb-2">
                                      {saveStatus[product.code] === 'saved' && (
                                        <span className="text-xs text-emerald-600 font-medium">저장 완료!</span>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSave(product.code); }}
                                        disabled={!editingTargets[product.code] && !editingArrivals[product.code] && !editingAchievements[product.code]}
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                          (editingTargets[product.code] || editingArrivals[product.code] || editingAchievements[product.code])
                                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        )}
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        저장
                                      </button>
                                    </div>
                                    <table className="w-full text-sm border-collapse table-fixed">
                                      <colgroup>
                                        <col className="w-[60px]" />
                                        <col /><col /><col /><col /><col /><col /><col /><col /><col className="w-[56px]" /><col className="w-[56px]" />
                                      </colgroup>
                                      <tbody>
                                        {calendarWeeks.map((week, wi) => {
                                          return (
                                            <React.Fragment key={wi}>
                                              <tr className={cn(wi > 0 && "border-t-2 border-indigo-200")}>
                                                <td colSpan={11} className="pt-2 pb-1 text-xs font-bold text-indigo-700 uppercase tracking-wider">{week.label}</td>
                                              </tr>
                                              {(() => {
                                                const validIndices = week.cols.filter((idx): idx is number => idx !== null);
                                                const weekTargetSum = validIndices.reduce((sum, idx) => {
                                                  const editVal = editingTargets[product.code]?.[idx];
                                                  return sum + (editVal !== undefined ? editVal : (product.daily[idx]?.target ?? 0));
                                                }, 0);
                                                const weekArrivalSum = validIndices.reduce((sum, idx) => {
                                                  const editVal = editingArrivals[product.code]?.[idx];
                                                  return sum + (editVal !== undefined ? editVal : (product.daily[idx]?.arrival ?? 0));
                                                }, 0);
                                                const weekAchievementSum = validIndices.reduce((sum, idx) => {
                                                  const editVal = editingAchievements[product.code]?.[idx];
                                                  return sum + (editVal !== undefined ? editVal : (product.daily[idx]?.achievement ?? 0));
                                                }, 0);
                                                return (
                                                  <>
                                                    {/* 일자 행 */}
                                                    <tr className="text-slate-600">
                                                      <td className="pb-1 text-center font-bold">일자</td>
                                                      {week.cols.map((idx, ci) => (
                                                        <td key={ci} className={cn("pb-1 text-center font-bold", ci === 0 && "text-rose-600", ci === 6 && "text-blue-600")}>
                                                          {idx !== null ? product.daily[idx]?.date : ''}
                                                        </td>
                                                      ))}
                                                      <td className="pb-1 text-center font-bold text-indigo-700 bg-indigo-50/50">누계</td>
                                                      <td className="pb-1 text-center font-bold text-amber-700 bg-amber-50/50 text-[10px] leading-tight">자재<br/>진도율</td>
                                                      <td className="pb-1 text-center font-bold text-emerald-700 bg-emerald-50/50 text-[10px] leading-tight">생산<br/>진도율</td>
                                                    </tr>
                                                    <tr>
                                                      <td className="py-1 font-bold text-slate-700 text-center">생산목표</td>
                                                      {week.cols.map((idx, ci) => (
                                                        <td key={ci} className={cn("py-0.5 text-center", ci === 0 && "bg-rose-50/50", ci === 6 && "bg-blue-50/50")}>
                                                          {idx !== null ? (
                                                            <input
                                                              type="number"
                                                              min="0"
                                                              value={(() => { const v = editingTargets[product.code]?.[idx] !== undefined ? editingTargets[product.code][idx] : product.daily[idx]?.target ?? 0; return v === 0 ? '' : v; })()}
                                                              onClick={(e) => e.stopPropagation()}
                                                              onChange={(e) => handleTargetChange(product.code, idx, e.target.value)}
                                                              className="w-12 px-0.5 py-0.5 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
                                                            />
                                                          ) : ''}
                                                        </td>
                                                      ))}
                                                      <td className="py-1 text-center font-bold text-indigo-800 bg-indigo-50/50">{weekTargetSum || '-'}</td>
                                                      <td rowSpan={3} className="py-1 text-center font-bold text-amber-700 bg-amber-50/50 align-middle text-base">
                                                        {weekTargetSum > 0 ? Math.round((weekArrivalSum / weekTargetSum) * 100) : 0}%
                                                      </td>
                                                      <td rowSpan={3} className="py-1 text-center font-bold text-emerald-700 bg-emerald-50/50 align-middle text-base">
                                                        {weekTargetSum > 0 ? Math.round((weekAchievementSum / weekTargetSum) * 100) : 0}%
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="py-1 font-bold text-amber-700 text-center">자재입고</td>
                                                      {week.cols.map((idx, ci) => (
                                                        <td key={ci} className={cn("py-0.5 text-center", ci === 0 && "bg-rose-50/50", ci === 6 && "bg-blue-50/50")}>
                                                          {idx !== null ? (
                                                            <input
                                                              type="number"
                                                              min="0"
                                                              value={(() => { const v = editingArrivals[product.code]?.[idx] !== undefined ? editingArrivals[product.code][idx] : product.daily[idx]?.arrival ?? 0; return v === 0 ? '' : v; })()}
                                                              onClick={(e) => e.stopPropagation()}
                                                              onChange={(e) => handleArrivalChange(product.code, idx, e.target.value)}
                                                              className="w-12 px-0.5 py-0.5 text-center text-sm font-bold text-amber-700 bg-white border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                                                            />
                                                          ) : ''}
                                                        </td>
                                                      ))}
                                                      <td className="py-1 text-center font-bold text-amber-800 bg-indigo-50/50">{weekArrivalSum || '-'}</td>
                                                    </tr>
                                                    <tr>
                                                      <td className="py-1 font-bold text-emerald-700 text-center">생산실적</td>
                                                      {week.cols.map((idx, ci) => (
                                                        <td key={ci} className={cn("py-0.5 text-center", ci === 0 && "bg-rose-50/50", ci === 6 && "bg-blue-50/50")}>
                                                          {idx !== null ? (
                                                            <input
                                                              type="number"
                                                              min="0"
                                                              value={(() => { const v = editingAchievements[product.code]?.[idx] !== undefined ? editingAchievements[product.code][idx] : product.daily[idx]?.achievement ?? 0; return v === 0 ? '' : v; })()}
                                                              onClick={(e) => e.stopPropagation()}
                                                              onChange={(e) => handleAchievementChange(product.code, idx, e.target.value)}
                                                              className="w-12 px-0.5 py-0.5 text-center text-sm font-bold text-emerald-700 bg-white border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                                            />
                                                          ) : ''}
                                                        </td>
                                                      ))}
                                                      <td className="py-1 text-center font-bold text-emerald-800 bg-indigo-50/50">{weekAchievementSum || '-'}</td>
                                                    </tr>
                                                  </>
                                                );
                                              })()}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </table>
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

    </div>
  );
}
