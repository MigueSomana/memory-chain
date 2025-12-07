import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// General Import
import Modal from './components/modal/Modal'
import Home from './pages/home/Home'
import About from './pages/aboutUs/AboutUs'
import Search from './pages/search/PrincipalSearch'
import NotFound from './pages/notfound/NotFound'

// Personal Import
import DashboardP from './pages/dashboard/DashboardPersonal'
import SearchP from './pages/search/LibraryPSearch'
import LibraryP from './pages/library/PersonalLibrary'
import ProfileP from './pages/config/ProfilePersonal'
import UploadThesis from './pages/config/UploadThesis'

// University Import
import DashboardU from './pages/dashboard/DashboardUniversity'
import SearchU from './pages/search/LibraryUSearch'
import LibraryU from './pages/library/UniversityLibrary'
import ProfileU from './pages/config/ProfileUniversity'

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />

        <Route path="/dashboardP" element={<DashboardP />} />
        <Route path="/searchP" element={<SearchP />} />
        <Route path="/libraryP" element={<LibraryP />} />
        <Route path="/profileP" element={<ProfileP />} />
        <Route path="/upload" element={<UploadThesis />} />

        
        <Route path="/dashboardU" element={<DashboardU />} />
        <Route path="/searchU" element={<SearchU />} />
        <Route path="/libraryU" element={<LibraryU />} />
        <Route path="/profileU" element={<ProfileU />} />
      </Routes>
      <Modal />
    </BrowserRouter>
    </>
  )
}

export default App;
