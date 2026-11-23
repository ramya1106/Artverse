// Total website revenue (net of refunds), loaded from the database.
import { useState, useEffect, useCallback } from 'react';
import { fetchRevenue } from '../../api';
import { RevenueCard, RevenueLabel, RevenueValue, RevenueSub, RefreshLink } from './styledComponents';

const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const RevenueStats = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchRevenue());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <RevenueCard>
      <RevenueLabel>Total Revenue</RevenueLabel>
      <RevenueValue>
        {data ? inr(data.net) : loading ? '…' : '—'}
      </RevenueValue>
      <RevenueSub>
        {error
          ? `⚠ ${error}`
          : data
            ? `${data.successfulPayments} successful payment${data.successfulPayments === 1 ? '' : 's'} · net of ${inr(data.refunded)} refunds`
            : 'Loading from database…'}
      </RevenueSub>
      <RefreshLink onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</RefreshLink>
    </RevenueCard>
  );
};

export default RevenueStats;
