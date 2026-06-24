import './revenuebygender.css';
import { revenueByGender } from '../../data/revenuebygenderdata';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';

function Revenuebygender() {
  const tooltipFormatter = (
    value: number | string | readonly (string | number)[] | undefined
  ): [string, string] => {
    if (typeof value === 'number') {
      return [`KSh ${value.toLocaleString()}`, 'Revenue'];
    }
    return ['KSh 0', 'Revenue'];
  };

  // Custom label for bars
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 10}
        y={y + 15}
        fill="#b6f9ff"
        fontSize={14}
        fontWeight={600}
        textAnchor="start"
      >
        {`KSh ${(value / 1000000).toFixed(1)}M`}
      </text>
    );
  };

  return (
    <div className="overall-revenue-by-gender">
      <div className="gender-header">
        <h3>Revenue By Gender</h3>
        <div className="gender-total">
          Total: KSh {(revenueByGender.reduce((sum, item) => sum + item.revenue, 0) / 1000000).toFixed(1)}M
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={revenueByGender}
          layout="vertical"
          margin={{
            top: 20,
            right: 120,
            left: 60,
            bottom: 20,
          }}
          barSize={50}
        >
          <defs>
            <linearGradient id="maleGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#0099FF" />
            </linearGradient>

            <linearGradient id="femaleGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FF4081" />
              <stop offset="100%" stopColor="#FF80AB" />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            vertical={true}
            stroke="rgba(0,229,255,0.06)"
          />

          <XAxis
            type="number"
            tick={{
              fill: 'rgba(214,240,245,.7)',
              fontSize: 12,
            }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            axisLine={{
              stroke: 'rgba(0,229,255,.15)',
            }}
            tickLine={{
              stroke: 'rgba(0,229,255,.15)',
            }}
          />

          <YAxis
            type="category"
            dataKey="gender"
            tick={{
              fill: 'rgba(214,240,245,.8)',
              fontSize: 14,
              fontWeight: 600,
            }}
            axisLine={{
              stroke: 'rgba(0,229,255,.15)',
            }}
            tickLine={{
              stroke: 'rgba(0,229,255,.15)',
            }}
          />

          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={{
              background: 'rgba(2,20,24,.95)',
              border: '1px solid rgba(0,229,255,.2)',
              borderRadius: '1rem',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            }}
            labelStyle={{
              color: '#d6f0f5',
              fontWeight: 600,
              fontSize: '1rem',
            }}
            itemStyle={{
              color: '#b6f9ff',
              fontSize: '0.9rem',
            }}
            cursor={{
              fill: 'rgba(0,229,255,0.03)',
            }}
          />

          <Legend
            verticalAlign="top"
            align="center"
            iconType="circle"
            iconSize={12}
            wrapperStyle={{
              color: '#d6f0f5',
              fontSize: '0.9rem',
              fontWeight: 500,
              paddingBottom: '0.5rem',
            }}
            formatter={(value) => (
              <span style={{ color: '#d6f0f5' }}>{value}</span>
            )}
          />

          <Bar
            dataKey="revenue"
            radius={[0, 12, 12, 0]}
            barSize={50}
            label={renderCustomLabel}
          >
            {revenueByGender.map((entry) => (
              <Cell
                key={entry.gender}
                fill={
                  entry.gender === 'Male'
                    ? 'url(#maleGradient)'
                    : 'url(#femaleGradient)'
                }
                stroke="rgba(2,20,24,0.5)"
                strokeWidth={2}
              />
            ))}
          </Bar>
        </BarChart>
        
      </ResponsiveContainer>
    </div>
  );
}

export default Revenuebygender;