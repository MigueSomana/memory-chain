import React from "react";
import FormLogin from "../form/FormLogin";

const ModalLogIn = () => {
  return (
    <>
      <div
        className="modal fade"
        id="modalLogin"
        tabindex="-1"
        aria-labelledby="modalLoginLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content bg-dark text-white">
            <div className="modal-body container">
              <div className="row">
                <div className="button-close-modal-fix">
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <FormLogin />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalLogIn;
