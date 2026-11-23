import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminNav from '../../components/AdminNav';
import LoginForm from '../../components/LoginForm';
import UploadPost from '../../components/UploadPost';
import UpdateFollowers from '../../components/UpdateFollowers';
import AdminGallery from '../../components/AdminGallery';
import RevenueStats from '../../components/RevenueStats';
import {
  DashboardPage,
  DashboardMain,
  DashboardHeading,
  DashboardEyebrow,
  DashboardTitle,
  TabRow,
  Tab,
  ContentCard,
} from './styledComponents';

const TABS = [
  { id: 'upload', label: 'Upload Post' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'followers', label: 'Update Followers' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <DashboardPage>
      <AdminNav showLogout />
      <DashboardMain>
        <DashboardHeading>
          <DashboardEyebrow>Content Management</DashboardEyebrow>
          <DashboardTitle>Dashboard</DashboardTitle>
        </DashboardHeading>

        <RevenueStats />

        <TabRow>
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Tab>
          ))}
        </TabRow>

        {activeTab !== 'gallery' && (
          <ContentCard>
            {activeTab === 'upload' && <UploadPost />}
            {activeTab === 'followers' && <UpdateFollowers />}
          </ContentCard>
        )}
      </DashboardMain>

      {/* Gallery is full-width (same layout as the public site), so it sits
          outside the narrow DashboardMain column. */}
      {activeTab === 'gallery' && <AdminGallery />}
    </DashboardPage>
  );
};

// Shows the login page until the admin is signed in
const Admin = () => {
  const { isAuthenticated, checking } = useAuth();

  if (checking) return <AdminNav showLogout={false} />; // restoring saved session

  if (!isAuthenticated) {
    return (
      <>
        <AdminNav showLogout={false} />
        <LoginForm />
      </>
    );
  }

  return <AdminDashboard />;
};

export default Admin;
