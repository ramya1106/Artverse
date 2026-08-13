import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const CardWrapper = styled.div`
  break-inside: avoid;
  margin-bottom: 16px;
  width: 100%;
  max-width: 220px;
  margin-left: auto;
  margin-right: auto;
  display: block;

  &:hover img { transform: scale(1.03); }
  &:hover video { transform: scale(1.03); }
  &:hover [data-overlay] { opacity: 1; }
  &:hover [data-dl] {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
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

// CardVideo mirrors CardImage but uses <video> semantics
export const CardVideo = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;   /* cover works better than fill for video aspect ratios */
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

export const DownloadButton = styled.button.attrs({ 'data-dl': true })`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.red};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.75) translateY(8px);
  transition: all ${({ theme }) => theme.transitions.smooth};
  border: none;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.redBright};
    transform: scale(1.08) translateY(0) !important;
  }

  &:disabled {
    cursor: wait;
    opacity: 1 !important;
    transform: scale(1) translateY(0) !important;
  }

  svg {
    width: 15px;
    height: 15px;
    stroke: white;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

export const DownloadSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

// Small badge on video cards — tells the user it's a video before hover
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
