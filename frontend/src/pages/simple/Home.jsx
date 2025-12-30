import React from 'react'
import NavbarInit from '../../components/navbar/NavbarInit'

const Home = () => {
  return (
    <>
    <NavbarInit/>
    <div className="background-home text-white">
      <div className="container-fluid">
        <div className="row justify-content-end">
          <div className="col-md-10 col-lg-6 bg-shadow">
            <h1 className="display-5 fw-bold text-end spaced-fix">
              Memory Chain
            </h1>
            <p className="lead text-end mb-4 spaced-fix">
              <i>Discover verified and certified research across institutions,
              fields of study, and keywords</i>
            </p>
            <div className="d-grid gap-2 d-sm-flex justify-content-sm-end spaced-fix">
              <button
                type="button"
                className="btn btn-memory btn-lg px-4 gap-3"
                data-bs-toggle="modal"
                data-bs-target="#modalLogin"
              >
                Start Now
              </button>
              <button
                type="button"
                className="btn btn-outline-memory btn-lg px-4"
              >
                View Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>    
  )
}

export default Home;