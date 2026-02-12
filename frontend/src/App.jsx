import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RouteLoader from "./utils/loader";
import ViewerPDF from "./utils/viewerPDF";
import { ToastProvider } from "./utils/toast";

// General Import
import Modal from "./components/modal/Modal";
import Home from "./pages/simple/Home";
import Search from "./pages/search/PrincipalSearch";
import NotFound from "./pages/simple/NotFound";
import VerifyLog from "./pages/config/VerifyLog";

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
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<RouteLoader />}>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/verify" element={<VerifyLog />} />
              <Route path="/verify/:id" element={<VerifyLog />} />

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

              <Route path="/view/:id" element={<ViewerPDF />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Modal />
        </BrowserRouter>
      </ToastProvider>
    </>
  );
}

export default App;
