import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const checkDraw = keyframes`
  from { stroke-dashoffset: 50; }
  to   { stroke-dashoffset: 0; }
`;

export const FormWrapper = styled.div`
  animation: ${fadeIn} 0.35s ease both;
`;

export const DropZone = styled.div`
  border: 1.5px dashed
    ${({ $dragging, theme }) => $dragging ? theme.colors.textMuted : theme.colors.border};
  border-radius: 2px;
  background: ${({ $dragging, theme }) => $dragging ? theme.colors.surface3 : theme.colors.surface2};
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.surface3};
  }
`;

export const DropIcon = styled.div`
  width: 48px;
  height: 48px;
  border: 1px solid ${({ theme }) => theme.colors.borderHover};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 22px;
    height: 22px;
    stroke: ${({ theme }) => theme.colors.textMuted};
  }
`;

export const DropLabel = styled.p`
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  span { color: ${({ theme }) => theme.colors.red}; }
`;

export const DropHint = styled.p`
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textDim};
  text-align: center;
`;

export const HiddenInput = styled.input`
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
`;

export const PreviewWrapper = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const PreviewImage = styled.img`
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  display: block;
`;

export const PreviewVideo = styled.video`
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  display: block;
`;

export const PreviewOverlay = styled.div`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
`;

export const RemoveButton = styled.button`
  width: 32px;
  height: 32px;
  background: rgba(8, 8, 8, 0.85);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
    stroke: ${({ theme }) => theme.colors.textMuted};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.red};
    border-color: ${({ theme }) => theme.colors.red};
    svg { stroke: #fff; }
  }
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

export const Label = styled.label`
  font-size: 0.58rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Select = styled.select`
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.78rem;
  padding: 0.9rem 1rem;
  border-radius: 1px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a8278' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;

  &:focus { border-color: ${({ theme }) => theme.colors.textMuted}; }
  option  { background: ${({ theme }) => theme.colors.surface}; }
`;

export const VideoBadge = styled.div`
  padding: 0.85rem 1rem;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.25);
  border-radius: 1px;
  margin-bottom: 1.5rem;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.6;
  strong { color: ${({ theme }) => theme.colors.text}; }
`;

export const SubmitButton = styled.button`
  width: 100%;
  background: ${({ theme }) => theme.colors.red};
  color: #fff;
  padding: 0.95rem;
  font-size: 0.62rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.mono};
  border-radius: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  transition: background 0.2s ease;

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.redBright}; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

export const Spinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

export const SuccessCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 3rem 2rem;
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid rgba(192, 57, 43, 0.25);
  border-radius: 2px;
  animation: ${fadeIn} 0.5s ease both;
  text-align: center;
`;

export const SuccessIconWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(192, 57, 43, 0.1);
  border: 1.5px solid ${({ theme }) => theme.colors.red};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
    stroke: ${({ theme }) => theme.colors.red};
    stroke-dasharray: 50;
    animation: ${checkDraw} 0.5s 0.2s ease both;
  }
`;

export const SuccessTitle = styled.p`
  font-family: ${({ theme }) => theme.fonts.serif};
  font-size: 1.5rem;
  font-weight: 300;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text};
`;

export const SuccessSub = styled.p`
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const ResetButton = styled.button`
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.red};
  font-family: ${({ theme }) => theme.fonts.mono};
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;
  &:hover { border-bottom-color: ${({ theme }) => theme.colors.redDim}; }
`;
