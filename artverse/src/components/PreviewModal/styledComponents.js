import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// Dark full screen layer behind the modal
export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2147483000; /* higher than the sticky navbar and filter bar */
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: ${fadeIn} 0.18s ease;
  backdrop-filter: blur(6px);
  overscroll-behavior: contain;
  touch-action: none;
  @media (max-width: 480px) { padding: 8px; }
`;

// The box that holds the media and the footer
export const ModalBox = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: min(92vw, 720px);
  max-height: 92vh;
  max-height: 92dvh;
  width: 100%;
  touch-action: pan-y;
  background: #111;
  border-radius: 16px;
  overflow: hidden;
  animation: ${slideUp} 0.22s ease;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.7);
`;

// Close button in the top right corner
export const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s;
  backdrop-filter: blur(4px);

  &:hover { background: rgba(255, 255, 255, 0.15); }

  svg {
    width: 16px;
    height: 16px;
    stroke: #fff;
    flex-shrink: 0;
  }
`;

// Holds the image or video and fills the free height
export const MediaWrapper = styled.div`
  flex: 1;
  min-height: 0; /* lets the flex child shrink */
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
`;

// The admin version is shorter so the stats and controls still fit on small screens
export const ModalImage = styled.img`
  max-width: 100%;
  max-height: ${({ $admin }) => ($admin ? '56vh' : '72vh')};
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
`;

export const ModalVideo = styled.video`
  max-width: 100%;
  max-height: ${({ $admin }) => ($admin ? '56vh' : '72vh')};
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
`;

// Bottom row (category and download for visitors, controls for the admin)
export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: ${({ theme }) => theme.colors.surface2};
  flex-wrap: wrap;

  @media (max-width: 480px) {
    padding: 12px 14px;
  }
`;

// Small category label
export const CategoryChip = styled.span`
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  background: ${({ theme }) => theme.colors.surface3};
  padding: 4px 10px;
  border-radius: 20px;
  white-space: nowrap;
`;

// Download / Pay button
export const DownloadBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
  background: ${({ theme }) => theme.colors.red};
  transition: background 0.18s, transform 0.15s, opacity 0.15s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.redBright};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
    transform: none;
  }

  svg { flex-shrink: 0; }
`;

// Inline spinner inside the button
export const BtnSpinner = styled.span`
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.65s linear infinite;
  flex-shrink: 0;
`;

// Admin-only pieces
export const AdminStatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: ${({ theme }) => theme.colors.border};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const StatTile = styled.div`
  background: ${({ theme }) => theme.colors.surface2};
  padding: 12px 18px;
  text-align: center;

  span {
    display: block;
    font-size: 0.55rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 4px;
  }
  strong {
    font-family: ${({ theme }) => theme.fonts.display};
    font-size: 1.6rem;
    font-weight: 400;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const AdminControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  label {
    font-size: 0.58rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export const CategorySelect = styled.select`
  background: ${({ theme }) => theme.colors.surface3};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.7rem;
  font-family: inherit;
  &:disabled { opacity: 0.6; }
`;

export const AdminBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #fff;
  background: ${({ $danger, theme }) => ($danger ? theme.colors.red : theme.colors.surface3)};
  border: 1px solid ${({ $danger, theme }) => ($danger ? 'transparent' : theme.colors.border)};
  transition: background 0.18s, opacity 0.15s;

  &:hover:not(:disabled) {
    background: ${({ $danger, theme }) => ($danger ? theme.colors.redBright : '#2a2a2a')};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const ConfirmOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

export const ConfirmBox = styled.div`
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 20px;
  max-width: 340px;
  width: 100%;
  text-align: center;

  h4 { font-size: 0.85rem; margin-bottom: 8px; color: ${({ theme }) => theme.colors.text}; }
  p  { font-size: 0.68rem; line-height: 1.6; color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 16px; }
  div { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
`;
