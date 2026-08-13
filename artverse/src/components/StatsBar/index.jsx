import React, { useState, useEffect } from 'react';
import { fetchStats } from '../../api';
import {
  StatsSection,
  StatsHeadingRow,
  StatsEyebrow,
  StatsTitle,
  StatsInner,
  StatItem,
  StatValue,
  StatLabel,
} from './styledComponents';

const formatNumber = (n) => {
  if (!n && n !== 0) return { value: '—', suffix: '' };
  if (n >= 1_000_000) return { value: (n / 1_000_000).toFixed(1), suffix: 'M' };
  if (n >= 1_000) {
    const k = n / 1_000;
    return { value: Number.isInteger(k) ? k.toString() : k.toFixed(1), suffix: 'K' };
  }
  return { value: n.toString(), suffix: '' };
};

const StatsBar = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStats();
        setStats(data);
      } catch (err) {
        console.error('Stats load failed:', err.message);
        setStats({});
      }
    };
    load();
  }, []);

  const items = [
    { raw: stats?.instagramFollowers, label: 'Instagram Followers' },
    { raw: stats?.totalDownloads,     label: 'Total Downloads'     },
    { raw: stats?.totalPosts,         label: 'Artworks Published'  },
  ];

  return (
    <StatsSection>
      {/* Section heading — gives context to the numbers */}
      <StatsHeadingRow>
        <StatsEyebrow>By the numbers</StatsEyebrow>
        <StatsTitle>The community<br />speaks for itself</StatsTitle>
      </StatsHeadingRow>

      <StatsInner>
        {items.map(({ raw, label }) => {
          const { value, suffix } = formatNumber(raw);
          return (
            <StatItem key={label}>
              <StatValue>
                {value}
                {suffix && <span>{suffix}</span>}
              </StatValue>
              <StatLabel>{label}</StatLabel>
            </StatItem>
          );
        })}
      </StatsInner>
    </StatsSection>
  );
};

export default StatsBar;
