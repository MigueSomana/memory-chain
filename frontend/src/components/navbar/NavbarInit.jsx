import React from "react";
import logo from "../../assets/logo.png";
import { Link } from "react-router-dom";

const NavbarInit = () => {
  return (
    <nav className=" fluid-extended sticky-nav">
      <header>
        <div className="py-2 border-bottom" bis_skin_checked="1">
          <div className="container-fluid" bis_skin_checked="1">
            <div
              className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start"
              bis_skin_checked="1"
            >
              <Link to="/"
                className="d-flex align-items-center my-2 my-lg-0 me-lg-auto text-white text-decoration-none"
              >
                <img src={logo} alt="" width="auto" height="70px" />
              </Link>
              <ul className="nav col-12 col-lg-auto my-2 justify-content-center my-md-0 text-small">
                <li>
                  <Link to="/" className="nav-link text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      aria-hidden="true"
                      fill="currentColor"
                      className="bi bi-house-door-fill d-block mx-auto mb-1"
                      viewBox="0 0 16 16"
                    >
                      <path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5" />
                    </svg>
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/search" className="nav-link text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      aria-hidden="true"
                      fill="currentColor"
                      className="bi bi-binoculars-fill d-block mx-auto mb-1"
                      viewBox="0 0 16 16"
                    >
                      <path d="M4.5 1A1.5 1.5 0 0 0 3 2.5V3h4v-.5A1.5 1.5 0 0 0 5.5 1zM7 4v1h2V4h4v.882a.5.5 0 0 0 .276.447l.895.447A1.5 1.5 0 0 1 15 7.118V13H9v-1.5a.5.5 0 0 1 .146-.354l.854-.853V9.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v.793l.854.853A.5.5 0 0 1 7 11.5V13H1V7.118a1.5 1.5 0 0 1 .83-1.342l.894-.447A.5.5 0 0 0 3 4.882V4zM1 14v.5A1.5 1.5 0 0 0 2.5 16h3A1.5 1.5 0 0 0 7 14.5V14zm8 0v.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5V14zm4-11H9v-.5A1.5 1.5 0 0 1 10.5 1h1A1.5 1.5 0 0 1 13 2.5z" />
                    </svg>
                    Explore
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="nav-link text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      aria-hidden="true"
                      fill="currentColor"
                      className="bi bi-question-diamond-fill d-block mx-auto mb-1"
                      viewBox="0 0 16 16"
                    >
                      <path d="M9.05.435c-.58-.58-1.52-.58-2.1 0L.436 6.95c-.58.58-.58 1.519 0 2.098l6.516 6.516c.58.58 1.519.58 2.098 0l6.516-6.516c.58-.58.58-1.519 0-2.098zM5.495 6.033a.237.237 0 0 1-.24-.247C5.35 4.091 6.737 3.5 8.005 3.5c1.396 0 2.672.73 2.672 2.24 0 1.08-.635 1.594-1.244 2.057-.737.559-1.01.768-1.01 1.486v.105a.25.25 0 0 1-.25.25h-.81a.25.25 0 0 1-.25-.246l-.004-.217c-.038-.927.495-1.498 1.168-1.987.59-.444.965-.736.965-1.371 0-.825-.628-1.168-1.314-1.168-.803 0-1.253.478-1.342 1.134-.018.137-.128.25-.266.25zm2.325 6.443c-.584 0-1.009-.394-1.009-.927 0-.552.425-.94 1.01-.94.609 0 1.028.388 1.028.94 0 .533-.42.927-1.029.927" />{" "}
                    </svg>
                    About Us
                  </Link>
                </li>
                <li>
                  <a
                    href="#modalLogin"
                    className="nav-link text-white"
                    data-bs-toggle="modal"
                    data-bs-target="#modalLogin"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      aria-hidden="true"
                      fill="currentColor"
                      className="bi bi-person-circle d-block mx-auto mb-1"
                      viewBox="0 0 16 16"
                    >
                      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                      <path
                        fill-rule="evenodd"
                        d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"
                      />
                    </svg>
                    Log in
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>
    </nav>
  );
};

export default NavbarInit;
