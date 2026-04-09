import { DashboardData, DailyData } from "./types";

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const generateMonthlyDaily = (baseDays: DailyData[], weekdayTarget: number): DailyData[] => {
  const days: DailyData[] = [];
  for (let d = 1; d <= 30; d++) {
    const date = new Date(2026, 3, d);
    const dayOfWeek = DAY_NAMES[date.getDay()];
    const dateLabel = `4/${d}(${dayOfWeek})`;
    const existing = baseDays.find(b => b.date === `4/${d}`);
    const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
    const target = isWeekday ? weekdayTarget : 0;
    if (existing) {
      days.push({ ...existing, date: dateLabel, target });
    } else {
      days.push({ date: dateLabel, target, arrival: 0, achievement: 0 });
    }
  }
  return days;
};

export const DASHBOARD_DATA: DashboardData = {
  title: "26.04월 대량발주품목 진도율 관리",
  baseDate: "2026.04.06",
  products: [
    {
      customer: "APS",
      code: "9APS0014610",
      name: "메디큐브 PDRN핑크콜라겐겔마스크",
      buyer: "",
      cisManager: "",
      backlog: 2700,
      materialCapa: 1100,
      productionCapa: 1100,
      productionTarget: 1100,
      weeklyTotal: 1100,
      materialProgress: 18,
      productionProgress: 18,
      status: "이상",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 2000, achievement: 0 },
        { date: "4/2", target: 0, arrival: 0, achievement: 0 },
        { date: "4/3", target: 0, arrival: 0, achievement: 2000 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 500)
    },
    {
      customer: "APS",
      code: "9APS0015817",
      name: "메디큐브하이포클로로스애씨드필샷80ML",
      buyer: "",
      cisManager: "",
      backlog: 112,
      materialCapa: 64,
      productionCapa: 0,
      productionTarget: 64,
      weeklyTotal: 64,
      materialProgress: 50,
      productionProgress: 16,
      status: "이상",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 280, achievement: 0 },
        { date: "4/2", target: 0, arrival: 40, achievement: 0 },
        { date: "4/3", target: 0, arrival: 0, achievement: 100 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 30)
    },
    {
      customer: "APS",
      code: "9APS0016013",
      name: "메디큐브하이포클로로스애씨드바디필샷280ML",
      buyer: "",
      cisManager: "",
      backlog: 138,
      materialCapa: 97,
      productionCapa: 0,
      productionTarget: 97,
      weeklyTotal: 97,
      materialProgress: 52,
      productionProgress: 4,
      status: "미달",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 500, achievement: 0 },
        { date: "4/2", target: 0, arrival: 0, achievement: 0 },
        { date: "4/3", target: 0, arrival: 0, achievement: 40 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 40)
    },
    {
      customer: "APS",
      code: "9APS0010517",
      name: "메디큐브콜라겐나이트랩핑마스크75ML",
      buyer: "",
      cisManager: "",
      backlog: 620,
      materialCapa: 70,
      productionCapa: 0,
      productionTarget: 70,
      weeklyTotal: 70,
      materialProgress: 24,
      productionProgress: 2,
      status: "미달",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 0, achievement: 0 },
        { date: "4/2", target: 0, arrival: 0, achievement: 0 },
        { date: "4/3", target: 0, arrival: 170, achievement: 20 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 30)
    },
    {
      customer: "APS",
      code: "9APS0013213",
      name: "메디큐브제로모공블랙헤드머드팩100G",
      buyer: "",
      cisManager: "",
      backlog: 97,
      materialCapa: 30,
      productionCapa: 0,
      productionTarget: 30,
      weeklyTotal: 30,
      materialProgress: 18,
      productionProgress: 0,
      status: "미달",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 50, achievement: 0 },
        { date: "4/2", target: 0, arrival: 0, achievement: 0 },
        { date: "4/3", target: 0, arrival: 0, achievement: 0 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 10)
    },
    {
      customer: "DPD",
      code: "9DPD0010311",
      name: "레드니스수딩세럼, 인텐스세럼",
      buyer: "",
      cisManager: "",
      backlog: 160,
      materialCapa: 160,
      productionCapa: 0,
      productionTarget: 160,
      weeklyTotal: 160,
      materialProgress: 18,
      productionProgress: 0,
      status: "미달",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 280, achievement: 0 },
        { date: "4/2", target: 0, arrival: 0, achievement: 0 },
        { date: "4/3", target: 0, arrival: 0, achievement: 0 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 70)
    },
    {
      customer: "DPD",
      code: "9DPD0025810",
      name: "트라넥세럼",
      buyer: "",
      cisManager: "",
      backlog: 79,
      materialCapa: 60,
      productionCapa: 0,
      productionTarget: 60,
      weeklyTotal: 60,
      materialProgress: 10,
      productionProgress: 10,
      status: "이상",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 0, achievement: 10 },
        { date: "4/2", target: 0, arrival: 0, achievement: 50 },
        { date: "4/3", target: 0, arrival: 60, achievement: 0 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 30)
    },
    {
      customer: "DPD",
      code: "9DPD0021710",
      name: "캡슐미스트 100ml",
      buyer: "",
      cisManager: "",
      backlog: 98,
      materialCapa: 60,
      productionCapa: 0,
      productionTarget: 60,
      weeklyTotal: 60,
      materialProgress: 12,
      productionProgress: 8,
      status: "미달",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 0, achievement: 10 },
        { date: "4/2", target: 0, arrival: 70, achievement: 20 },
        { date: "4/3", target: 0, arrival: 0, achievement: 20 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 30)
    },
    {
      customer: "DPD",
      code: "9DPD0015010",
      name: "피디알앤수분크림",
      buyer: "",
      cisManager: "",
      backlog: 155,
      materialCapa: 60,
      productionCapa: 0,
      productionTarget: 60,
      weeklyTotal: 60,
      materialProgress: 13,
      productionProgress: 5,
      status: "미달",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 20, achievement: 0 },
        { date: "4/2", target: 0, arrival: 30, achievement: 20 },
        { date: "4/3", target: 0, arrival: 30, achievement: 10 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 30)
    },
    {
      customer: "IWD",
      code: "9IWD0063510",
      name: "롬앤 베러댄팔레트 9홋수",
      buyer: "",
      cisManager: "",
      backlog: 65,
      materialCapa: 28,
      productionCapa: 0,
      productionTarget: 28,
      weeklyTotal: 28,
      materialProgress: 8,
      productionProgress: 34,
      status: "이상",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 10, achievement: 70 },
        { date: "4/2", target: 0, arrival: 0, achievement: 0 },
        { date: "4/3", target: 0, arrival: 20, achievement: 20 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 10)
    },
    {
      customer: "OLV",
      code: "9OLV1035810",
      name: "바이오힐보판테셀리페어시카크림미스트120ML",
      buyer: "",
      cisManager: "",
      backlog: 55,
      materialCapa: 25,
      productionCapa: 35,
      productionTarget: 25,
      weeklyTotal: 25,
      materialProgress: 11,
      productionProgress: 23,
      status: "이상",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 30, achievement: 0 },
        { date: "4/2", target: 0, arrival: 0, achievement: 30 },
        { date: "4/3", target: 0, arrival: 0, achievement: 30 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 10)
    },
    {
      customer: "SNT",
      code: "9SNT0012710",
      name: "파우더포룸올데이타이트메이크업세팅픽서75ML 외 6종",
      buyer: "",
      cisManager: "",
      backlog: 350,
      materialCapa: 80,
      productionCapa: 80,
      productionTarget: 80,
      weeklyTotal: 80,
      materialProgress: 0,
      productionProgress: 13,
      status: "이상",
      daily: generateMonthlyDaily([
        { date: "4/1", target: 0, arrival: 0, achievement: 40 },
        { date: "4/2", target: 0, arrival: 0, achievement: 40 },
        { date: "4/3", target: 0, arrival: 0, achievement: 40 },
        { date: "4/4", target: 0, arrival: 0, achievement: 0 },
        { date: "4/5", target: 0, arrival: 0, achievement: 0 },
        { date: "4/6", target: 0, arrival: 0, achievement: 0 },
      ], 40)
    }
  ]
};
