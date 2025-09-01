import React from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  username?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, username = 'Cliente' }) => {
  if (!isTyping) return null;

  return (
    <>
      <div className="d-flex justify-content-start mb-2">
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '0.5rem 1rem',
          borderRadius: '18px 18px 18px 4px',
          border: '1px solid #e9ecef'
        }}>
          <small className="text-muted me-2">{username} está digitando</small>
          <div className="typing-dots d-inline-block">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
      
      <style>
        {`
          .typing-dots span {
            display: inline-block;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: #6c757d;
            margin: 0 1px;
            animation: typing 1.4s infinite ease-in-out;
          }
          
          .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
          .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
          
          @keyframes typing {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </>
  );
};

export default TypingIndicator;