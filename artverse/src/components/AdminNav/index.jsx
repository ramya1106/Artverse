import { useAuth } from '../../context/AuthContext';
import { NavBar, NavLogo, NavBadge, LogoutButton } from './styledComponents';

const AdminNav = ({ showLogout = false }) => {
  const { logout } = useAuth();

  return (
    <NavBar>
      <NavLogo>
        ART<span>V</span>ERSE
        <NavBadge>Admin</NavBadge>
      </NavLogo>
      {showLogout && (
        <LogoutButton onClick={logout}>Logout</LogoutButton>
      )}
    </NavBar>
  );
};

export default AdminNav;
