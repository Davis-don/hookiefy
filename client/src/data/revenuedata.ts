export interface RevenueItem {
  month: string;
  amount: number;
}

export interface RevenueData {
  selectedYear: number;
  data: Record<number, RevenueItem[]>;
}

export const revenueData: RevenueData = {
  selectedYear: 2026,
  data: {
    2024: [
      { month: 'Jan', amount: 85000 },
      { month: 'Feb', amount: 92000 },
      { month: 'Mar', amount: 101000 },
      { month: 'Apr', amount: 98000 },
      { month: 'May', amount: 112000 },
      { month: 'Jun', amount: 125000 },
      { month: 'Jul', amount: 134000 },
      { month: 'Aug', amount: 142000 },
      { month: 'Sep', amount: 138000 },
      { month: 'Oct', amount: 155000 },
      { month: 'Nov', amount: 168000 },
      { month: 'Dec', amount: 185000 },
    ],
    2025: [
      { month: 'Jan', amount: 105000 },
      { month: 'Feb', amount: 118000 },
      { month: 'Mar', amount: 132000 },
      { month: 'Apr', amount: 128000 },
      { month: 'May', amount: 145000 },
      { month: 'Jun', amount: 158000 },
      { month: 'Jul', amount: 167000 },
      { month: 'Aug', amount: 179000 },
      { month: 'Sep', amount: 172000 },
      { month: 'Oct', amount: 192000 },
      { month: 'Nov', amount: 208000 },
      { month: 'Dec', amount: 228000 },
    ],
    2026: [
      { month: 'Jan', amount: 125000 },
      { month: 'Feb', amount: 142000 },
      { month: 'Mar', amount: 158000 },
      { month: 'Apr', amount: 151000 },
      { month: 'May', amount: 173000 },
      { month: 'Jun', amount: 185000 },
      { month: 'Jul', amount: 194000 },
      { month: 'Aug', amount: 208000 },
      { month: 'Sep', amount: 201000 },
      { month: 'Oct', amount: 225000 },
      { month: 'Nov', amount: 241000 },
      { month: 'Dec', amount: 265000 },
    ],
  },
};