import styled from 'styled-components';

export const PaginationWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 3rem 2rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 2rem 1rem;
    gap: 3px;
  }
`;

export const PageButton = styled.button`
  min-width: 44px;
  height: 44px;
  padding: 0 0.75rem;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.red : 'transparent'};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.red : theme.colors.border};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.textMuted};
  font-size: 0.65rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  letter-spacing: 0.05em;
  border-radius: 1px;
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  &:hover:not(:disabled) {
    border-color: ${({ $active, theme }) =>
      $active ? theme.colors.red : theme.colors.borderHover};
    color: ${({ $active, theme }) =>
      $active ? '#ffffff' : theme.colors.text};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

export const PageNavButton = styled(PageButton)`
  min-width: 88px;
  font-size: 0.6rem;
  letter-spacing: 0.15em;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    min-width: 44px;
    span { display: none; }
  }
`;

export const PageEllipsis = styled.span`
  padding: 0 4px;
  color: ${({ theme }) => theme.colors.textDim};
  font-size: 0.65rem;
  line-height: 44px;
  user-select: none;
`;
