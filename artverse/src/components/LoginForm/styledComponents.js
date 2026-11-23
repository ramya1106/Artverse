import styled, { keyframes } from 'styled-components';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const LoginPage = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.black};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.navHeight} 1.5rem 1.5rem;
`;

export const LoginCard = styled.div`
  width: 100%;
  max-width: 400px;
  animation: ${fadeUp} 0.6s ${({ theme }) => theme.transitions.smooth} both;
`;

export const LoginEyebrow = styled.span`
  display: block;
  font-size: 0.58rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.red};
  margin-bottom: 1rem;
  text-align: center;
`;

export const LoginTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.serif};
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 300;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  margin-bottom: 0.5rem;
`;

export const LoginSub = styled.p`
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  margin-bottom: 2.5rem;
`;

export const Divider = styled.div`
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    ${({ theme }) => theme.colors.border},
    transparent
  );
  margin-bottom: 2.5rem;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
`;

export const Input = styled.input`
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid ${({ $error, theme }) =>
    $error ? theme.colors.red : theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.78rem;
  padding: 0.9rem 1rem;
  border-radius: 1px;
  outline: none;
  transition: border-color ${({ theme }) => theme.transitions.fast};
  width: 100%;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textDim};
  }

  &:focus {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.red : theme.colors.textMuted};
  }
`;

export const ErrorMessage = styled.p`
  font-size: 0.62rem;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.red};
  padding: 0.75rem 1rem;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.25);
  border-radius: 1px;
  margin-bottom: 1.25rem;
`;

export const LoginButton = styled.button`
  width: 100%;
  background: ${({ theme }) => theme.colors.red};
  color: #fff;
  padding: 0.95rem;
  font-size: 0.62rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.mono};
  border-radius: 1px;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.redBright};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
