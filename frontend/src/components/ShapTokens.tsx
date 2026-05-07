import React from 'react';

import { parseShapInterpretations } from '../utils/shap';

interface ShapTokensProps {
  raw?: string;
  maxTokens?: number;
  emptyText?: string;
}

const ShapTokens: React.FC<ShapTokensProps> = ({ raw, maxTokens = 6, emptyText = 'No XAI data' }) => {
  const tokens = parseShapInterpretations(raw, maxTokens);

  if (!tokens.length) {
    return <span className="text-muted">{emptyText}</span>;
  }

  return (
    <div className="d-flex flex-wrap gap-1">
      {tokens.map((item) => {
        const sign = item.value >= 0 ? '+' : '';
        const badgeClass = item.value >= 0 ? 'bg-success' : 'bg-danger';
        return (
          <span key={item.token} className={`badge ${badgeClass}`} style={{ fontSize: '0.75rem' }}>
            {item.token} {sign}{item.value.toFixed(2)}
          </span>
        );
      })}
    </div>
  );
};

export default ShapTokens;

