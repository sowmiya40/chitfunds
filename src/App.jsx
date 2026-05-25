import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import MemberDetails from './pages/MemberDetails';
import Subscribers from './pages/Subscribers';
import SubscriberDetails from './pages/SubscriberDetails';
import FundCalculation from './pages/FundCalculation';
import Profile from './pages/Profile';

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  return (
    <div className="app">
      {!isLoginPage && <Navbar />}
      <main className={isLoginPage ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetails />} />
          <Route path="/groups/:groupId/members/:memberId" element={<MemberDetails />} />
          <Route path="/subscribers" element={<Subscribers />} />
          <Route path="/subscribers/:id" element={<SubscriberDetails />} />
          <Route path="/fund-calculation" element={<FundCalculation />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
