import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Label } from '../../styles/shared';
import {
  LoginPage,
  LoginCard,
  LoginEyebrow,
  LoginTitle,
  LoginSub,
  Divider,
  FormGroup,
  Input,
  ErrorMessage,
  LoginButton,
} from './styledComponents';

const LoginForm = () => {
  const { login, error, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <LoginPage>
      <LoginCard>
        <LoginEyebrow>Restricted Access</LoginEyebrow>
        <LoginTitle>Admin Portal</LoginTitle>
        <LoginSub>Sign in to manage artverse content</LoginSub>
        <Divider />

        <form onSubmit={handleSubmit} noValidate>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <FormGroup>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              $error={!!error}
              autoComplete="username"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              $error={!!error}
              autoComplete="current-password"
              required
            />
          </FormGroup>

          <LoginButton type="submit" disabled={loading || !username || !password}>
            {loading ? (
              <>
                <Spinner />
                Authenticating
              </>
            ) : (
              'Sign In'
            )}
          </LoginButton>
        </form>
      </LoginCard>
    </LoginPage>
  );
};

export default LoginForm;
