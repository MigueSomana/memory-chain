import React, { useRef, useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getAuthToken } from "../../utils/authSession";
import { useToast } from "../../utils/toast";
import {
  Camera,
  Copy,
  Check,
  Layers,
  Plus,
  X,
  Users,
  UserRoundCog,
  Eye,
  EyeOff,
  LayersPlus,
  University,
  BookMarked,
  BadgeCheck,
  OctagonAlert,
  Wallet,
} from "lucide-react";

// ===================== CONFIG =====================
const API_BASE_URL = "http://localhost:4000/api";
const token = getAuthToken();

const TYPE_OPTIONS = [
  { value: "UNIVERSITY", label: "University" },
  { value: "COLLEGE", label: "College" },
  { value: "INSTITUTE", label: "Institute" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "OTHER", label: "Other" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeStatus = (s) => String(s || "PENDING").trim().toUpperCase();

const FormProfileU = ({ initialData: initialDataProp }) => {
  const { showToast } = useToast();

  // ===================== BASE =====================
  const [initialData, setInitialData] = useState(initialDataProp || null);
  const [loading, setLoading] = useState(!initialDataProp);
  const [loadError, setLoadError] = useState("");

  // Membership
  const isMember = Boolean(initialData?.isMember);

  // ===================== LOGO =====================
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  const pickLogo = () => fileInputRef.current?.click();

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/image\/(png|jpe?g|webp|svg\+xml)/.test(file.type)) {
      showToast({
        message: "Unsupported logo format. Use PNG/JPG/WebP/SVG.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast({
        message: "Logo must be less than 4MB.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  // ===================== FIELDS =====================
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const descRef = useRef(null);

  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [type, setType] = useState("");
  const [email, setEmail] = useState("");

  // ✅ Wallet (nuevo, igual que perfil de student)
  const [wallet, setWallet] = useState("");

  // Domains
  const [emailDomains, setEmailDomains] = useState([]);
  const [domainInput, setDomainInput] = useState("");

  const addDomain = () => {
    const val = domainInput.trim();
    if (!val) return;

    const exists = emailDomains.some(
      (d) => String(d?.value || "").toLowerCase() === val.toLowerCase(),
    );
    if (exists) return;

    setEmailDomains((prev) => [...prev, { value: val }]);
    setDomainInput("");
  };

  const removeDomain = (valueToRemove) => {
    setEmailDomains((prev) => prev.filter((d) => d.value !== valueToRemove));
  };

  // Departments
  const [departments, setDepartments] = useState([]);
  const [deptInput, setDeptInput] = useState("");
  const [deptAlert, setDeptAlert] = useState("");

  const addDepartment = () => {
    const val = deptInput.trim();
    if (!val) return;

    const exists = departments.some(
      (d) => String(d?.name || "").toLowerCase() === val.toLowerCase(),
    );
    if (exists) {
      setDeptAlert(`The department "${val}" is already in the list.`);
      return;
    }

    setDepartments((prev) => [...prev, { name: val }]);
    setDeptInput("");
    setDeptAlert("");
  };

  const removeDepartment = (nameToRemove) => {
    setDepartments((prev) => prev.filter((d) => d.name !== nameToRemove));
  };

  // Security
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Copy ID pill
  const [idCopied, setIdCopied] = useState(false);
  const instId = initialData?._id || "";

  const copyInstId = async () => {
    if (!instId) return;
    try {
      await navigator.clipboard.writeText(instId);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 900);
      showToast({
        message: "Institution ID copied to clipboard",
        type: "success",
        icon: BadgeCheck,
        duration: 1800,
      });
    } catch {
      showToast({
        message: "Could not copy the institution ID.",
        type: "error",
        icon: OctagonAlert,
        duration: 2400,
      });
    }
  };

  // Errors
  const [errors, setErrors] = useState({});

  // ✅ Stats calculadas según tu regla:
  // - Theses: todas las tesis con institution = esta institución AND status = APPROVED
  // - Students: users que tengan a la institución y su status para esa institución = APPROVED
  const [approvedThesisCount, setApprovedThesisCount] = useState(null);
  const [approvedStudentsCount, setApprovedStudentsCount] = useState(null);

  // ===================== TEXTAREA AUTO-GROW =====================
  const autoGrowDescription = () => {
    const el = descRef.current;
    if (!el) return;

    el.style.height = "auto";
    const max = 220; // px
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  };

  // ===================== LOAD (if no props) =====================
  useEffect(() => {
    if (initialDataProp) {
      setInitialData(initialDataProp);
      setLoading(false);
      return;
    }

    const fetchInstitution = async () => {
      try {
        if (!token) {
          setLoadError("No auth token found. Please log in again.");
          setLoading(false);
          return;
        }

        // Extract institutionId from JWT (best-effort)
        let institutionId = null;
        try {
          const [, payloadB64] = token.split(".");
          const payloadJson = JSON.parse(atob(payloadB64));
          institutionId =
            payloadJson.institutionId ||
            payloadJson.institutionID ||
            payloadJson.institution_id ||
            null;
        } catch (err) {
          console.error("Error decoding token", err);
        }

        if (!institutionId) {
          setLoadError("No institution id found in token.");
          setLoading(false);
          return;
        }

        const res = await axios.get(
          `${API_BASE_URL}/institutions/${institutionId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setInitialData(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("Error loading institution profile.");
        setLoading(false);
      }
    };

    fetchInstitution();
  }, [initialDataProp]);

  // ===================== SYNC =====================
  useEffect(() => {
    if (!initialData) return;

    setLogoPreview(initialData.logoUrl || "");
    setName(initialData.name || "");
    setDescription(initialData.description || "");
    setCountry(initialData.country || "");
    setWebsite(initialData.website || "");
    setType(initialData.type || "");
    setEmail(initialData.email || "");
    setWallet(initialData.wallet || "");

    const instDepts = (initialData.departments || []).map((d) =>
      typeof d === "string" ? { name: d } : d,
    );
    setDepartments(instDepts);

    const instDomains = (initialData.emailDomains || []).map((d) =>
      typeof d === "string" ? { value: d } : d,
    );
    setEmailDomains(instDomains);
  }, [initialData]);

  useEffect(() => {
    autoGrowDescription();
  }, [description]);

  // ===================== FETCH APPROVED COUNTS =====================
  const fetchApprovedCounts = async (institutionId) => {
    try {
      // 1) Theses aprobadas de la institución (usa tus routes: GET /theses/institution/:idInstitution)
      const thesesRes = await axios.get(
        `${API_BASE_URL}/theses/institution/${institutionId}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );

      const thesesList = Array.isArray(thesesRes.data)
        ? thesesRes.data
        : Array.isArray(thesesRes.data?.items)
          ? thesesRes.data.items
          : Array.isArray(thesesRes.data?.theses)
            ? thesesRes.data.theses
            : [];

      const approvedTheses = thesesList.filter(
        (t) => normalizeStatus(t?.status) === "APPROVED",
      );

      setApprovedThesisCount(approvedTheses.length);

      // 2) Students aprobados para esa institución:
      //    Intento endpoints comunes (no me diste tu route de users):
      //    - GET /users (y filtramos en front)
      //    - fallback: GET /users/institution/:id (si existe)
      //
      //    Regla: user.educationalEmails[{institution, status}] con status APPROVED
      //           (y que tenga esa institución)
      let usersList = [];
      try {
        const usersRes = await axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        usersList = Array.isArray(usersRes.data)
          ? usersRes.data
          : Array.isArray(usersRes.data?.items)
            ? usersRes.data.items
            : Array.isArray(usersRes.data?.users)
              ? usersRes.data.users
              : [];
      } catch (e1) {
        // fallback típico
        try {
          const usersRes2 = await axios.get(
            `${API_BASE_URL}/users/institution/${institutionId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          usersList = Array.isArray(usersRes2.data)
            ? usersRes2.data
            : Array.isArray(usersRes2.data?.items)
              ? usersRes2.data.items
              : Array.isArray(usersRes2.data?.users)
                ? usersRes2.data.users
                : [];
        } catch (e2) {
          usersList = [];
        }
      }

      const approvedUsers = usersList.filter((u) => {
        const edu = Array.isArray(u?.educationalEmails) ? u.educationalEmails : [];
        return edu.some((entry) => {
          const inst =
            typeof entry?.institution === "string"
              ? entry.institution
              : entry?.institution?._id;

          if (!inst || inst !== institutionId) return false;

          const st = normalizeStatus(entry?.status || "PENDING");
          return st === "APPROVED";
        });
      });

      setApprovedStudentsCount(approvedUsers.length);
    } catch (err) {
      console.error(err);
      showToast({
        message: "Could not load institution stats.",
        type: "error",
        icon: OctagonAlert,
        duration: 2400,
      });
    }
  };

  useEffect(() => {
    if (!initialData?._id) return;
    fetchApprovedCounts(initialData._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?._id]);

  // ===================== VALIDATE =====================
  const validate = () => {
    const e = {};

    if (!name.trim()) e.name = "Name is required.";
    if (!country.trim()) e.country = "Country is required.";
    if (!type) e.type = "Institution type is required.";
    if (!email.trim()) e.email = "Primary email is required.";
    if (!website.trim()) e.website = "Website is required.";

    if (email && !EMAIL_RE.test(email)) e.email = "Invalid email.";

    if (website) {
      try {
        new URL(website.startsWith("http") ? website : `https://${website}`);
      } catch {
        e.website = "Invalid URL.";
      }
    }

    if (password || confirm) {
      if ((password || "").length < 8) e.password = "At least 8 characters.";
      if (password !== confirm) e.confirm = "Passwords do not match.";
    }

    setErrors(e);

    if (Object.keys(e).length > 0) {
      showToast({
        message: Object.values(e)[0],
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
    }

    return Object.keys(e).length === 0;
  };

  // ===================== SUBMIT =====================
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    if (!initialData?._id) {
      showToast({
        message: "Institution data not loaded yet.",
        type: "error",
        icon: OctagonAlert,
        duration: 2400,
      });
      return;
    }

    try {
      if (!token) {
        showToast({
          message: "No auth token found. Please log in again.",
          type: "error",
          icon: OctagonAlert,
          duration: 2400,
        });
        return;
      }

      const form = new FormData();

      if (logoFile) form.append("logo", logoFile);

      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("country", country.trim());
      form.append("website", website.trim());
      form.append("type", type);
      form.append("email", email.trim().toLowerCase());

      // ✅ wallet
      form.append("wallet", (wallet || "").trim());

      form.append("departments", JSON.stringify(departments.map((d) => d.name)));
      form.append("emailDomains", JSON.stringify(emailDomains.map((d) => d.value)));

      form.append("isMember", String(Boolean(initialData.isMember)));
      form.append("canVerify", String(Boolean(initialData.canVerify)));

      if (password) form.append("password", password);

      const res = await axios.put(
        `${API_BASE_URL}/institutions/${initialData._id}`,
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        message: "Institution profile updated successfully.",
        type: "success",
        icon: BadgeCheck,
        duration: 2200,
      });

      const updated = res.data;
      setInitialData(updated);

      if (updated.logoUrl) {
        setLogoPreview(updated.logoUrl);
        setLogoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      setPassword("");
      setConfirm("");

      // refresca counts con reglas nuevas
      fetchApprovedCounts(updated._id);
    } catch (err) {
      console.error("Update institution error:", err?.response?.data || err);
      showToast({
        message: err?.response?.data?.message || "Error updating institution profile.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
    }
  };

  // ===================== UI STATES =====================
  if (loading) return <div className="container py-2">Loading profile...</div>;
  if (loadError) return <div className="container py-2 text-danger">{loadError}</div>;

  const deptCount = departments.length;

  // ✅ ahora el display de stats sale de nuestros counts
  const displayCount = (v) => (v === null || v === undefined ? "—" : String(v));

  const thesisCountDisplay = displayCount(approvedThesisCount);
  const studentsCountDisplay = displayCount(approvedStudentsCount);

  return (
    <form className="mcProfileWrap" onSubmit={handleSubmit}>
      <div className="mcContainer">
        {/* ===================== HERO ===================== */}
        <section className="mcProfileHero">
          <div className="mcProfileHeroActions">
            <button
              type="button"
              className={`mcInstStatusPill mcIdPill ${
                isMember ? "is-active" : "is-inactive"
              } ${idCopied ? "is-copied" : ""}`}
              onClick={copyInstId}
              title="Copy institution id"
            >
              <span className="mcInstStatusDot" />
              <span className="mcIdText">{instId || "Institution ID"}</span>
              <span className="mcIdIcon">
                {idCopied ? <Check size={18} /> : <Copy size={18} />}
              </span>
            </button>
          </div>

          <div className="mcProfileHeroInner">
            {/* left: logo/avatar */}
            <div className="mcProfileHeroLeft">
              <div className="mcAvatarWrap">
                <div className="mcAvatar">
                  {logoPreview ? (
                    <img src={logoPreview} alt="institution logo" />
                  ) : (
                    <div className="mcAvatarFallback">
                      {(name?.[0] || "I").toUpperCase()}
                      {(name?.[1] || "").toUpperCase()}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="mcAvatarCamTL"
                  onClick={pickLogo}
                  title="Change logo"
                >
                  <Camera />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={onLogoChange}
                  hidden
                />
              </div>
            </div>

            {/* right: meta + stats */}
            <div className="mcProfileMeta">
              <h2 className="mcProfileName">{name || "—"}</h2>

              <div className="mcProfileStatsInline">
                <div className="mcStatCard2">
                  <div className="mcStatIcon">
                    <BookMarked />
                  </div>
                  <div className="mcStatText">
                    <div className="mcStatNum2">{thesisCountDisplay}</div>
                    <div className="mcStatLbl2">Theses</div>
                  </div>
                </div>

                <div className="mcStatCard2">
                  <div className="mcStatIcon">
                    <Users />
                  </div>
                  <div className="mcStatText">
                    <div className="mcStatNum2">{studentsCountDisplay}</div>
                    <div className="mcStatLbl2">Students</div>
                  </div>
                </div>

                <div className="mcStatCard2">
                  <div className="mcStatIcon">
                    <Layers />
                  </div>
                  <div className="mcStatText">
                    <div className="mcStatNum2">{deptCount}</div>
                    <div className="mcStatLbl2">Departments</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== ACCOUNT SETTINGS ===================== */}
        <section className="mcPanelCard mt-3">
          <div className="mcPanelHead">
            <div className="mcPanelHeadLeft">
              <div className="mcPanelIcon">
                <UserRoundCog />
              </div>
              <h5 className="m-0">Account settings</h5>
            </div>
          </div>

          <div className="mcPanelBody">
            <div className="row g-3">
              {/* Email */}
              <div className="col-12">
                <label className="form-label">Email</label>
                <input
                  className={`form-control mcProfileInput ${
                    errors.email ? "is-invalid" : ""
                  }`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@institution.edu"
                />
                {errors.email && (
                  <div className="invalid-feedback d-block">{errors.email}</div>
                )}
              </div>

              {/* ✅ Wallet (igual que student profile) */}
              <div className="col-12">
                <label className="form-label">Wallet</label>
                <div className="input-group mcWizardInputGroup">
                  <input
                    className="form-control mcProfileInput"
                    type="text"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
              </div>

              {/* Passwords */}
              <div className="col-md-6">
                <label className="form-label">New password</label>

                <div className="input-group mcWizardInputGroup">
                  <input
                    className={`form-control mcWizardInputGroupInput mcWizardKeyInput ${
                      errors.password ? "is-invalid" : ""
                    }`}
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-memory mcWizardKeyBtn"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    title={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errors.password && (
                  <div className="invalid-feedback d-block">{errors.password}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Confirm password</label>

                <div className="input-group mcWizardInputGroup">
                  <input
                    className={`form-control mcWizardInputGroupInput mcWizardKeyInput ${
                      errors.confirm ? "is-invalid" : ""
                    }`}
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat the password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-memory mcWizardKeyBtn"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    title={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errors.confirm && (
                  <div className="invalid-feedback d-block">{errors.confirm}</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== BASIC INFORMATION ===================== */}
        <section className="mcPanelCard mt-3">
          <div className="mcPanelHead">
            <div className="mcPanelHeadLeft">
              <div className="mcPanelIcon">
                <University />
              </div>
              <h5 className="m-0">Basic information</h5>
            </div>
          </div>

          <div className="mcPanelBody">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input
                  className={`form-control mcProfileInput ${
                    errors.name ? "is-invalid" : ""
                  }`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Institution name"
                  disabled
                />
                {errors.name && (
                  <div className="invalid-feedback d-block">{errors.name}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Country</label>
                <input
                  className={`form-control mcProfileInput ${
                    errors.country ? "is-invalid" : ""
                  }`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                />
                {errors.country && (
                  <div className="invalid-feedback d-block">{errors.country}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Institution type</label>

                <div className="dropdown mcSelectDd">
                  <button
                    className={`mcSelectBtn ${errors.type ? "is-invalid" : ""}`}
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <span className="mcSelectText">
                      {TYPE_OPTIONS.find((o) => o.value === type)?.label ??
                        "Select…"}
                    </span>
                    <span style={{ opacity: 0.75 }}>▾</span>
                  </button>

                  <ul className="dropdown-menu mcDropdownMenu">
                    {TYPE_OPTIONS.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          className={`dropdown-item ${
                            type === opt.value ? "active" : ""
                          }`}
                          onClick={() => setType(opt.value)}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {errors.type && (
                  <div className="invalid-feedback d-block">{errors.type}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Website</label>
                <input
                  className={`form-control mcProfileInput ${
                    errors.website ? "is-invalid" : ""
                  }`}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="example.edu"
                />
                {errors.website && (
                  <div className="invalid-feedback d-block">{errors.website}</div>
                )}
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  ref={descRef}
                  className="form-control mcProfileTextarea mcTextareaDarkScroll"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  rows={4}
                />
              </div>

              <div className="col-12 mt-2">
                <label className="form-label">Email domains</label>

                <div className="input-group mcWizardInputGroup mcInstGroupMatchKey">
                  <input
                    className="form-control mcWizardInputGroupInput"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="e.g., university.edu"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-memory mcInstInputGroupBtn mcInstBtnMatchKey"
                    onClick={addDomain}
                    disabled={!domainInput.trim()}
                    title="Add domain"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="mt-3 d-flex flex-wrap gap-2">
                  {emailDomains.length === 0 ? (
                    <div className="mcEmptyState">No email domains added.</div>
                  ) : (
                    emailDomains.map((d, idx) => (
                      <span key={`${d.value}-${idx}`} className="mcInstChip">
                        <span className="mcInstChipText">{d.value}</span>
                        <button
                          type="button"
                          className="mcInstChipX"
                          onClick={() => removeDomain(d.value)}
                          title="Remove"
                        >
                          <X size={16} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== DEPARTMENTS ===================== */}
        <section className="mcPanelCard mt-3">
          <div className="mcPanelHead">
            <div className="mcPanelHeadLeft">
              <div className="mcPanelIcon">
                <LayersPlus />
              </div>
              <h5 className="m-0">Departments</h5>
            </div>
          </div>

          <div className="mcPanelBody">
            <label className="form-label">Add a department</label>

            <div className="input-group mcWizardInputGroup mcInstGroupMatchKey">
              <input
                className="form-control mcWizardInputGroupInput mcInstInputGroupInput"
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                placeholder="e.g., Computer Science"
              />
              <button
                type="button"
                className="btn btn-outline-memory mcInstInputGroupBtn mcInstBtnMatchKey"
                onClick={addDepartment}
                disabled={!deptInput.trim()}
                title="Add department"
              >
                <Plus size={18} />
              </button>
            </div>

            {deptAlert && (
              <div className="mt-3 alert alert-warning py-2">{deptAlert}</div>
            )}

            <div className="mt-3 d-flex flex-wrap gap-2">
              {departments.length === 0 ? (
                <div className="mcEmptyState">No departments added.</div>
              ) : (
                departments.map((d, idx) => (
                  <span key={`${d.name}-${idx}`} className="mcInstChip">
                    <span className="mcInstChipText">{d.name}</span>
                    <button
                      type="button"
                      className="mcInstChipX"
                      onClick={() => removeDepartment(d.name)}
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ===================== FOOTER ===================== */}
        <div className="mcProfileFooterActions">
          <button
            type="button"
            className="btn btn-outline-memory"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-memory">
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
};

export default FormProfileU;