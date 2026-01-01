import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import GifLoad from "../assets/gifloader.gif";

const RouteLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const t = setTimeout(() => {
      setLoading(false);
    }, 650); // duración del loader

    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <>
      {/* LOADER */}
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(2px)",
          }}
        >
          <img
            src={GifLoad}
            alt="Loading"
            style={{
              width: 140,
              height: 140,
              objectFit: "contain",
            }}
          />
        </div>
      )}

      {/* RUTAS */}
      <Outlet />
    </>
  );
};

export default RouteLoader;
