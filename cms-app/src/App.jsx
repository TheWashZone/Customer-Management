import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './api/firebaseconfig';
import { MembersProvider } from './context/MembersContext';
import { cleanupOldVisitData } from './api/analytics-crud';
import AnalyticsPage from './pages/analytics-page';
import CustomerListPage from './pages/customer-list-page';
import CustomerSearchPage from './pages/customer-search-page';
import LoginPage from './pages/login-page';
import UploadPage from './pages/upload-page';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Run cleanup of old visit data when user logs in
      if (currentUser) {
        cleanupOldVisitData()
          // .then(deletedCount => {
          //   if (deletedCount > 0) {
          //     console.log(`Cleaned up ${deletedCount} old visit records`);
          //   }
          // })
          // .catch(err => console.error('Cleanup failed:', err));
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <MembersProvider user={user}>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/analytics"
            element={user ? <AnalyticsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/customers"
            element={user ? <CustomerListPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/"
            element={user ? <CustomerSearchPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/test"
            element={user ? <UploadPage/> : <Navigate to="/login" replace />}
          />
        </Routes>
      </MembersProvider>
    </BrowserRouter>
  );
}

export default App;