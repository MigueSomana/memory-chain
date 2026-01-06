// AboutUs.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarInit from "../../components/navbar/NavbarInit";
import { EyeIcon, SecureIcon, ToolsIcon } from "../../utils/icons";
import AboutBanner from "../../assets/about.png";
import yesornot from "../../assets/background.png";

export default function AboutUs() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState("q1");

  const goStart = () => navigate("/explore");

  // ✅ Feature cards con enfoque en beneficios (vs alternativas)
  const FEATURES = useMemo(
    () => [
      {
        title: "Institution-Issued Certification",
        text: "Certificates are issued and controlled by authorized institutions—not self-claimed by users—ensuring academic legitimacy and institutional authority.",
        icon: EyeIcon,
      },
      {
        title: "Blockchain-Anchored Integrity",
        text: "Once approved, each thesis is anchored on blockchain, creating an immutable integrity record that protects the institution against disputes and tampering.",
        icon: EyeIcon,
      },
      {
        title: "Tamper-Evident Encryption",
        text: "Any modification changes the cryptographic fingerprint instantly, making altered PDFs, screenshots, or fake copies fail verification.",
        icon: EyeIcon,
      },
      {
        title: "IPFS-Backed Long-Term Access",
        text: "Theses are stored via decentralized IPFS addressing, ensuring continued access and verification even if internal systems change over time.",
        icon: EyeIcon,
      },
    ],
    []
  );

  const FAQ = useMemo(
    () => [
      {
        id: "q1",
        q: "Is my thesis publicly visible?",
        a: "Visibility depends on institution settings and your profile rules. What remains verifiable is the integrity proof (hash + certificate).",
      },
      {
        id: "q2",
        q: "What does “Certified” mean on MemoryChain?",
        a: "It means an authorized institution approved the thesis and an on-chain certificate was issued linking the file hash + CID to a blockchain record.",
      },
      {
        id: "q3",
        q: "What happens if the PDF changes?",
        a: "Any modification creates a different fingerprint. The verification result will not match the certified record—tampering becomes obvious.",
      },
      {
        id: "q4",
        q: "Do I need crypto or a wallet?",
        a: "No. The certification flow can be handled by the platform/institution. You share a verification link when needed.",
      },
      {
        id: "q5",
        q: "How can someone verify a thesis fast?",
        a: "Go to Verify and paste a file hash or transaction hash. You’ll see status and certificate details when available.",
      },
    ],
    []
  );

  return (
    <>
      <NavbarInit />

      {/* ================= HERO (white) ================= */}
      <section
        className="mc-about-heroW"
        style={{
          backgroundImage: `url(${AboutBanner})`,
          backgroundPosition: "right bottom",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100%",
        }}
      >
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-12 col-lg-7">
              <div className="mc-about-heroCardW">
                <div className="mc-about-kickerW">
                  <span className="mc-about-kickerDotW" />
                  Trusted academic preservation
                </div>

                <h1 className="fw-bold mb-2 mc-about-heroTitleW">
                  Academic work, verified and preserved.
                </h1>

                <p className="mc-about-heroTextW mb-4">
                  MemoryChain helps students and institutions publish theses
                  with integrity proof and verifiable certification—built to be
                  fast, trustworthy, and easy to validate.
                </p>

                <button
                  type="button"
                  className="btn btn-memory"
                  onClick={goStart}
                >
                  Start now
                </button>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              {/* espacio para ilustración si luego quieres */}
              <div className="mc-about-heroSideHint">
                Verification that feels instant—trust that feels official.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES (6 cards white) ================= */}
      <section className="mc-about-featuresW">
        <div className="container">
          <div className="mc-about-sectionHead">
            <h2 className="fw-bold mb-1">Why MemoryChain</h2>
            <div className="mc-about-mutedW">
              Stronger proof, clearer trust, simpler workflow.
            </div>
          </div>

          <div className="row g-4 mt-1">
            {FEATURES.map((f, idx) => (
              <div className="col-12 col-sm-3" key={idx}>
                <FeatureCard title={f.title} text={f.text} icon={f.icon} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS (white) ================= */}
      <section className="mc-about-howW">
        <div className="container">
          <div className="row align-items-start gy-4">
            <div className="col-12 col-lg-6">
              <h2 className="fw-bold mb-2">How it works</h2>
              <div className="mc-about-mutedW mb-3">
                A clean workflow from upload to certification—built for
                real-world trust.
              </div>

              <StepPro
                n="01"
                title="Upload your thesis"
                subtitle="We generate a cryptographic fingerprint and prepare the verification record."
              />
              <StepPro
                n="02"
                title="Institution review"
                subtitle="Authorized reviewers validate authorship, metadata, and submission details."
              />
              <StepPro
                n="03"
                title="Certification issued"
                subtitle="When approved, the certificate is anchored for strong, checkable integrity."
              />
              <StepPro
                n="04"
                title="Share and verify"
                subtitle="Anyone can verify using a link, file fingerprint, or transaction ID."
              />
            </div>

            <div className="col-12 col-lg-6">
              <div className="mc-about-videoBgW">
                <div className="mc-about-videoWrapW">
                  <div className="mc-about-videoRatioW">
                    <iframe
                      title="MemoryChain video"
                      src="https://www.youtube.com/embed/nPMc6QUjKsw"
                      className="mc-about-iframeW"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST + PROBLEMS (white + background image + overlay) ================= */}
      <section
        className="mc-about-trustW"
        style={{ "--trust-bg": `url(${yesornot})` }}
      >
        <div className="container">
          <div className="row gy-4">
            {/* TRUST */}
            <div className="col-12 col-lg-6">
              <div className="mc-about-panel mc-about-panel--left">
                {/* ICONO SUPERIOR DERECHO */}
                <div className="mc-about-panelIcon mc-about-panelIcon--right">
                  {SecureIcon}
                </div>

                <div className="mc-about-panelHead">
                  <div className="mc-about-sideHeader mc-about-sideHeaderLeft">
                    <div className="mc-about-sideLine" />
                    <h2 className="fw-bold mb-0">Trust &amp; Security</h2>
                  </div>

                  <p className="mc-about-mutedW mt-2 mb-0">
                    Built to make falsification obvious and verification
                    effortless.
                  </p>
                </div>

                <ul className="mc-about-bullets mc-about-bulletsLeft mc-wowList">
                  <li className="mc-wowItem">
                    <div className="mc-wowBody">
                      <div className="mc-wowTitle">
                        Fingerprint-based integrity
                      </div>
                      <div className="mc-wowText">
                        If the document changes, verification fails—no debates,
                        no guesswork.
                      </div>
                    </div>
                  </li>

                  <li className="mc-wowItem">
                    <div className="mc-wowBody">
                      <div className="mc-wowTitle">
                        Content-addressable access
                      </div>
                      <div className="mc-wowText">
                        Access is linked to the content identity, not a fragile
                        server path.
                      </div>
                    </div>
                  </li>

                  <li className="mc-wowItem">
                    <div className="mc-wowBody">
                      <div className="mc-wowTitle">
                        Institution-issued credibility
                      </div>
                      <div className="mc-wowText">
                        Certification is controlled by authorized
                        institutions—reducing fake credentials.
                      </div>
                    </div>
                  </li>

                  <li className="mc-wowItem">
                    <div className="mc-wowBody">
                      <div className="mc-wowTitle">
                        Audit-friendly verification
                      </div>
                      <div className="mc-wowText">
                        Anyone can validate in seconds with consistent results.
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* PROBLEMS */}
            <div className="col-12 col-lg-6">
              <div className="mc-about-panel mc-about-panel--right">
                {/* ICONO SUPERIOR IZQUIERDO */}
                <div className="mc-about-panelIcon mc-about-panelIcon--left">
                  {ToolsIcon}
                </div>

                <div className="mc-about-panelHead mc-about-panelHead--right">
                  <div className="mc-about-sideHeader mc-about-sideHeaderRight">
                    <h2 className="fw-bold mb-0 text-end">Problems we solve</h2>
                    <div className="mc-about-sideLine" />
                  </div>

                  <p className="mc-about-mutedW mt-2 mb-0 text-end">
                    Designed for everyday academic validation—not just theory.
                  </p>
                </div>

                <ul className="mc-about-bullets mc-about-bulletsRight mc-wowList mc-wowList--right">
                  <li className="mc-wowItem mc-wowItem--right">
                    <div className="mc-wowBody mc-wowBody--right">
                      <div className="mc-wowTitle text-end">
                        Fake PDFs &amp; screenshots
                      </div>
                      <div className="mc-wowText text-end">
                        Proof checks the real file identity—not an image or
                        claim.
                      </div>
                    </div>
                  </li>

                  <li className="mc-wowItem mc-wowItem--right">
                    <div className="mc-wowBody mc-wowBody--right">
                      <div className="mc-wowTitle text-end">
                        Files that disappear
                      </div>
                      <div className="mc-wowText text-end">
                        Designed for resilient access and long-term
                        verification.
                      </div>
                    </div>
                  </li>

                  <li className="mc-wowItem mc-wowItem--right">
                    <div className="mc-wowBody mc-wowBody--right">
                      <div className="mc-wowTitle text-end">
                        Slow manual validation
                      </div>
                      <div className="mc-wowText text-end">
                        Reduce back-and-forth: verify in seconds with consistent
                        results.
                      </div>
                    </div>
                  </li>

                  <li className="mc-wowItem mc-wowItem--right">
                    <div className="mc-wowBody mc-wowBody--right">
                      <div className="mc-wowTitle text-end">
                        Cross-border trust gaps
                      </div>
                      <div className="mc-wowText text-end">
                        A universal verification layer helps credibility travel
                        with the thesis.
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ (dark) ================= */}
      <section className="mc-about-faq bg-mc-dark">
        <div className="container">
          <h2 className="fw-bold mb-2 text-white">FAQ</h2>
          <div className="mc-about-mutedDark mb-3">
            Answers to the most common questions.
          </div>

          <div className="row">
            <div className="col-12 col-lg-9">
              <div className="mc-about-faqCard">
                {FAQ.map((item) => {
                  const open = openFaq === item.id;
                  return (
                    <div key={item.id} className="mc-about-faqRow">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? "" : item.id)}
                        className="mc-about-faqBtn"
                      >
                        <span className="mc-about-faqQ">{item.q}</span>
                        <span className="mc-about-faqToggle">
                          {open ? "−" : "+"}
                        </span>
                      </button>

                      {open ? (
                        <div className="mc-about-faqA">{item.a}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-12 col-lg-3">
              <div className="mc-about-sideBox">
                <div className="mc-about-sideBoxTitle">Need help?</div>
                <div className="mc-about-sideBoxText">
                  For onboarding or technical questions, start from
                  verification.
                </div>
                <button
                  type="button"
                  className="btn btn-outline-memory btn-extend"
                  onClick={() => navigate("/verify")}
                >
                  Go to Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ================= COMPONENTS ================= */

function FeatureCard({ title, text, icon }) {
  return (
    <div className="mc-about-featureCardW">
      <div className="mc-about-featureIconW d-flex justify-content-center">
        {icon}
      </div>
      <div className="mc-about-featureTitleW text-center">{title}</div>
      <div className="mc-about-featureTextW text-center">{text}</div>
    </div>
  );
}

function StepPro({ n, title, subtitle }) {
  return (
    <div className="mc-about-stepW">
      <div className="d-flex align-items-start gap-3">
        <div className="mc-about-stepBubbleW">
          <span className="mc-about-stepNumW">{n}</span>
        </div>

        <div className="flex-grow-1">
          <div className="mc-about-stepTitleW">{title}</div>
          {subtitle ? (
            <div className="mc-about-stepSubW">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
