import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EditorPage from "./pages/EditorPage";
import { useEffect } from "react";

// Wrapper to handle conditional layout
function LayoutWrapper({ children }) {
  const location = useLocation();
  const hideLayout = location.pathname.startsWith("/room/"); // hide for editor

  // Optional: smooth scroll reset on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {!hideLayout && <Navbar />}
      <main>{children}</main>
      {!hideLayout && <Footer />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LayoutWrapper>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/room/:roomId" element={<EditorPage />} />
        </Routes>
      </LayoutWrapper>
    </BrowserRouter>
  );
}

export default App;
