import styled from 'styled-components';

export const NavBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: ${({ theme }) => theme.navHeight};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  background: rgba(8, 8, 8, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 0 1rem;
  }
`;

export const NavLogo = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.65rem;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.text};
  user-select: none;

  span {
    color: ${({ theme }) => theme.colors.red};
  }
`;

export const NavBadge = styled.span`
  display: inline-block;
  margin-left: 0.75rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.52rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDim};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.2rem 0.5rem;
  border-radius: 1px;
  vertical-align: middle;
`;

export const LogoutButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 0.42rem 1.2rem;
  font-size: 0.58rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.mono};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 1px;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;
