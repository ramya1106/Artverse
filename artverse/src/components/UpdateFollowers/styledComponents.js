import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const countUp = keyframes`
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
`;

export const FormWrapper = styled.div`
  animation: ${fadeIn} 0.35s ${({ theme }) => theme.transitions.smooth} both;
`;

export const CurrentCountCard = styled.div`
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  padding: 2.5rem 2rem;
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      ${({ theme }) => theme.colors.redDim},
      transparent
    );
  }
`;

export const CountLabel = styled.p`
  font-size: 0.58rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 0.75rem;
`;

export const CountValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(3rem, 8vw, 5.5rem);
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1;
  animation: ${countUp} 0.4s ${({ theme }) => theme.transitions.smooth} both;

  span {
    color: ${({ theme }) => theme.colors.red};
  }
`;

export const CountSub = styled.p`
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textDim};
  margin-top: 0.5rem;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

export const NumberInput = styled.input`
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.8rem;
  letter-spacing: 0.05em;
  padding: 0.9rem 1rem;
  border-radius: 1px;
  outline: none;
  width: 100%;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textDim};
    font-size: 1.2rem;
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.textMuted};
  }

  /* Hide arrows */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;

export const UpdateButton = styled.button`
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
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.redBright};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const SuccessBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.25);
  border-radius: 1px;
  margin-top: 1rem;
  animation: ${fadeIn} 0.4s ease both;

  svg {
    width: 14px;
    height: 14px;
    stroke: ${({ theme }) => theme.colors.red};
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex-shrink: 0;
  }

  p {
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;
