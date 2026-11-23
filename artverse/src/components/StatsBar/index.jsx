import { useState, useEffect } from 'react';
import { fetchStats } from '../../api';
import formatCount from '../../utils/formatCount';
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
      <StatsHeadingRow>
        <StatsEyebrow>By the numbers</StatsEyebrow>
        <StatsTitle>The community<br />speaks for itself</StatsTitle>
      </StatsHeadingRow>

      <StatsInner>
        {items.map(({ raw, label }) => {
          const { value, suffix } = formatCount(raw);
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
