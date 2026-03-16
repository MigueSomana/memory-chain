import React, { useRef, useState } from "react";
import axios from "axios";
import {
  Crown,
  GraduationCap,
  Building2,
  Rocket,
  Check,
  CircleX,
  Sparkles,
  BadgeCheck,
  LoaderCircle,
} from "lucide-react";
import {
  getAuthActor,
  getAuthHeaders,
  getAuthInstitution,
  getAuthRole,
  getAuthToken,
  getIdInstitution,
  saveAuthSession,
} from "../../utils/authSession";
import { useToast } from "../../utils/toast";

const MODAL_ID = "modalUpgradePlan";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return false;

  const instance = window.bootstrap?.Modal?.getInstance(el);
  if (instance) {
    instance.hide();
    return true;
  }

  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
  el.style.display = "none";
  document.body.classList.remove("modal-open");
  document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
  return true;
}

const ModalUpgradePlan = () => {
  const { showToast } = useToast();
  const pendingRef = useRef(false);

  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: "free",
      badge: "CURRENT",
      title: "Researcher",
      price: "Free",
      period: "",
      description: "For individual researchers getting started",
      icon: GraduationCap,
      popular: false,
      features: [
        "Upload up to 3 theses",
        "Basic verification",
        "Public profile",
        "Community access",
      ],
    },
    {
      id: "basic",
      badge: "",
      title: "Institution",
      price: "$99",
      period: "/mo",
      description: "For universities and research centers",
      icon: Building2,
      popular: true,
      features: [
        "Unlimited uploads",
        "Priority verification",
        "Advanced analytics",
        "API access",
        "Bulk certification",
      ],
    },
    {
      id: "enterprise",
      badge: "",
      title: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored solutions for large organizations",
      icon: Rocket,
      popular: false,
      features: [
        "Everything in Institution",
        "Dedicated support",
        "Custom integrations",
        "Private repositories",
        "SLA guarantee",
      ],
    },
  ];

  const handleUpgrade = async () => {
    if (pendingRef.current || loading) return;

    if (selectedPlan === "free") {
      showToast({
        message: "You are already on the Free plan.",
        type: "info",
        icon: Sparkles,
      });
      return;
    }

    const actor = getAuthActor();
    const institutionId = getIdInstitution();
    const currentInstitution = getAuthInstitution();
    const token = getAuthToken();
    const role = getAuthRole();

    if (actor !== "institution") {
      showToast({
        message: "Only institutions can upgrade their plan.",
        type: "warning",
        icon: CircleX,
      });
      return;
    }

    if (!institutionId) {
      console.log("DEBUG auth actor:", actor);
      console.log("DEBUG institution from storage:", currentInstitution);
      console.log("DEBUG institutionId:", institutionId);
      console.log("DEBUG token:", token);

      showToast({
        message: "Institution not found in the current session.",
        type: "danger",
        icon: CircleX,
      });
      return;
    }

    try {
      pendingRef.current = true;
      setLoading(true);

      const payload = {
        isMember: true,
        canVerify: true,
      };

      const { data } = await axios.put(
        `${API_BASE_URL}/api/institutions/${institutionId}`,
        payload,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (token) {
        saveAuthSession({
          token,
          role: role || "INSTITUTION",
          actor: "institution",
          institution: {
            ...(currentInstitution || {}),
            ...(data || {}),
            isMember: true,
            canVerify: true,
            selectedPlan,
          },
        });
      }

      hideModal(MODAL_ID);

      showToast({
        message: `Plan upgraded successfully: ${
          selectedPlan === "basic" ? "Institution" : "Enterprise"
        }.`,
        type: "success",
        icon: BadgeCheck,
      });
    } catch (error) {
      console.error("Upgrade plan error:", error);

      showToast({
        message:
          error?.response?.data?.message ||
          "Could not upgrade the plan right now.",
        type: "danger",
        icon: CircleX,
      });
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade"
      id={MODAL_ID}
      tabIndex="-1"
      aria-labelledby="modalUpgradePlanLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
    >
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content mcUpgradeModal">
          <div className="mcPanelCard mcUpgradePanel">
            <div className="mcPanelHead mcUpgradeHead">
              <div className="mcPanelHeadLeft">
                <div className="mcUpgradeIconBox" aria-hidden="true">
                  <Crown size={20} />
                </div>

                <div className="mcUpgradeTitles">
                  <h5 id="modalUpgradePlanLabel" className="m-0">
                    Upgrade Your Plan
                  </h5>
                  <span className="mcPanelSub m-0">
                    Unlock more features
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mcSheetCloseBtn"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mcPanelBody mcUpgradeBody">
              <div className="mcUpgradePlansGrid">
                {plans.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.id;
                  const isCurrent = plan.id === "free";

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={[
                        "mcUpgradePlanCard",
                        isSelected ? "is-selected" : "",
                        isCurrent ? "is-current" : "",
                      ]
                        .join(" ")
                        .trim()}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {plan.popular ? (
                        <div className="mcUpgradePopularTag">POPULAR</div>
                      ) : null}

                      <div className="mcUpgradePlanTop">
                        <div className="mcUpgradePlanIcon">
                          <Icon size={18} />
                        </div>

                        {plan.badge ? (
                          <span className="mcUpgradeCurrentBadge">
                            {plan.badge}
                          </span>
                        ) : null}
                      </div>

                      <div className="mcUpgradePlanTitle">{plan.title}</div>

                      <div className="mcUpgradePriceRow">
                        <span className="mcUpgradePrice">{plan.price}</span>
                        {plan.period ? (
                          <span className="mcUpgradePeriod">{plan.period}</span>
                        ) : null}
                      </div>

                      <p className="mcUpgradeDesc">{plan.description}</p>

                      <div className="mcUpgradeFeatureList">
                        {plan.features.map((feature) => (
                          <div className="mcUpgradeFeatureItem" key={feature}>
                            <span className="mcUpgradeFeatureCheck">
                              <Check size={15} />
                            </span>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mcUpgradeFooterWrap">
              <button
                type="button"
                className="mcUpgradeSubmitBtn"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={18} className="mcSpin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {selectedPlan === "free" ? "Current Plan" : "Upgrade Plan"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalUpgradePlan;