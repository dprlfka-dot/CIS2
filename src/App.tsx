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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
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
  const [editingArrivals, setEditingArrivals] = useState<Record<string, number[]>>({});
  const [editingAchievements, setEditingAchievements] = useState<Record<string, number[]>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving'>>({});

  // 2026년 4월: 수요일 시작. 월~일 7열 고정, 주차별 행 구분
  // 각 주차: [월,화,수,목,금,토,일] 에 해당하는 daily index (null = 빈 칸)
  const calendarWeeks = [
    { label: '1주차', cols: [null, null, 0, 1, 2, 3, 4] },       // 4/1(수)~4/5(일)
    { label: '2주차', cols: [5, 6, 7, 8, 9, 10, 11] },           // 4/6(월)~4/12(일)
    { label: '3주차', cols: [12, 13, 14, 15, 16, 17, 18] },      // 4/13(월)~4/19(일)
    { label: '4주차', cols: [19, 20, 21, 22, 23, 24, 25] },      // 4/20(월)~4/26(일)
    { label: '5주차', cols: [26, 27, 28, 29, null, null, null] }, // 4/27(월)~4/30(목)
  ];
  const dayHeaders = ['월', '화', '수', '목', '금', '토', '일'];

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
    const avgMaterialProgress = Math.round(products.reduce((acc, p) => acc + p.materialProgress, 0) / products.length);
    const avgProductionProgress = Math.round(products.reduce((acc, p) => acc + p.productionProgress, 0) / products.length);

    return { totalBacklog, totalTarget, avgMaterialProgress, avgProductionProgress };
  }, [products]);

  const handleArrivalChange = useCallback((productCode: string, dayIndex: number, value: string) => {
    const num = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(num)) return;
    setEditingArrivals(prev => {
      const current = prev[productCode] || products.find(p => p.code === productCode)!.daily.map(d => d.arrival);
      const updated = [...current];
      updated[dayIndex] = num;
      return { ...prev, [productCode]: updated };
    });
  }, [products]);

  const handleAchievementChange = useCallback((productCode: string, dayIndex: number, value: string) => {
    const num = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(num)) return;
    setEditingAchievements(prev => {
      const current = prev[productCode] || products.find(p => p.code === productCode)!.daily.map(d => d.achievement);
      const updated = [...current];
      updated[dayIndex] = num;
      return { ...prev, [productCode]: updated };
    });
  }, [products]);

  const handleSave = useCallback((productCode: string) => {
    const arrivals = editingArrivals[productCode];
    const achievements = editingAchievements[productCode];
    if (!arrivals && !achievements) return;

    setSaveStatus(prev => ({ ...prev, [productCode]: 'saving' }));

    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.code !== productCode) return p;
        const newDaily = p.daily.map((d, i) => ({
          ...d,
          ...(arrivals ? { arrival: arrivals[i] } : {}),
          ...(achievements ? { achievement: achievements[i] } : {}),
        }));
        return { ...p, daily: newDaily };
      });
      localStorage.setItem('scm_products', JSON.stringify(updated));
      return updated;
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
  }, [editingArrivals, editingAchievements]);

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
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{DASHBOARD_DATA.title}</h1>
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
                          <td colSpan={7} className="px-6 py-0">
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="py-6 border-t border-slate-100 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    일별 상세 현황 — 4월 (단위: 천개)
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {saveStatus[product.code] === 'saved' && (
                                      <span className="text-xs text-emerald-600 font-medium">저장 완료!</span>
                                    )}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSave(product.code); }}
                                      disabled={!editingArrivals[product.code] && !editingAchievements[product.code]}
                                      className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                        (editingArrivals[product.code] || editingAchievements[product.code])
                                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                      )}
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                      저장
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* 월간 달력 */}
                                  <div className="bg-slate-50 rounded-xl p-4 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                                    <table className="w-full text-xs border-collapse">
                                      <thead>
                                        <tr className="text-slate-400">
                                          <th className="pb-2 text-left pr-2 w-[48px]">구분</th>
                                          {dayHeaders.map(d => (
                                            <th key={d} className={cn("pb-2 text-center", (d === '토' || d === '일') && "text-rose-400")}>{d}</th>
                                          ))}
                                          <th className="pb-2 text-center text-indigo-500 w-[44px]">누계</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {calendarWeeks.map((week, wi) => {
                                          const validIndices = week.cols.filter((idx): idx is number => idx !== null);
                                          const weekTargetSum = validIndices.reduce((sum, idx) => sum + (product.daily[idx]?.target ?? 0), 0);
                                          const weekArrivalSum = validIndices.reduce((sum, idx) => sum + (editingArrivals[product.code]?.[idx] !== undefined ? editingArrivals[product.code][idx] : product.daily[idx]?.arrival ?? 0), 0);
                                          const weekAchievementSum = validIndices.reduce((sum, idx) => sum + (editingAchievements[product.code]?.[idx] !== undefined ? editingAchievements[product.code][idx] : product.daily[idx]?.achievement ?? 0), 0);
                                          return (
                                            <React.Fragment key={wi}>
                                              <tr className={cn(wi > 0 && "border-t-2 border-indigo-100")}>
                                                <td className="pt-2 pb-1 text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{week.label}</td>
                                                {week.cols.map((idx, ci) => (
                                                  <td key={ci} className={cn("pt-2 pb-1 text-center text-[10px] font-medium text-slate-400", (ci >= 5) && "text-rose-400")}>
                                                    {idx !== null ? (idx + 1) : ''}
                                                  </td>
                                                ))}
                                                <td className="pt-2 pb-1"></td>
                                              </tr>
                                              <tr>
                                                <td className="py-1 font-medium text-slate-500 pr-2">목표</td>
                                                {week.cols.map((idx, ci) => (
                                                  <td key={ci} className={cn("py-1 text-center font-bold text-slate-700", (ci >= 5) && "bg-slate-100/50")}>
                                                    {idx !== null ? (product.daily[idx]?.target || '-') : ''}
                                                  </td>
                                                ))}
                                                <td className="py-1 text-center font-bold text-indigo-600 bg-indigo-50/50">{weekTargetSum}</td>
                                              </tr>
                                              <tr>
                                                <td className="py-1 font-medium text-amber-600 pr-2">입고</td>
                                                {week.cols.map((idx, ci) => (
                                                  <td key={ci} className={cn("py-0.5 text-center", (ci >= 5) && "bg-slate-100/50")}>
                                                    {idx !== null ? (
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={editingArrivals[product.code]?.[idx] !== undefined ? editingArrivals[product.code][idx] : product.daily[idx]?.arrival ?? 0}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => handleArrivalChange(product.code, idx, e.target.value)}
                                                        className="w-10 px-0.5 py-0.5 text-center text-xs font-bold text-amber-600 bg-white border border-amber-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                                                      />
                                                    ) : ''}
                                                  </td>
                                                ))}
                                                <td className="py-0.5 text-center font-bold text-amber-600 bg-indigo-50/50">{weekArrivalSum}</td>
                                              </tr>
                                              <tr>
                                                <td className="py-1 font-medium text-emerald-600 pr-2">실적</td>
                                                {week.cols.map((idx, ci) => (
                                                  <td key={ci} className={cn("py-0.5 text-center", (ci >= 5) && "bg-slate-100/50")}>
                                                    {idx !== null ? (
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={editingAchievements[product.code]?.[idx] !== undefined ? editingAchievements[product.code][idx] : product.daily[idx]?.achievement ?? 0}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => handleAchievementChange(product.code, idx, e.target.value)}
                                                        className="w-10 px-0.5 py-0.5 text-center text-xs font-bold text-emerald-600 bg-white border border-emerald-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                                                      />
                                                    ) : ''}
                                                  </td>
                                                ))}
                                                <td className="py-0.5 text-center font-bold text-emerald-600 bg-indigo-50/50">{weekAchievementSum}</td>
                                              </tr>
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* 품목별 요약 */}
                                  <div className="space-y-4">
                                    {/* 진도율 요약 카드 */}
                                    <div className="bg-slate-50 rounded-xl p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">진도율 요약</h5>
                                        <StatusBadge status={product.status} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                                          <p className="text-[10px] font-medium text-slate-400">수주잔량</p>
                                          <p className="text-lg font-bold text-slate-900">{product.backlog.toLocaleString()}<span className="text-xs text-slate-400 ml-1">만개</span></p>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                                          <p className="text-[10px] font-medium text-slate-400">생산목표</p>
                                          <p className="text-lg font-bold text-slate-900">{product.productionTarget.toLocaleString()}<span className="text-xs text-slate-400 ml-1">만개</span></p>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-amber-200">
                                          <p className="text-[10px] font-medium text-amber-500">자재 진도율</p>
                                          <p className="text-lg font-bold text-amber-600">{product.materialProgress}%</p>
                                          <div className="w-full h-1.5 bg-amber-100 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${product.materialProgress}%` }} />
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                          <p className="text-[10px] font-medium text-emerald-500">생산 진도율</p>
                                          <p className="text-lg font-bold text-emerald-600">{product.productionProgress}%</p>
                                          <div className="w-full h-1.5 bg-emerald-100 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${product.productionProgress}%` }} />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* 일별 실적 차트 */}
                                    <div className="bg-slate-50 rounded-xl p-4">
                                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">일별 목표 vs 실적</h5>
                                      <div className="h-[180px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <BarChart data={product.daily.filter(d => d.target > 0 || d.arrival > 0 || d.achievement > 0)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={40} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                                            <Bar dataKey="target" name="목표" fill="#6366f1" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="arrival" name="입고" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="achievement" name="실적" fill="#10b981" radius={[3, 3, 0, 0]} />
                                          </BarChart>
                                        </ResponsiveContainer>
                                      </div>
                                    </div>
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
