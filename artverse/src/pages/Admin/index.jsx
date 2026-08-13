import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminNav from '../../components/AdminNav';
import LoginForm from '../../components/LoginForm';
import UploadPost from '../../components/UploadPost';
import UpdateFollowers from '../../components/UpdateFollowers';
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

        <ContentCard>
          {activeTab === 'upload' && <UploadPost />}
          {activeTab === 'followers' && <UpdateFollowers />}
        </ContentCard>
      </DashboardMain>
    </DashboardPage>
  );
};

// Login guard — shows login page if not authenticated
const Admin = () => {
  const { isAuthenticated } = useAuth();

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
