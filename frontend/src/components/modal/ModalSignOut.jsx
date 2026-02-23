import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../../utils/authSession";
import { useToast } from "../../utils/toast";
import { LogOut, CircleX, CheckCircle2 } from "lucide-react";

const MODAL_ID = "modalExit";

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return false;

  const inst = window.bootstrap?.Modal?.getInstance(el);
  if (inst) {
    inst.hide();
    return true;
  }

  // fallback extremo
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
  el.style.display = "none";
  document.body.classList.remove("modal-open");
  document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
  return true;
}

const ModalSignOut = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const pendingRef = useRef(false);

  const handleLogout = () => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    const modalEl = document.getElementById(MODAL_ID);

    // ✅ limpia sesión primero
    clearAuthSession();

    // ✅ toast inmediato (se ve antes de navegar)
    showToast({
      message: "Session closed successfully 👋",
      type: "success",
      icon: CheckCircle2,
      duration: 1600,
    });

    // ✅ navegación fluida al cerrar modal
    if (modalEl) {
      const onHidden = () => {
        modalEl.removeEventListener("hidden.bs.modal", onHidden);
        pendingRef.current = false;
        navigate("/", { replace: true });
      };

      modalEl.addEventListener("hidden.bs.modal", onHidden);

      const ok = hideModal(MODAL_ID);

      // fallback por si bootstrap falla
      if (!ok) {
        modalEl.removeEventListener("hidden.bs.modal", onHidden);
        pendingRef.current = false;
        navigate("/", { replace: true });
      }

      return;
    }

    // si el modal no está
    pendingRef.current = false;
    navigate("/", { replace: true });
  };

  return (
    <div
      className="modal fade"
      id={MODAL_ID}
      tabIndex="-1"
      aria-labelledby="modalExitLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content mcSignOutModal">
          <div className="mcPanelCard mcSignOutPanel">
            {/* HEADER */}
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

            {/* FOOTER */}
            <div className="mcPanelHead mcSignOutFooter">
              <div className="mcPanelHeadLeft" />

              <div className="mcPanelHeadRight d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-memory d-flex align-items-center gap-2"
                  data-bs-dismiss="modal"
                >
                  <CircleX size={18} />
                  Close
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger d-flex align-items-center justify-content-center pbtn-fix gap-2"
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalSignOut;