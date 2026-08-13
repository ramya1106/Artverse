import styled from 'styled-components';

export const StatsSection = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

export const StatsHeadingRow = styled.div`
  padding: 4rem 2rem 3rem;
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 3rem 1.5rem 2rem;
  }
`;

export const StatsEyebrow = styled.span`
  display: block;
  font-size: 0.58rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.red};
  margin-bottom: 1rem;
`;

export const StatsTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.serif};
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 300;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.15;
  margin-bottom: 0;
`;

export const StatsInner = styled.div`
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
`;

export const StatItem = styled.div`
  flex: 1;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2.5rem 2rem;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  text-align: center;
  &:last-child { border-right: none; }
`;

export const StatValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(2.5rem, 5vw, 4rem);
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1;
  span { color: ${({ theme }) => theme.colors.red}; }
`;

export const StatLabel = styled.div`
  font-size: 0.58rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 0.5rem;
`;
