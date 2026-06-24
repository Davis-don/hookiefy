import './adminrevenuevalue.css';
import { adminRevenue } from '../../data/adminrevenuegeneration';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

// Colors for the pie chart (futuristic theme)
const COLORS = [
  '#00e5ff', // Cyan
  '#7b2ffc', // Purple
  '#0099ff', // Blue
  '#ff2d95', // Pink
  '#00e676', // Green
];

// Custom tooltip component
const AdminTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const admin = adminRevenue.find((item) => item.name === data.fullName);
    
    if (!admin) return null;

    const { metadata } = admin;
    
    return (
      <div className="admin-tooltip-container">
        <div className="admin-tooltip-header">
          <h4>{metadata.first_name} {metadata.last_name}</h4>
          <span className="admin-tooltip-role">{metadata.role}</span>
        </div>
        
        <div className="admin-tooltip-body">
          <div className="admin-tooltip-row">
            <span className="admin-tooltip-label">📧 Email:</span>
            <span className="admin-tooltip-value">{metadata.email}</span>
          </div>
          <div className="admin-tooltip-row">
            <span className="admin-tooltip-label">📱 Phone:</span>
            <span className="admin-tooltip-value">{metadata.phone_number}</span>
          </div>
          <div className="admin-tooltip-row">
            <span className="admin-tooltip-label">👤 Gender:</span>
            <span className="admin-tooltip-value">{metadata.gender === 'M' ? 'Male' : 'Female'}</span>
          </div>
          <div className="admin-tooltip-row">
            <span className="admin-tooltip-label">👥 Total Clients:</span>
            <span className="admin-tooltip-value">{metadata.total_clients}</span>
          </div>
          <div className="admin-tooltip-row">
            <span className="admin-tooltip-label">📦 Total Orders:</span>
            <span className="admin-tooltip-value">{metadata.total_orders}</span>
          </div>
          <div className="admin-tooltip-row admin-tooltip-highlight-row">
            <span className="admin-tooltip-label">💰 Revenue:</span>
            <span className="admin-tooltip-value highlight">KSh {data.revenue.toLocaleString()}</span>
          </div>
          <div className="admin-tooltip-row">
            <span className="admin-tooltip-label">📅 Joined:</span>
            <span className="admin-tooltip-value">{new Date(metadata.joined_at).toLocaleDateString()}</span>
          </div>
          <div className="admin-tooltip-row">
            <span className="admin-tooltip-label">🟢 Last Active:</span>
            <span className="admin-tooltip-value">{new Date(metadata.last_active).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom legend
const AdminLegend = ({ payload }: any) => {
  return (
    <div className="admin-custom-legend">
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="admin-legend-item">
          <div 
            className="admin-legend-color" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="admin-legend-name">{entry.value}</span>
          <span className="admin-legend-value">
            KSh {adminRevenue[index]?.revenue.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

function Adminsrevenuevalue() {
  const chartData = adminRevenue.map((admin) => ({
    name: admin.name.split(' ')[0], // First name only
    fullName: admin.name,
    revenue: admin.revenue,
  }));

  // Custom label renderer that handles long names
  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const { name, percent } = props;
    if (typeof name === 'string' && typeof percent === 'number') {
      // Truncate long names to prevent hiding
      const displayName = name.length > 8 ? name.substring(0, 7) + '…' : name;
      return `${displayName} ${(percent * 100).toFixed(0)}%`;
    }
    return name;
  };

  return (
    <div className="admin-revenue-chart-container">
      <div className="admin-chart-header">
        <h3>Admin Revenue Distribution</h3>
        <span className="admin-chart-total">
          Total: KSh {adminRevenue.reduce((sum, admin) => sum + admin.revenue, 0).toLocaleString()}
        </span>
      </div>

      <div className="admin-chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="revenue"
              nameKey="name"
              labelLine={false}
              label={renderCustomLabel}
            >
              {chartData.map((_entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke="rgba(2, 20, 24, 0.5)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            
            <Tooltip
              content={<AdminTooltip />}
              cursor={{ stroke: 'rgba(0, 229, 255, 0.2)', strokeWidth: 2 }}
            />
            
            <Legend 
              content={<AdminLegend />}
              verticalAlign="bottom"
              align="center"
              layout="horizontal"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Adminsrevenuevalue;