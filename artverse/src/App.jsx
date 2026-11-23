// src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import GlobalStyles from './styles/GlobalStyles';
import { AuthProvider } from './context/AuthContext';
import AnimatedBackground from './components/AnimatedBackground';
import Home  from './pages/Home';
import Admin from './pages/Admin';

const App = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AnimatedBackground />
      <AuthProvider>
        <Routes>
          <Route path="/"      element={<Home />}  />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;