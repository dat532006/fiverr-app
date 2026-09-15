import { Route, Routes } from 'react-router';

export function BootstrapApp() {
  return (
    <Routes>
      <Route
        path="*"
        element={
          <main className="p-6 text-slate-800">
            <h1 className="text-xl font-semibold">Fiverr</h1>
            <p>Nền ứng dụng đã khởi tạo.</p>
          </main>
        }
      />
    </Routes>
  );
}
