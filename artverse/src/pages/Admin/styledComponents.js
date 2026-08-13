import styled, { keyframes } from 'styled-components';

const fadeSlide = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const DashboardPage = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.black};
  padding-top: ${({ theme }) => theme.navHeight};
`;

export const DashboardMain = styled.main`
  max-width: 680px;
  margin: 0 auto;
  padding: 4rem 1.5rem 6rem;
  animation: ${fadeSlide} 0.5s ${({ theme }) => theme.transitions.smooth} both;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 2.5rem 1rem 4rem;
  }
`;

export const DashboardHeading = styled.div`
  margin-bottom: 3rem;
`;

export const DashboardEyebrow = styled.span`
  display: block;
  font-size: 0.58rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.red};
  margin-bottom: 0.75rem;
`;

export const DashboardTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.serif};
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 300;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text};
`;

export const TabRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 2.5rem;
`;

export const Tab = styled.button`
  padding: 0.9rem 2rem;
  font-size: 0.62rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.mono};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text : theme.colors.textMuted};
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.red : 'transparent')};
  margin-bottom: -1px;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 0.9rem 1.25rem;
    font-size: 0.58rem;
  }
`;

export const ContentCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  padding: 2.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: 1.5rem;
  }
`;
