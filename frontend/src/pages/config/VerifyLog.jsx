import React, { useEffect, useState } from "react";
import NavbarReal from "../../components/navbar/NavbarReal";
import Layout from "../../components/layout/LayoutPrivado";
import Verify from "../simple/Verify";
import { ShieldCheck } from "lucide-react";
import { getAuthToken } from "../../utils/authSession";

// Componente: Verify Certificate
const VerifyLog = () => {
  const [auth, setAuth] = useState(() => ({
    token: getAuthToken(),
  }));

  useEffect(() => {
    const sync = () => {
      setAuth({
        token: getAuthToken(),
      });
    };

    sync();

    window.addEventListener("storage", sync);
    const t = window.setInterval(sync, 800);

    return () => {
      window.removeEventListener("storage", sync);
      window.clearInterval(t);
    };
  }, []);

  const isLogged = Boolean(auth.token);

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {isLogged && <NavbarReal />}

      <div className="flex-grow-1">
        <Layout
          title="Verify Certificate"
          showID
          showBackDashboard={isLogged}
          icon={<ShieldCheck />}
        >
          <Verify />
        </Layout>
      </div>
    </div>
  );
};

export default VerifyLog;