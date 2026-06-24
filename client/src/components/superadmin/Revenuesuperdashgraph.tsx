import './revenuesuperdash.css';
import { revenueData } from '../../data/revenuedata';
import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from 'recharts';

// Type definitions
interface RevenueItem {
  month: string;
  amount: number;
}

function Revenuesuperdashgraph() {
  const [selectedYear, setSelectedYear] = useState<number>(revenueData.selectedYear);

  // Get available years from data and sort
  const availableYears: number[] = Object.keys(revenueData.data).map(Number).sort();

  // Get data for selected year
  const currentData: RevenueItem[] = revenueData.data[selectedYear] || [];

  // Handle year change from dropdown
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const year = Number(e.target.value);
    setSelectedYear(year);
  };

  // Tooltip formatter
  const tooltipFormatter = (value: number | string | readonly (string | number)[] | undefined): [string, string] => {
    if (typeof value === 'number') {
      return [`KSh ${value.toLocaleString()}`, 'Revenue'];
    }
    return ['KSh 0', 'Revenue'];
  };

  // YAxis tick formatter
  const yAxisTickFormatter = (value: number): string => {
    return `KSh ${(value / 1000)}k`;
  };

  const hasData = currentData.length > 0;

  return (
    <div className="overall-revenue-super-dash-component">
      <div className="revenue-header">
        <h3>Revenue Overview</h3>
        <div className="year-selector-wrapper">
          <select
            className="year-dropdown"
            value={selectedYear}
            onChange={handleYearChange}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={currentData}>
            {/* Horizontal grid lines only */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(0, 229, 255, 0.08)"
            />

            <XAxis
              dataKey="month"
              stroke="rgba(150, 220, 240, 0.4)"
              tick={{ fill: 'rgba(150, 220, 240, 0.6)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(0, 229, 255, 0.15)' }}
              tickLine={{ stroke: 'rgba(0, 229, 255, 0.15)' }}
            />

            <YAxis
              stroke="rgba(150, 220, 240, 0.4)"
              tick={{ fill: 'rgba(150, 220, 240, 0.6)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(0, 229, 255, 0.15)' }}
              tickLine={{ stroke: 'rgba(0, 229, 255, 0.15)' }}
              tickFormatter={yAxisTickFormatter}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(2, 20, 24, 0.95)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '0.8rem',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 229, 255, 0.05)',
              }}
              labelStyle={{
                color: '#d6f0f5',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
              itemStyle={{
                color: '#b6f9ff',
                fontSize: '0.85rem',
              }}
              formatter={tooltipFormatter}
              cursor={{
                stroke: 'rgba(0, 229, 255, 0.2)',
                strokeWidth: 2,
              }}
            />

            {/* Gradient Area under the line - More prominent like the reference */}
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.4} />
                <stop offset="40%" stopColor="#0099ff" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity={0.05} />
              </linearGradient>
              {/* Additional gradient for filled area emphasis */}
              <linearGradient id="revenueGradientGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Enhanced Area under the line with glow */}
            <Area
              type="monotone"
              dataKey="amount"
              stroke="none"
              fill="url(#revenueGradient)"
            />
            {/* Secondary glow layer for extra depth */}
            <Area
              type="monotone"
              dataKey="amount"
              stroke="none"
              fill="url(#revenueGradientGlow)"
              fillOpacity={0.5}
            />

            {/* Main line with futuristic glow */}
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#00e5ff"
              strokeWidth={3}
              dot={{
                fill: '#00e5ff',
                stroke: '#00e5ff',
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                fill: '#00e5ff',
                stroke: '#d6f0f5',
                strokeWidth: 3,
                r: 6,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="no-data-message">
          <p>No revenue data available for {selectedYear}</p>
        </div>
      )}
    </div>
  );
}

export default Revenuesuperdashgraph;