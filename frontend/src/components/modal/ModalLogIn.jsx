import React, { useState } from "react";
import FormLogin from "../form/FormLogin";
import ModalRegister from "./ModalRegister";

const ModalLogIn = () => {
  const [prefillEmail, setPrefillEmail] = useState("");

  const LOGIN_MODAL_ID = "modalLogin";
  const REGISTER_MODAL_ID = "registerModal";

  return (
    <>
      {/* ===== LOGIN MODAL ===== */}
      <div
        className="modal fade"
        id={LOGIN_MODAL_ID}
        tabIndex={-1}
        aria-hidden="true"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        style={{ zIndex: 1055 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          {/* sin bg-mc-dark: este modal es “light” como la referencia */}
          <div className="modal-content mcLoginModalContent">
            {/* botón X custom arriba derecha */}
            <button
              type="button"
              className="mcLoginCloseBtn"
              data-bs-dismiss="modal"
              aria-label="Close"
              title="Close"
            >
              ×
            </button>

            <div className="modal-body mcLoginBody">
              <FormLogin
                loginModalId={LOGIN_MODAL_ID}
                registerModalId={REGISTER_MODAL_ID}
                prefillEmail={prefillEmail}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== REGISTER MODAL (SIBLING) ===== */}
      <ModalRegister
        modalId={REGISTER_MODAL_ID}
        loginModalId={LOGIN_MODAL_ID}
        onRegistered={({ email }) => setPrefillEmail(email || "")}
      />
    </>
  );
};

export default ModalLogIn;