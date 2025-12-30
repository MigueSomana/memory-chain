import React from "react";
import { clearAuthSession } from "../../utils/authSession";

const handleLogout = () => {
  clearAuthSession();
  window.location.href = "/";
};
// Modal de Sign Out
const ModalSignOut = () => {
  return (
    <>
      <div
        className="modal fade"
        id="modalExit"
        tabindex="-1"
        aria-labelledby="modalExitLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content bg-mc-dark text-white">
            <div className="modal-body container mb-4">
              <div className="row">
                <div className="button-close-modal-fix">
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <p className="text-center mt-3 mb-4 fs-5">
                  Are you sure you want to log out?
                </p>

                <div className="d-flex justify-content-center gap-3">
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-memory px-4"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalSignOut;
