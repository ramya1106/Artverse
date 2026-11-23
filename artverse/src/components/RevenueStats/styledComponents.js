import styled from 'styled-components';

export const RevenueCard = styled.div`
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 1px;
    background: linear-gradient(to right, transparent, ${({ theme }) => theme.colors.redDim}, transparent);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1.5rem 1rem;
  }
`;

export const RevenueLabel = styled.p`
  font-size: 0.58rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 0.75rem;
`;

export const RevenueValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(2.4rem, 7vw, 4rem);
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1;
  span { color: ${({ theme }) => theme.colors.red}; }
`;

export const RevenueSub = styled.p`
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textDim};
  margin-top: 0.75rem;
`;

export const RefreshLink = styled.button`
  background: none;
  border: none;
  margin-top: 0.75rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;
