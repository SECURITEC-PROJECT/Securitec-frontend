import { useState, type ReactNode } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <Topbar onMenuClick={() => setMobileOpen(true)} />
      <div className="main">
        <div className="sidebar-desktop"><Sidebar /></div>
        {mobileOpen && (
          <>
            <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
            <div className="sidebar-mobile">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </div>
          </>
        )}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
