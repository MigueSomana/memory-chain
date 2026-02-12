import React, { useMemo } from "react";
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
} from "lucide-react";

const Home = () => {
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
            <span className="mcHomeBrandIcon">
              <LayoutGrid size={18} />
            </span>
            <span className="mcHomeBrandText">Memory-Chain</span>
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

          <div className="mcHomeNavRight">
            <button type="button" className="btn btn-memory mcHomeLoginBtn">
              Login
            </button>
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
            <span>Blockchain-Powered Academic Verification</span>
          </div>

          <h1 className="mcHomeHeroTitle">
            <span className="mcHomeHeroTitleTop">The Future of</span>{" "}
            <span className="mcHomeHeroTitleAccent">Academic Integrity</span>
          </h1>

          <p className="mcHomeHeroSub">
            Memory-Chain certifies, verifies, and preserves academic research on
            the blockchain — ensuring your work is tamper-proof and globally
            recognized.
          </p>

          <div className="mcHomeHeroActions">
            <button type="button" className="btn btn-memory mcHomeCtaBtn">
              Get Started <ArrowRight size={16} />
            </button>
            <button type="button" className="btn btn-outline-memory mcHomeGhostBtn">
              How It Works <ArrowRight size={16} />
            </button>
          </div>

          <div className="mcHomeStats">
            <div className="mcHomeStat">
              <div className="mcHomeStatValue">12K+</div>
              <div className="mcHomeStatLabel">Theses Verified</div>
            </div>
            <div className="mcHomeStat">
              <div className="mcHomeStatValue">150+</div>
              <div className="mcHomeStatLabel">Institutions</div>
            </div>
            <div className="mcHomeStat">
              <div className="mcHomeStatValue">99.9%</div>
              <div className="mcHomeStatLabel">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* SEE IT IN ACTION */}
      <section className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">SEE IT IN ACTION</div>
          <h2 className="mcHomeH2">
            How <span className="mcHomeAccent">Memory-Chain</span> Works
          </h2>
          <p className="mcHomeLead">
            Watch how institutions and researchers use our platform to certify
            and verify academic work.
          </p>

          <div className="mcHomeVideoCard">
            <button type="button" className="mcHomePlayBtn" aria-label="Play">
              <Play size={18} />
            </button>
            <div className="mcHomeVideoCaption">Platform Demo — Coming Soon</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">PLATFORM FEATURES</div>
          <h2 className="mcHomeH2">
            Everything You Need for{" "}
            <span className="mcHomeAccent">Academic Trust</span>
          </h2>

          <div className="mcHomeGrid3">
            <FeatureCard
              icon={Fingerprint}
              title="Blockchain Certification"
              desc="Each thesis is hashed and recorded on-chain, creating an immutable proof of authenticity."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Instant Verification"
              desc="Verify any document in seconds using its unique hash — no account required."
            />
            <FeatureCard
              icon={Building2}
              title="Institutional Management"
              desc="Universities manage members, approve submissions, and track certifications from one dashboard."
            />
            <FeatureCard
              icon={Search}
              title="Academic Discovery"
              desc="Explore a global repository of verified theses across institutions and disciplines."
            />
            <FeatureCard
              icon={Users}
              title="Member Governance"
              desc="Approve or reject researchers, assign roles, and maintain institutional standards."
            />
            <FeatureCard
              icon={Lock}
              title="Tamper-Proof Records"
              desc="Once certified, records cannot be altered, ensuring lifelong document integrity."
            />
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section id="verification" className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">HOW IT WORKS</div>
          <h2 className="mcHomeH2">
            Verification in <span className="mcHomeAccent">4 Simple</span> Steps
          </h2>

          <div className="mcHomeSteps">
            <StepCard n="01" title="Upload Document" desc="Submit your thesis file to generate a unique cryptographic hash." />
            <StepCard n="02" title="Institutional Review" desc="Your institution reviews and approves the submission." />
            <StepCard n="03" title="On-Chain Certification" desc="The hash is recorded on the blockchain with a timestamp." />
            <StepCard n="04" title="Public Verification" desc="Anyone can verify the document's authenticity instantly." />
          </div>

          <div className="mcHomeCenter">
            <button type="button" className="btn btn-outline-memory mcHomeTryBtn">
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
            Plans That <span className="mcHomeAccent">Scale</span> With You
          </h2>
          <p className="mcHomeLead">
            From individual researchers to large institutions — choose the plan
            that fits your needs.
          </p>

          <div className="mcHomePricing">
            <PriceCard
              title="Researcher"
              subtitle="For individual academics"
              price="Free"
              priceNote=""
              bullets={[
                "Up to 3 thesis uploads",
                "Public verification link",
                "Basic academic profile",
                "Community support",
              ]}
              cta="Get Started Free"
              variant="ghost"
            />

            <PriceCard
              title="Institution"
              subtitle="For universities & labs"
              price="$99"
              priceNote="/month"
              badge="MOST POPULAR"
              bullets={[
                "Unlimited thesis uploads",
                "Member management dashboard",
                "Institutional branding",
                "Batch certification",
                "Analytics & reporting",
                "Priority support",
              ]}
              cta="Start Free Trial"
              variant="primary"
            />

            <PriceCard
              title="Enterprise"
              subtitle="For consortiums & networks"
              price="Custom"
              priceNote=""
              bullets={[
                "Everything in Institution",
                "Multi-campus deployment",
                "Custom API integrations",
                "SLA & dedicated account manager",
                "White-label options",
                "On-premise available",
              ]}
              cta="Contact Sales"
              variant="ghost"
              disabled
            />
          </div>

          <h3 className="mcHomeH3">Power-Up With <span className="mcHomeAccent">Add-ons</span></h3>

          <div className="mcHomeAddons">
            <AddonCard icon={BarChart3} price="$29/mo" title="Advanced Analytics" desc="Deep insights into verification trends & institutional metrics." />
            <AddonCard icon={Globe} price="$49/mo" title="API Access" desc="RESTful API to integrate Memory-Chain into your existing systems." />
            <AddonCard icon={BookOpen} price="$19/mo" title="Bulk Certification" desc="Certify up to 500 theses per batch with automated workflows." />
            <AddonCard icon={Lock} price="$39/mo" title="Private Repository" desc="Keep theses private with restricted access and embargo periods." />
          </div>
        </div>
      </section>

      {/* TWO MISSIONS */}
      <section className="mcHomeSection">
        <div className="mcHomeSectionInner">
          <div className="mcHomeKicker">BUILT FOR YOU</div>
          <h2 className="mcHomeH2">
            One Platform, <span className="mcHomeAccent">Two Missions</span>
          </h2>
          <p className="mcHomeLead">
            Whether you're an institution seeking to modernize certification or a
            researcher protecting your life's work.
          </p>

          <div className="mcHomeTwoCols">
            <MissionCard
              icon={FileCheck2}
              title="For Institutions"
              subtitle="Enterprise-grade academic infrastructure"
              bullets={[
                "Automated thesis certification pipeline",
                "Real-time member & submission management",
                "Institutional analytics & reporting dashboard",
                "API integration with existing systems",
                "White-label deployment options",
                "Dedicated institutional support",
              ]}
              cta="Request Institutional Demo"
              variant="primary"
            />

            <MissionCard
              icon={GraduationCap}
              title="For Researchers"
              subtitle="Your work, permanently verified"
              bullets={[
                "Permanent proof of your research work",
                "Global visibility across institutions",
                "One-click verification sharing",
                "Build your verified academic portfolio",
                "Cross-institutional recognition",
                "Free document verification forever",
              ]}
              cta="Create Free Account"
              variant="ghost"
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
          <h2 className="mcHomeFinalTitle">Ready to Secure Your Research?</h2>
          <p className="mcHomeFinalSub">
            Join hundreds of institutions and thousands of researchers who trust
            Memory-Chain for academic verification.
          </p>
          <button type="button" className="btn btn-memory mcHomeFinalBtn">
            Start Now — It's Free <ArrowRight size={16} />
          </button>
        </div>

        <footer className="mcHomeFooter">
          <div className="mcHomeFooterInner">
            <div className="mcHomeFooterBrand">
              <span className="mcHomeFooterIcon">
                <LayoutGrid size={16} />
              </span>
              <span className="mcHomeFooterText">Memory-Chain</span>
            </div>

            <div className="mcHomeFooterLinks">
              <button type="button" className="mcHomeFooterLink" onClick={() => scrollTo("features")}>
                Features
              </button>
              <button type="button" className="mcHomeFooterLink" onClick={() => scrollTo("verification")}>
                Verification
              </button>
              <button type="button" className="mcHomeFooterLink" onClick={() => scrollTo("about")}>
                About
              </button>
            </div>

            <div className="mcHomeFooterCopy">© 2024 Memory-Chain. All rights reserved.</div>
          </div>
        </footer>
      </section>
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
}) => (
  <div className={`mcHomePrice ${disabled ? "isDisabled" : ""} ${variant === "primary" ? "isPrimary" : ""}`}>
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
      className={`btn ${variant === "primary" ? "btn-memory" : "btn-outline-memory"} mcHomePriceBtn`}
      disabled={disabled}
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

const MissionCard = ({ icon: Icon, title, subtitle, bullets, cta, variant = "ghost" }) => (
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

    <button type="button" className={`btn ${variant === "primary" ? "btn-memory" : "btn-outline-memory"} mcHomeMissionBtn`}>
      {cta}
    </button>
  </div>
);

export default Home;