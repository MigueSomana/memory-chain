import React from "react";
import { clearAuthSession } from "../../utils/authSession";
import { LogOut, Dot } from "lucide-react";

const handleLogout = () => {
  clearAuthSession();
  window.location.href = "/";
};

const ModalSignOut = () => {
  return (
    <div
      className="modal fade"
      id="modalExit"
      tabIndex="-1"
      aria-labelledby="modalExitLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        {/* modal-content transparente: el panel pinta */}
        <div className="modal-content mcSignOutModal">
          <div className="mcPanelCard mcSignOutPanel">
            {/* HEADER tipo mcPanelHead */}
            <div className="mcPanelHead mcSignOutHead">
              <div className="mcPanelHeadLeft">
                <div className="mcSignOutIconBox" aria-hidden="true">
                  <LogOut size={20} />
                </div>

                <div className="mcSignOutTitles">
                  <h5 id="modalExitLabel" className="m-0">
                    Sign Out
                  </h5>
                </div>
              </div>

              <div className="mcPanelHeadRight">
                <button
                  type="button"
                  className="mcSheetCloseBtn"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="mcPanelBody mcSignOutBody">
              <div className="mcSignOutMsgBox">
                Are you sure you want to sign out? Your session will be
                terminated and you'll need to authenticate again to access your
                account.
              </div>

              <div className="mcSignOutMetaRow">
                <span className="mcSignOutDot" aria-hidden="true" />
                <span className="mcSignOutMetaText">Session Active</span>

                <span className="mcSignOutMetaSep">•</span>

                <span className="mcSignOutMetaText">
                  Last activity: Just now
                </span>
              </div>
            </div>

            {/* FOOTER (estilo header, como en la imagen) */}
            <div className="mcPanelHead mcSignOutFooter">
              <div className="mcPanelHeadLeft" />
              <div className="mcPanelHeadRight d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-memory mcSignOutBtn"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={handleLogout}
                >
                  <span className="d-flex align-items-center gap-2">
                    <LogOut size={18} />
                    <span >
                      Sign Out
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
          {/* mcPanelCard */}
        </div>
      </div>
    </div>
  );
};

export default ModalSignOut;