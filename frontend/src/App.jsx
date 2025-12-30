import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// General Import
import Modal from "./components/modal/Modal";
import Home from "./pages/simple/Home";
import About from "./pages/simple/AboutUs";
import Search from "./pages/search/PrincipalSearch";
import NotFound from "./pages/simple/NotFound";
import Verify from "./pages/simple/Verify";

// Personal Import
import DashboardP from "./pages/dashboard/DashboardPersonal";
import LibraryP from "./pages/library/PersonalLibrary";
import ProfileP from "./pages/config/ProfilePersonal";
import ListLike from "./pages/search/ListLike";
import UploadThesis from "./pages/config/UploadThesis";
import UpdateThesis from "./pages/config/UpdateThesis";

// University Import
import DashboardU from "./pages/dashboard/DashboardUniversity";
import LibraryU from "./pages/library/UniversityLibrary";
import ProfileU from "./pages/config/ProfileUniversity";
import ListMember from "./pages/search/ListMember";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:id" element={<Verify />} />
          <Route path="/about-us" element={<About />} />
          <Route path="*" element={<NotFound />} />

          <Route path="/explore" element={<Search />} />
          <Route path="/new-upload" element={<UploadThesis />} />
          <Route path="/update/:id" element={<UpdateThesis />} />

          <Route path="/dashboard-personal" element={<DashboardP />} />
          <Route path="/library-personal" element={<LibraryP />} />
          <Route path="/profile-personal" element={<ProfileP />} />
          <Route path="/my-list-like" element={<ListLike />} />

          <Route path="/dashboard-institution" element={<DashboardU />} />
          <Route path="/library-institution" element={<LibraryU />} />
          <Route path="/profile-institution" element={<ProfileU />} />
          <Route path="/members-institution" element={<ListMember />} />

        </Routes>

        <Modal />

      </BrowserRouter>
    </>
  );
}

export default App;
