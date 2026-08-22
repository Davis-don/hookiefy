import {
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";

export const financeStatData = [
  {
    icon: FiUsers,
    title: "Clients",
    value: 1842,
    percentage: 12.4,
    trendIcon: FiTrendingUp,
    color: "rgba(0, 229, 255, 0.4)",
    trendcolor: "green",
  },
  {
    icon: FiDollarSign,
    title: "Revenue (Ksh)",
    value: 3845000,
    percentage: -4.2,
    trendIcon: FiTrendingDown,
    color: "rgba(0, 153, 255, 0.5)",
    trendcolor: "red",
  },
];