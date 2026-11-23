import styled from 'styled-components';

export const PageWrapper = styled.div`
  position: relative;
  z-index: 1;
  min-height: 100vh;
  background: transparent;   /* Hero shows canvas; sections below have their own bg */
`;

export const Navbar = styled.nav`
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  height: ${({ theme }) => theme.navHeight};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  background: rgba(8, 8, 8, 0.93);
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
  cursor: pointer;
  user-select: none;
  span { color: ${({ theme }) => theme.colors.red}; }
`;

export const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

export const NavLink = styled.a`
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;
  background: none;
  border: none;
  font-family: ${({ theme }) => theme.fonts.mono};
  cursor: pointer;
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover { color: ${({ theme }) => theme.colors.text}; }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: none;
  }
`;

export const NavCta = styled.a`
  background: ${({ theme }) => theme.colors.red};
  color: #fff;
  padding: 0.42rem 1.2rem;
  font-size: 0.58rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.mono};
  border-radius: 1px;
  text-decoration: none;
  display: inline-block;
  transition: background ${({ theme }) => theme.transitions.fast};
  &:hover { background: ${({ theme }) => theme.colors.redBright}; }
`;

export const StatsDivider = styled.div`
  height: 5rem;
  background: linear-gradient(
    to bottom,
    ${({ theme }) => theme.colors.black},
    ${({ theme }) => theme.colors.surface}
  );
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: 3rem;
  }
`;

export const GalleryAnchor = styled.div`
  scroll-margin-top: calc(
    ${({ theme }) => theme.navHeight} + ${({ theme }) => theme.filterBarHeight}
  );
`;

/* FOOTER */

export const PageFooter = styled.footer`
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 4rem 2rem 2rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 3rem 1rem 1.5rem;
  }
`;

export const FooterTop = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 3rem;
  padding-bottom: 3rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 2rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

export const FooterBrand = styled.div``;

export const FooterLogo = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.8rem;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 1rem;
  span { color: ${({ theme }) => theme.colors.red}; }
`;

export const FooterTagline = styled.p`
  font-size: 0.68rem;
  line-height: 1.8;
  color: ${({ theme }) => theme.colors.textMuted};
  max-width: 260px;
  margin-bottom: 1.5rem;
`;

export const SocialRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

export const SocialLink = styled.a`
  width: 36px;
  height: 36px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.red};
    color: ${({ theme }) => theme.colors.text};
    background: rgba(192, 57, 43, 0.08);
  }

  svg {
    width: 15px;
    height: 15px;
    fill: currentColor;
  }
`;

export const FooterCol = styled.div``;

export const FooterColTitle = styled.p`
  font-size: 0.58rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDim};
  margin-bottom: 1.25rem;
`;

export const FooterLinks = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

export const FooterLinkItem = styled.li`
  a {
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.colors.textMuted};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast};
    &:hover { color: ${({ theme }) => theme.colors.text}; }
  }
`;

export const FooterBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const FooterCopy = styled.p`
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textDim};
`;

export const FooterLegal = styled.p`
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textDim};
`;