import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

export const CardWrapper = styled.div`
  break-inside: avoid;
  margin-bottom: 16px;
  width: 100%;
  max-width: 220px;
  margin-left: auto;
  margin-right: auto;

  &:hover img { transform: scale(1.03); }
  &:hover video { transform: scale(1.03); }
  &:hover [data-overlay] { opacity: 1; }
`;

export const CardImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface2};
  opacity: 0;
  transition: opacity 0.5s ease, transform ${({ theme }) => theme.transitions.slow};

  &.loaded { opacity: 1; }
`;

// Same as CardImage but for video
export const CardVideo = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* videos look better with cover than fill */
  display: block;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface2};
  opacity: ${({ $loaded }) => $loaded ? 1 : 0};
  transition: opacity 0.5s ease, transform ${({ theme }) => theme.transitions.slow};
`;

export const CardImagePlaceholder = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.colors.surface2};
  border-radius: 12px;
  overflow: hidden;
  transition: opacity 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      transparent 40%,
      rgba(255, 255, 255, 0.025) 50%,
      transparent 60%
    );
    animation: ${shimmer} 2.5s ease-in-out infinite;
  }
`;

export const CardOverlay = styled.div.attrs({ 'data-overlay': true })`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  opacity: 0;
  transition: opacity ${({ theme }) => theme.transitions.smooth};
`;

// Small badge that tells the user it is a video
export const VideoPlayIndicator = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.5rem;
  padding: 3px 6px;
  border-radius: 4px;
  letter-spacing: 0.05em;
  pointer-events: none;
  z-index: 1;
  backdrop-filter: blur(4px);
`;
