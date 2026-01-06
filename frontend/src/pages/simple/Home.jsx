import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarInit from "../../components/navbar/NavbarInit";

export default function Home() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState("q1");

  // =========================
  // TESTIMONIALS (10 total)
  // =========================
  const TESTIMONIALS = useMemo(
    () => [
      {
        img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=70",
        person: "Nina Wulandari",
        institution: "University of Northbridge",
        comment:
          "Verification requests dropped immediately. Recruiters confirm authenticity in seconds—no back-and-forth.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=300&q=70",
        person: "Dr. Luis Herrera",
        institution: "Instituto San Gabriel",
        comment:
          "Institution-issued proof feels official. The audit trail is clean and consistent across departments.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=70",
        person: "Amelia Chen",
        institution: "Global Research Council",
        comment:
          "Tamper-evidence is clear: altered PDFs fail instantly. It’s a modern standard for academic trust.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1557053910-d9eadeed1c58?auto=format&fit=crop&w=300&q=70",
        person: "Sara Gómez",
        institution: "Civic Engineering Faculty",
        comment:
          "The verification link is simple to share and keeps working. Our process is finally standardized.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1524503033411-f6e7a9f1b39f?auto=format&fit=crop&w=300&q=70",
        person: "Marcus Reed",
        institution: "Northlake University",
        comment:
          "Less manual validation, more confidence. Fits governance and long-term archiving requirements.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=300&q=70",
        person: "Valentina Ruiz",
        institution: "Politécnico Central",
        comment:
          "A clear credibility signal: institution-backed certification beats screenshots and emails.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=300&q=70",
        person: "Omar Al-Sayed",
        institution: "International Tech Institute",
        comment:
          "Cross-border verification is finally straightforward. Consistent results even years later.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=300&q=70",
        person: "Camila Duarte",
        institution: "Universidad Andina",
        comment:
          "Easy to explain to non-technical staff: hash + certificate. No debates—just proof.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=300&q=70",
        person: "Ethan Park",
        institution: "Brighton College",
        comment:
          "IPFS + on-chain proof gives a resilient record. A real step up from classic repositories.",
        stars: 5,
      },
      {
        img: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=300&q=70",
        person: "Aisha Khan",
        institution: "Metropolitan University",
        comment:
          "Fast, reliable, and simple. Verification became a 10-second routine for our registry team.",
        stars: 5,
      },
    ],
    []
  );

  // =========================
  // FAQ (igual que About)
  // =========================
  const FAQ = useMemo(
    () => [
      {
        id: "q1",
        q: "Is my thesis publicly visible?",
        a: "Visibility depends on your institution settings and your profile rules. What remains verifiable is the integrity proof (hash + certificate).",
      },
      {
        id: "q2",
        q: "What does 'Certified' mean on MemoryChain?",
        a: "It means an authorized institution approved the thesis and an on-chain certificate was issued linking the hash + IPFS CID to a blockchain transaction.",
      },
      {
        id: "q3",
        q: "What happens if the PDF changes?",
        a: "Any modification generates a different hash, so it won't match the certified record. This is how tampering is detected instantly.",
      },
      {
        id: "q4",
        q: "Do I need crypto or a wallet?",
        a: "No. The certification flow is handled by the platform/institution. You simply share a verification link when needed.",
      },
      {
        id: "q5",
        q: "How can someone verify a thesis fast?",
        a: "Use the Verify page with file hash or tx hash and check status + on-chain certificate details.",
      },
    ],
    []
  );

  // =========================
  // ✅ Testimonials: scroll 1-by-1 + loop correcto
  // =========================
  const trackRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [maxStartIdx, setMaxStartIdx] = useState(0); // ✅ el último inicio válido

  const getStepPx = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const first = track.querySelector(".mc-miniCardWrap");
    if (!first) return 0;

    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  };

  const computeMaxStartIndex = () => {
    const track = trackRef.current;
    if (!track) return 0;

    const step = getStepPx();
    if (!step) return 0;

    const visible = Math.max(1, Math.floor(track.clientWidth / step)); // ✅ cuántas caben
    const maxStart = Math.max(0, TESTIMONIALS.length - visible);
    return maxStart;
  };

  const scrollToIndex = (idx) => {
    const track = trackRef.current;
    if (!track) return;

    const step = getStepPx();
    if (!step) return;

    const max = maxStartIdx;

    // ✅ wrap según maxStartIdx real
    let target = idx;
    if (target > max) target = 0;
    if (target < 0) target = max;

    track.scrollTo({ left: step * target, behavior: "smooth" });
    setActiveIdx(target);
  };

  const nextOne = () => scrollToIndex(activeIdx + 1);
  const prevOne = () => scrollToIndex(activeIdx - 1);

  // ✅ recalcular maxStartIdx en mount y resize
  useEffect(() => {
    const calc = () => setMaxStartIdx(computeMaxStartIndex());
    calc();

    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TESTIMONIALS.length]);

  // ✅ detect index con clamp para no “pasarse” del max
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const step = getStepPx();
        if (!step) return;

        const raw = Math.round(track.scrollLeft / step);
        const clamped = Math.max(0, Math.min(raw, maxStartIdx));
        if (clamped !== activeIdx) setActiveIdx(clamped);
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [activeIdx, maxStartIdx]);

  // ✅ autoplay con loop real
  useEffect(() => {
    const id = setInterval(() => {
      scrollToIndex(activeIdx + 1);
    }, 6500);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, maxStartIdx]);

  // ✅ número de dots = posiciones de inicio (maxStartIdx + 1)
  const dots = useMemo(() => {
    return Array.from({ length: maxStartIdx + 1 }, (_, i) => i);
  }, [maxStartIdx]);

  return (
    <>
      <NavbarInit variant="glass" />

      {/* HERO */}
      <section className="background-home text-white">
        <div className="container-fluid">
          <div className="row justify-content-end">
            <div className="col-md-10 col-lg-6 bg-shadow">
              <h1 className="display-5 fw-bold text-end spaced-fix">
                Memory Chain
              </h1>

              <p className="lead text-end mb-4 spaced-fix">
                <i>
                  Discover verified and certified research across institutions,
                  fields of study, and keywords
                </i>
              </p>

              <div className="d-grid gap-2 d-sm-flex justify-content-sm-end spaced-fix">
                <button
                  type="button"
                  className="btn btn-memory btn-lg px-4 gap-3"
                  data-bs-toggle="modal"
                  data-bs-target="#modalLogin"
                >
                  Start Now
                </button>

                <button
                  type="button"
                  className="btn btn-outline-memory btn-lg px-4"
                >
                  View Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mc-home-testimonialsMini">
        <div className="container">
          <div className="mc-home-testimonialsHead">
            <h2 className="fw-bold mb-2">Testimonials</h2>

            <div className="mc-miniControls">
              <button
                type="button"
                className="mc-miniBtn"
                onClick={prevOne}
                aria-label="Previous testimonial"
              >
                ‹
              </button>
              <button
                type="button"
                className="mc-miniBtn"
                onClick={nextOne}
                aria-label="Next testimonial"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mc-miniViewport">
            <div ref={trackRef} className="mc-miniTrack">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="mc-miniCardWrap">
                  <TestimonialCard t={t} />
                </div>
              ))}
            </div>
          </div>

          {/* Dots (posiciones de inicio) */}
          <div className="mc-miniDotsRow" aria-label="Testimonials pagination">
            {dots.map((i) => (
              <button
                key={i}
                type="button"
                className={`mc-miniDot ${i === activeIdx ? "isActive" : ""}`}
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to testimonials position ${i + 1}`}
                aria-current={i === activeIdx ? "true" : "false"}
              />
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
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

      {/* FAQ */}
      <section className="mc-about-faq bg-mc-dark">
        <div className="container">
          <h2 className="fw-bold mb-2 text-white">FAQ</h2>
          <div
            className="mc-about-muted mb-3"
            style={{ color: "rgba(255,255,255,.72)" }}
          >
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
                  For onboarding or technical questions, start from verification.
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

/* =====================
   COMPONENTS
   ===================== */
function TestimonialCard({ t }) {
  return (
    <div className="mc-miniCard">
      <div className="mc-miniQuote">
        <span className="mc-miniQuoteMark">“</span>
        <span className="mc-miniText">{t.comment}</span>
      </div>

      <div className="mc-miniFooter">
        <div className="mc-miniAvatarWrap">
          <img src={t.img} alt={t.person} className="mc-miniAvatar" />
        </div>

        <div className="mc-miniMeta">
          <div className="mc-miniName">{t.person}</div>
          <div className="mc-miniSub">
            <span className="mc-miniOrg">{t.institution}</span>
          </div>
        </div>

        <div className="mc-miniStars" title={`${t.stars}/5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`mc-star ${i < (t.stars || 0) ? "isOn" : ""}`}
            >
              ★
            </span>
          ))}
        </div>
      </div>
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
          {subtitle ? <div className="mc-about-stepSubW">{subtitle}</div> : null}
        </div>
      </div>
    </div>
  );
}
