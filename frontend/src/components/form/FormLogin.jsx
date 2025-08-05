import React from "react";
import isologo from "../../assets/isologo.png";

const FormLogin = () => {
  return (
    <>
      <div className="container fix-form-modal">
        <form className="form-signin">
          <div className="text-center spaced-fix" bis_skin_checked="1">
            <img src={isologo} alt="" width="auto" height="70px" />
            <h1 className="h3 mb-3 font-weight-normal mt-3">Log In</h1>
            <p>
              Protect your research with the world's most secure decentralized library
            </p>
          </div>

          <div className="form-label-group" bis_skin_checked="1">
            <label for="inputEmail">Email address</label>
            <input
              type="email"
              id="inputEmail"
              className="form-control"
              placeholder="Email address"
              required=""
              autofocus=""
            />
          </div>

          <div className="form-label-group" bis_skin_checked="1">
            <label for="inputPassword">Password</label>
            <input
              type="password"
              id="inputPassword"
              className="form-control"
              placeholder="Password"
              required=""
            />
          </div>

          <div className="checkbox mb-3" bis_skin_checked="1">
            <label>
              <input type="checkbox" value="remember-me" /> Remember me
            </label>
          </div>
          <div className="row">
          <button type="submit" className="btn btn-memory btn-lg px-4 gap-3 my-1">
            Log in
          </button>
          <button type="button" className="btn btn-outline-memory btn-lg px-4 my-3">
            Sign in
          </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default FormLogin;
