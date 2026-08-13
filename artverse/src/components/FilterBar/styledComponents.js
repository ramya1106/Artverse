import styled from 'styled-components';

export const FilterBarWrapper = styled.div`
  position: sticky;
  top: ${({ theme }) => theme.navHeight};
  z-index: 900;
  background: rgba(8, 8, 8, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0 2rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 0 1rem;
  }
`;

export const FilterInner = styled.div`
  display: flex;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const FilterTab = styled.button`
  flex-shrink: 0;
  padding: 1rem 1.6rem;
  font-size: 0.6rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text : theme.colors.textMuted};
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.red : 'transparent')};
  font-family: ${({ theme }) => theme.fonts.mono};
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;
