import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import img404 from "../../assets/img404.gif";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <section
      className="min-vh-100 d-flex align-items-center justify-content-center px-3"
      style={{ background: "var(--mc-bg)" }}
    >
      <div className="text-center">
        <img
          src={img404}
          alt="404"
          className="img-fluid mb-4"
          style={{ maxWidth: "420px", width: "100%" }}
        />

        <h1
          className="fw-bold mb-2"
          style={{ color: "rgba(255,255,255,0.95)" }}
        >
          Page Not Found
        </h1>

        <p
          className="mb-4"
          style={{ color: "rgba(255,255,255,0.68)" }}
        >
          The page you are looking for does not exist or has been moved.
        </p>

        <button
          type="button"
          className="btn btn-outline-memory d-inline-flex align-items-center gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </section>
  );
};

export default NotFound;