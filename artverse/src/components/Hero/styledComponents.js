import styled, { keyframes } from 'styled-components';

const scrollUp = keyframes`
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
`;

export const HeroSection = styled.section`
  /* Exactly one viewport tall, minus the navbar.
     This is the critical fix — the hero no longer grows taller than the screen. */
  height: calc(100vh - ${({ theme }) => theme.navHeight});
  margin-top: ${({ theme }) => theme.navHeight};
  display: grid;
  grid-template-columns: 1fr 1fr;

  /* overflow: hidden on the SECTION clips the scroll columns inside it.
     Without this, the columns extend beyond the section and push the page down. */
  overflow: hidden;
  position: relative;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    /* On mobile, left side text + right side preview stacked */
    height: auto;
    min-height: 100svh; /* svh = small viewport height, accounts for mobile browser chrome */
  }
`;

export const HeroLeft = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4rem 3rem 4rem 4rem;
  position: relative;
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent,
      ${({ theme }) => theme.colors.redDim},
      transparent
    );
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) { padding: 3rem 2rem; }
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 3rem 1.5rem 2rem;
    &::after { display: none; }
  }
`;

export const HeroEyebrow = styled.span`
  display: block;
  font-size: 0.62rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.red};
  margin-bottom: 1.5rem;
`;

export const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.serif};
  font-size: clamp(2.8rem, 5.5vw, 5.5rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.05;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.colors.text};

  strong {
    font-style: normal;
    font-weight: 600;
    display: block;
  }
`;

export const HeroBody = styled.p`
  font-size: 0.7rem;
  line-height: 1.85;
  color: ${({ theme }) => theme.colors.textMuted};
  max-width: 320px;
  margin-bottom: 2.5rem;
`;

export const HeroActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

export const PrimaryButton = styled.button`
  background: ${({ theme }) => theme.colors.red};
  color: #fff;
  padding: 0.85rem 2.2rem;
  font-size: 0.62rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.mono};
  border-radius: 1px;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover { background: ${({ theme }) => theme.colors.redBright}; transform: translateY(-2px); }
  &:active { transform: translateY(0); }
`;

export const GhostButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 0.85rem 2.2rem;
  font-size: 0.62rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.mono};
  border: 1px solid ${({ theme }) => theme.colors.borderHover};
  border-radius: 1px;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover { color: ${({ theme }) => theme.colors.text}; border-color: ${({ theme }) => theme.colors.textMuted}; }
`;

export const HeroRight = styled.div`
  /* height: 100% fills the parent HeroSection exactly.
     Combined with overflow: hidden on HeroSection, the columns
     scroll inside this box and never escape it. */
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px;
  position: relative;

  /* Top and bottom fade — makes the scroll look infinite, not cut off */
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    z-index: 2;
    pointer-events: none;
  }

  &::before {
    top: 0;
    height: 100px;
    background: linear-gradient(to bottom, ${({ theme }) => theme.colors.black}, transparent);
  }

  &::after {
    bottom: 0;
    height: 100px;
    background: linear-gradient(to top, ${({ theme }) => theme.colors.black}, transparent);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: 50vw;
    min-height: 280px;
  }
`;

export const ScrollColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  will-change: transform;
  animation: ${scrollUp} ${({ $duration }) => $duration}s linear infinite;
  margin-top: ${({ $offset }) => $offset}px;
`;

export const ScrollImageWrapper = styled.div`
  width: 100%;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
`;

export const ScrollPlaceholder = styled.div`
  width: 100%;
  aspect-ratio: ${({ $ratio }) => $ratio || '3 / 4'};
  background: ${({ theme }) => theme.colors.surface2};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      160deg,
      ${({ theme }) => theme.colors.surface3} 0%,
      ${({ theme }) => theme.colors.surface2} 50%,
      ${({ theme }) => theme.colors.surface3} 100%
    );
  }
`;

export const ScrollImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.5s ease;

  &.loaded { opacity: 1; }
`;
