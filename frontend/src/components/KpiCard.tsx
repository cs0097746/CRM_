import { Card, Spinner } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardData } from '../types/Dashboard';

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  chartData?: DashboardData['fontes_lead'];
}

const COLORS = ['#316dbd', '#8c52ff', '#7ed957', '#ffc658', '#ff8042'];

const KpiCard = ({ title, value, subValue, chartData }: KpiCardProps) => {
  return (
    <Card 
      className="h-100 border-0"
      style={{
        borderRadius: "1.5rem",
        backgroundColor: "#ffffff",
        boxShadow: "0 12px 25px rgba(0,0,0,0.08)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <Card.Body className="d-flex flex-column p-4">
        <Card.Title 
          style={{ 
            color: '#8c52ff', 
            fontWeight: 600, 
            fontSize: '1rem',
            marginBottom: 'auto'
          }}
        >
          {title}
        </Card.Title>

        {chartData ? (
          <div style={{ width: '100%', height: '120px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={50}
                  fill="#8884d8"
                  dataKey="valor"
                  nameKey="nome"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `${val}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-2">
            <h2 
              className="display-6"
              style={{
                color: '#316dbd',
                fontWeight: 800,
              }}
            >
              {value === null ? <Spinner animation="border" size="sm" /> : value}
            </h2>
            {subValue && (
              <p 
                className="mb-0"
                style={{
                  color: '#7ed957',
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }}
              >
                {subValue}
              </p>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default KpiCard;

