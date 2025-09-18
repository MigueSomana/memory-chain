import React from 'react'

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
                <p>HOLA MENOR</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ModalSignOut;