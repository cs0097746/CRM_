import { Card } from 'react-bootstrap';

interface AtendimentoCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  urgent?: boolean;
}

const AtendimentoCard = ({ title, value, subValue, icon = "📊", variant = 'primary', urgent = false }: AtendimentoCardProps) => {
  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'primary': return '#316dbd';
      case 'success': return '#7ed957';
      case 'warning': return '#ffc107';
      case 'danger': return '#dc3545';
      case 'info': return '#8c52ff';
      default: return '#316dbd';
    }
  };

  const cardStyle = {
    border: urgent ? '2px solid #dc3545' : `1px solid ${getVariantColor(variant)}`,
    borderRadius: '15px',
    boxShadow: urgent 
      ? '0 4px 15px rgba(220, 53, 69, 0.3)' 
      : '0 4px 15px rgba(49, 109, 189, 0.1)',
    transition: 'all 0.3s ease',
    animation: urgent ? 'pulse 2s infinite' : 'none',
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
      
      <Card style={cardStyle} className="h-100">
        <Card.Body className="text-center p-3">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {icon}
          </div>
          <h3 style={{ 
            color: getVariantColor(variant), 
            fontWeight: 'bold', 
            margin: 0,
            fontSize: urgent ? '2rem' : '1.8rem'
          }}>
            {value}
          </h3>
          <p style={{ 
            color: '#6c757d', 
            fontSize: '0.9rem', 
            margin: '0.25rem 0',
            fontWeight: 500 
          }}>
            {title}
          </p>
          {subValue && (
            <small style={{ color: getVariantColor(variant), fontWeight: 600 }}>
              {subValue}
            </small>
          )}
          {urgent && (
            <div className="mt-2">
              <span className="badge bg-danger">Ação Necessária!</span>
            </div>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default AtendimentoCard;