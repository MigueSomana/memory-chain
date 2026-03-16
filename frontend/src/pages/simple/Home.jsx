// Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ArrowRight,
  Play,
  Fingerprint,
  ShieldCheck,
  Building2,
  Search,
  Users,
  Lock,
  CheckCircle2,
  GraduationCap,
  FileCheck2,
  BarChart3,
  Globe,
  BookOpen,
  CircleX,
  UserRound,
  LogIn,
  Wallet,
  Database,
  Blocks,
} from "lucide-react";
import Logo from "../../assets/logo.png";
import {
  getAuthActor,
  getAuthToken,
  clearAuthSession,
} from "../../utils/authSession";

// ✅ MODALS
import ModalLogin from "../../components/modal/ModalLogIn";
import ModalRegister from "../../components/modal/ModalRegister";
import ModalRegisterInstitution from "../../components/modal/ModalRegisterInstitution";

// ✅ VERIFY
import Verify from "../simple/Verify";

const Home = () => {
  const navigate = useNavigate();

  const [isLogged, setIsLogged] = useState(false);
  const [actor, setActor] = useState(null);
  const [prefillEmail, setPrefillEmail] = useState("");

  useEffect(() => {
    const t = getAuthToken();
    const a = getAuthActor();

    if (t && !a) {
      clearAuthSession();
      setIsLogged(false);
      setActor(null);
      return;
    }

    setIsLogged(!!t && !!a);
    setActor(a);
  }, []);

  const profileHref =
    actor === "institution" ? "/profile-institution" : "/profile-personal";

  const nav = useMemo(
    () => [
      { id: "home", label: "Home" },
      { id: "features", label: "Features" },
      { id: "pricing", label: "Pricing" },
      { id: "verification", label: "Verification" },
      { id: "about", label: "About Us" },
    ],
    []
  );

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openBsModal = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const anyOpen = document.querySelector(".modal.show");
    if (anyOpen && anyOpen.id !== id) {
      const openInst = window.bootstrap?.Modal?.getInstance(anyOpen);
      openInst?.hide();
    }

    const inst = window.bootstrap?.Modal?.getOrCreateInstance(el, {
      backdrop: "static",
      keyboard: false,
    });
    inst?.show();
  };

  const goGetStarted = () => {
    if (isLogged) {
      navigate(profileHref);
      return;
    }
    openBsModal("modalLogin");
  };

  const onClickLogin = () => {
    openBsModal("modalLogin");
  };

  const onClickVerify = () => {
    openBsModal("modalVerify");
  };

  const LoginIcon = isLogged ? UserRound : LogIn;

  return (
    <div className="mcHome">
      {/* NAVBAR */}
      <header className="mcHomeNav">
        <div className="mcHomeNavInner">
          <button
            type="button"
            className="mcHomeBrand"
            onClick={() => scrollTo("home")}
            aria-label="Memory-Chain"
          >
            <div>
              <img src={Logo} alt="Memory-Chain" width={150} />
            </div>
          </button>

          <nav className="mcHomeNavLinks" aria-label="Primary">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                className="mcHomeNavLink"
                onClick={() => scrollTo(n.id)}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="mcHomeNavRight d-flex align-items-center gap-2">
            {isLogged ? (
              <Link to={profileHref} className="btn btn-memory mcHomeLoginBtn">
                <LoginIcon size={16} className="mx-1" />
                Profile
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-memory mcHomeLoginBtn"
                onClick={onClickLogin}
              >
                Login
                <LoginIcon size={16} className="mx-1" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="mcHomeHero">
        <div className="mcHomeGridGlow" aria-hidden="true" />
        <div className="mcHomeHeroInner">
          <div className="mcHomePill">
            <span className="mcHomePillIcon">
              <ShieldCheck size={14} />
            </span>
            <span>Blockchain-Powered Thesis Publication & Verification</span>
          </div>

          <h1 className="mcHomeHeroTitle">
            <span className="mcHomeHeroTitleTop">Protect, Certify and</span>{" "}
            <span className="mcHomeHeroTitleAccent">Preserve Academic Research</span>
          </h1>

          <p className="mcHomeHeroSub">
            Memory-Chain is a web platform for thesis publication,
            institutional certification, and public verification, combining
            blockchain, decentralized storage, and cryptographic integrity to
            strengthen academic trust.
          </p>

          <div className="mcHomeHeroActions">
            <button
              type="button"
              className="btn btn-memory mcHomeCtaBtn"
              onClick={goGetStarted}
            >
              Get Started <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="btn btn-outline-memory mcHomeGhostBtn"
              onClick={() => scrollTo("demo")}
            >
              How It Works <ArrowRight size={16} />
            </button>
          </div>

          <div className="mcHomeStats">
            <div className="mcHomeStat">
              <div className="mcHomeStatValue">Web2 + Web3</div>
              <div className="mcHomeStatLabel">Hybrid Architecture</div>
            </div>
            <div className="mcHomeStat">
              <div className="mcHomeStatValue">IPFS + Polygon</div>
              <div className="mcHomeStatLabel">Decentralized Stack</div>
            </div>
            <div className="mcHomeStat">
              <div className="mcHomeStatValue">Public</div>
              <div className="mcHomeStatLabel">Open Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* SEE IT IN ACTION */}
      <section id="demo" className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">SEE IT IN ACTION</div>
          <h2 className="mcHomeH2">
            How <span className="mcHomeAccent">Memory-Chain</span> Works
          </h2>
          <p className="mcHomeLead">
            A complete flow for publishing theses, generating cryptographic
            evidence, issuing institutional certification, and enabling public
            verification.
          </p>

          <div className="mcHomeVideoCard">
            <button type="button" className="mcHomePlayBtn" aria-label="Play">
              <Play size={18} />
            </button>
            <div className="mcHomeVideoCaption">
              Platform Demo — Coming Soon
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">PLATFORM FEATURES</div>
          <h2 className="mcHomeH2">
            Built for <span className="mcHomeAccent">Academic Trust</span>
          </h2>

          <div className="mcHomeGrid3">
            <FeatureCard
              icon={Fingerprint}
              title="Blockchain Certification"
              desc="Each certified thesis is linked to an immutable on-chain record through its cryptographic hash."
            />
            <FeatureCard
              icon={Database}
              title="Decentralized Preservation"
              desc="Documents are stored through decentralized infrastructure to improve integrity, traceability, and long-term access."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Public Verification"
              desc="Anyone can verify the authenticity of a thesis by comparing its document fingerprint against the registered evidence."
            />
            <FeatureCard
              icon={Building2}
              title="Institutional Workflow"
              desc="Institutions can review, certify, and manage academic submissions from a dedicated dashboard."
            />
            <FeatureCard
              icon={Users}
              title="Member Management"
              desc="Approve researchers, manage institutional members, and maintain academic standards across the platform."
            />
            <FeatureCard
              icon={Wallet}
              title="Institutional Wallet"
              desc="Paid institutional plans unlock wallet-based certification capabilities for blockchain-backed validation."
            />
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section id="verification" className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">HOW IT WORKS</div>
          <h2 className="mcHomeH2">
            Verification in <span className="mcHomeAccent">4 Steps</span>
          </h2>

          <div className="mcHomeSteps">
            <StepCard
              n="01"
              title="Publish Thesis"
              desc="The author uploads the thesis and its metadata into the platform."
            />
            <StepCard
              n="02"
              title="Generate Integrity Evidence"
              desc="A cryptographic hash is created as a unique fingerprint of the uploaded document."
            />
            <StepCard
              n="03"
              title="Institutional Certification"
              desc="The institution validates the thesis and registers the certification through blockchain-enabled workflow."
            />
            <StepCard
              n="04"
              title="Open Verification"
              desc="The public can verify authenticity and detect alterations through the registered evidence."
            />
          </div>

          <div className="mcHomeCenter">
            <button
              type="button"
              className="btn btn-outline-memory mcHomeTryBtn"
              onClick={onClickVerify}
            >
              <ShieldCheck size={16} />
              Try Verification Now
            </button>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">PRICING</div>
          <h2 className="mcHomeH2">
            Institutional Plans That <span className="mcHomeAccent">Scale</span>
          </h2>
          <p className="mcHomeLead">
            Authors publish under a free plan, while institutions unlock
            certification capacity based on their verification volume.
          </p>

          <div className="mcHomePricing">
            <PriceCard
              title="Researcher"
              subtitle="For authors and academic researchers"
              price="Free"
              priceNote=""
              bullets={[
                "Register and publish theses",
                "Public consultation and verification",
                "Personal academic profile",
                "Access to the platform at no cost",
              ]}
              cta="Get Started Free"
              variant="ghost"
              onCta={goGetStarted}
            />

            <PriceCard
              title="Institution Basic"
              subtitle="For universities with standard certification needs"
              price="$99"
              priceNote="/month"
              badge="MOST POPULAR"
              bullets={[
                "Blockchain certification enabled",
                "Academic metrics",
                "Institutional wallet",
                "Member management",
                "Up to 1,500 verifiable theses per year",
                "Standard technical support",
              ]}
              cta="Upgrade to Basic"
              variant="primary"
              onCta={goGetStarted}
            />

            <PriceCard
              title="Institution Pro"
              subtitle="For institutions with higher certification demand"
              price="$249"
              priceNote="/month"
              bullets={[
                "Blockchain certification enabled",
                "Academic metrics",
                "Institutional wallet",
                "Member management",
                "More than 1,500 verifiable theses per year",
                "Priority technical support",
              ]}
              cta="Upgrade to Pro"
              variant="ghost"
              onCta={goGetStarted}
            />
          </div>

          <h3 className="mcHomeH3">
            Add-ons for <span className="mcHomeAccent">Peak Demand</span>
          </h3>

          <div className="mcHomeAddons">
            <AddonCard
              icon={Blocks}
              price="$29"
              title="Extra Certification Package"
              desc="Add 1,000 extra certifications for institutions that need additional verification capacity."
            />
            <AddonCard
              icon={BarChart3}
              price="Included in paid plans"
              title="Academic Metrics"
              desc="Track certification activity and institutional usage with integrated academic metrics."
            />
            <AddonCard
              icon={Wallet}
              price="Included in paid plans"
              title="Institutional Wallet"
              desc="Enable the wallet layer required for institution-driven certification workflows."
            />
            <AddonCard
              icon={Globe}
              price="Included platform feature"
              title="Public Verification"
              desc="Keep consultation and verification accessible through an open and transparent experience."
            />
          </div>
        </div>
      </section>

      {/* TWO MISSIONS */}
      <section className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">BUILT FOR YOU</div>
          <h2 className="mcHomeH2">
            One Platform, <span className="mcHomeAccent">Two Core Roles</span>
          </h2>
          <p className="mcHomeLead">
            Memory-Chain supports both the author who wants to protect academic
            authorship and the institution that needs a trustworthy certification
            workflow.
          </p>

          <div className="mcHomeTwoCols">
            <MissionCard
              icon={FileCheck2}
              title="For Institutions"
              subtitle="Certification, governance, and academic trust"
              bullets={[
                "Institutional review and certification workflow",
                "Member approval and internal governance",
                "Academic metrics and traceability",
                "Institutional wallet support",
                "Scalable certification capacity",
                "Standard or priority support depending on plan",
              ]}
              cta="Start as Institution"
              variant="primary"
              onCta={goGetStarted}
            />

            <MissionCard
              icon={GraduationCap}
              title="For Researchers"
              subtitle="Publication, visibility, and proof of integrity"
              bullets={[
                "Publish theses on a dedicated platform",
                "Preserve authorship through document fingerprinting",
                "Allow public consultation and verification",
                "Build a visible academic profile",
                "Access core functions under the free plan",
                "Protect research against unnoticed alteration",
              ]}
              cta="Create Free Account"
              variant="ghost"
              onCta={goGetStarted}
            />
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">ABOUT</div>
          <h2 className="mcHomeH2">
            About <span className="mcHomeAccent">Memory-Chain</span>
          </h2>
          <p className="mcHomeLead">
            Memory-Chain is a hybrid academic platform designed to modernize
            thesis management through publication, institutional certification,
            public verification, and decentralized preservation of knowledge.
          </p>

          <div className="mcHomeGrid3">
            <FeatureCard
              icon={BookOpen}
              title="Academic Integrity"
              desc="Protects thesis authenticity and strengthens trust in academic production."
            />
            <FeatureCard
              icon={Search}
              title="Traceability"
              desc="Connects metadata, cryptographic evidence, and verification flow in a single ecosystem."
            />
            <FeatureCard
              icon={Lock}
              title="Tamper Detection"
              desc="Makes document alterations detectable through hash comparison and immutable certification evidence."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA + FOOTER */}
      <section className="mcHomeFinal">
        <div className="mcHomeFinalInner">
          <div className="mcHomeFinalIcon">
            <LayoutGrid size={22} />
          </div>
          <h2 className="mcHomeFinalTitle">
            Ready to Modernize Thesis Certification?
          </h2>
          <p className="mcHomeFinalSub">
            Publish, certify, verify, and preserve academic work with a platform
            designed for integrity, traceability, and institutional trust.
          </p>
          <button
            type="button"
            className="btn btn-memory mcHomeFinalBtn"
            onClick={goGetStarted}
          >
            Start Now <ArrowRight size={16} />
          </button>
        </div>

        <footer className="mcHomeFooter">
          <div className="mcHomeFooterInner">
            <div className="mcHomeFooterBrand">
              <img
                src={Logo}
                alt="Memory-Chain"
                className="mcHomeFooterLogo"
              />
            </div>

            <div className="mcHomeFooterCopy">
              © 2024 Memory-Chain. All rights reserved.
            </div>
          </div>
        </footer>
      </section>

      {/* AUTH MODALS */}
      <ModalLogin
        modalId="modalLogin"
        registerModalId="registerModal"
        prefillEmail={prefillEmail}
      />

      <ModalRegister
        modalId="registerModal"
        loginModalId="modalLogin"
        institutionRegisterModalId="registerInstitutionModal"
        onRegistered={({ email }) => setPrefillEmail(email || "")}
      />

      <ModalRegisterInstitution
        modalId="registerInstitutionModal"
        userRegisterModalId="registerModal"
      />

      <ModalVerify modalId="modalVerify" />
    </div>
  );
};

const ModalVerify = ({ modalId = "modalVerify" }) => {
  const hideModal = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const inst = window.bootstrap?.Modal?.getInstance(el);
    if (inst) inst.hide();
    else el.classList.remove("show");
  };

  return (
    <div
      className="modal fade"
      id={modalId}
      tabIndex={-1}
      aria-hidden="true"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      style={{ zIndex: 1100 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content mcSheetModal">
          <div className="mcPanelCard mcSheetPanel mcVerifyPanel">
            <button
              type="button"
              className="mcLoginCloseBtn"
              onClick={() => hideModal(modalId)}
              aria-label="Close"
              title="Close"
            >
              <CircleX size={22} />
            </button>

            <div className="mcPanelBody mcSheetBody mcVerifyBody mt-2">
              <Verify />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="mcHomeCard">
    <div className="mcHomeCardIcon">
      <Icon size={18} />
    </div>
    <div className="mcHomeCardTitle">{title}</div>
    <div className="mcHomeCardDesc">{desc}</div>
  </div>
);

const StepCard = ({ n, title, desc }) => (
  <div className="mcHomeStep">
    <div className="mcHomeStepNum">{n}</div>
    <div className="mcHomeStepTitle">{title}</div>
    <div className="mcHomeStepDesc">{desc}</div>
  </div>
);

const PriceCard = ({
  title,
  subtitle,
  price,
  priceNote,
  bullets,
  cta,
  variant = "ghost",
  badge,
  disabled = false,
  onCta,
}) => (
  <div
    className={`mcHomePrice ${disabled ? "isDisabled" : ""} ${
      variant === "primary" ? "isPrimary" : ""
    }`}
  >
    {badge ? <div className="mcHomePriceBadge">{badge}</div> : null}

    <div className="mcHomePriceTop">
      <div className="mcHomePriceTitle">{title}</div>
      <div className="mcHomePriceSub">{subtitle}</div>
    </div>

    <div className="mcHomePriceValue">
      <span className="mcHomePriceAmount">{price}</span>
      {priceNote ? <span className="mcHomePriceNote">{priceNote}</span> : null}
    </div>

    <ul className="mcHomePriceList">
      {bullets.map((b) => (
        <li key={b}>
          <CheckCircle2 size={16} />
          <span>{b}</span>
        </li>
      ))}
    </ul>

    <button
      type="button"
      className={`btn ${
        variant === "primary" ? "btn-memory" : "btn-outline-memory"
      } mcHomePriceBtn`}
      disabled={disabled}
      onClick={disabled ? undefined : onCta}
    >
      {cta}
    </button>
  </div>
);

const AddonCard = ({ icon: Icon, price, title, desc }) => (
  <div className="mcHomeAddon">
    <div className="mcHomeAddonIcon">
      <Icon size={18} />
    </div>
    <div className="mcHomeAddonMeta">
      <div className="mcHomeAddonPrice">{price}</div>
      <div className="mcHomeAddonTitle">{title}</div>
      <div className="mcHomeAddonDesc">{desc}</div>
    </div>
  </div>
);

const MissionCard = ({
  icon: Icon,
  title,
  subtitle,
  bullets,
  cta,
  variant = "ghost",
  onCta,
}) => (
  <div className={`mcHomeMission ${variant === "primary" ? "isPrimary" : ""}`}>
    <div className="mcHomeMissionHead">
      <div className="mcHomeMissionIcon">
        <Icon size={18} />
      </div>
      <div>
        <div className="mcHomeMissionTitle">{title}</div>
        <div className="mcHomeMissionSub">{subtitle}</div>
      </div>
    </div>

    <ul className="mcHomeMissionList">
      {bullets.map((b) => (
        <li key={b}>
          <CheckCircle2 size={16} />
          <span>{b}</span>
        </li>
      ))}
    </ul>

    <button
      type="button"
      className={`btn ${
        variant === "primary" ? "btn-memory" : "btn-outline-memory"
      } mcHomeMissionBtn`}
      onClick={onCta}
    >
      {cta}
    </button>
  </div>
);

export default Home;