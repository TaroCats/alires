import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import { LayoutShell } from "@/components/LayoutShell";
import Accounts from "@/pages/Accounts";
import Dashboard from "@/pages/Dashboard";
import Instances from "@/pages/Instances";
import Jobs from "@/pages/Jobs";
import Login from "@/pages/Login";
import Notifications from "@/pages/Notifications";
import { useAuthStore } from "@/store/auth";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <LayoutShell>{children}</LayoutShell>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/accounts"
          element={
            <Protected>
              <Accounts />
            </Protected>
          }
        />
        <Route
          path="/instances"
          element={
            <Protected>
              <Instances />
            </Protected>
          }
        />
        <Route
          path="/notifications"
          element={
            <Protected>
              <Notifications />
            </Protected>
          }
        />
        <Route
          path="/jobs"
          element={
            <Protected>
              <Jobs />
            </Protected>
          }
        />
      </Routes>
    </Router>
  );
}
