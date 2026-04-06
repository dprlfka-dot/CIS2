export interface DailyData {
  date: string;
  target: number;
  arrival: number;
  achievement: number;
}

export interface ProductData {
  customer: string;
  code: string;
  name: string;
  backlog: number;
  materialCapa: number;
  productionCapa: number;
  productionTarget: number;
  daily: DailyData[];
  weeklyTotal: number;
  materialProgress: number;
  productionProgress: number;
  status: '이상' | '미달';
}

export interface DashboardData {
  title: string;
  baseDate: string;
  products: ProductData[];
}
