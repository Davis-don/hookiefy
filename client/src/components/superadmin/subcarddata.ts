import {
  FiUsers,
  FiUserCheck,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";

export const statData = [
  {
    icon: FiUserCheck,
    title: "Admins",
    value: 12,
    percentage: 8.5,
    trendIcon: FiTrendingUp,
    color:"orangered",
    trendcolor:"green"
  },
  {
    icon: FiUsers,
    title: "Clients",
    value: 245,
    percentage: 15.2,
    trendIcon: FiTrendingUp,
    color:"rgba(0, 229, 255, 0.4)",
    trendcolor:"orange"
  },
  {
    icon: FiDollarSign,
    title: "Revenu (ksh)",
    value: 125000,
    percentage: -3.8,
    trendIcon: FiTrendingDown,
    color:"rgba(0, 153, 255, 0.5)",
    trendcolor:"red"
  },
];