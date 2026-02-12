import React, { useMemo, useRef, useState, useEffect } from "react";
import { getAuthToken } from "../../utils/authSession";
import { useToast } from "../../utils/toast";
import axios from "axios";
import {
  University,
  UserRoundCog,
  Camera,
  BookMarked,
  Quote,
  Heart,
  Check,
  SquarePlus,
  Copy,
  Eye,
  EyeOff,
  SquarePen,
  X,
  Delete,
  BadgeCheck,
  Clock3,
  OctagonAlert,
  Wallet,
} from "lucide-react";

// ===================== CONFIG =====================
const API_BASE_URL = "http://localhost:4000/api";
const token = getAuthToken();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeStatus = (s) =>
  String(s || "PENDING")
    .trim()
    .toUpperCase();

// ===================== STATUS PILL (sin dot) =====================
const StatusPill = ({ status }) => {
  const up = normalizeStatus(status);

  let label = "Pending";
  let cls = "mcSheetStatus mcSheetStatus--pending";
  let Icon = Clock3;

  if (up === "APPROVED" || up === "VERIFIED") {
    label = "Verified";
    cls = "mcSheetStatus mcSheetStatus--approved";
    Icon = BadgeCheck;
  } else if (up === "REJECTED") {
    label = "Rejected";
    cls = "mcSheetStatus mcSheetStatus--rejected";
    Icon = OctagonAlert;
  } else {
    label = "Pending";
    cls = "mcSheetStatus mcSheetStatus--pending";
    Icon = Clock3;
  }

  return (
    <div className={cls} title={label}>
      <span className="mcSheetStatusText">{label}</span>
      <span className="mcSheetStatusIcon">
        <Icon size={12} />
      </span>
    </div>
  );
};

const FormProfile = () => {
  const { showToast } = useToast();

  const [initialData, setInitialData] = useState(null);
  const [institutionOptions, setInstitutionOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Imagen
  const [imgPreview, setImgPreview] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const fileInputRef = useRef(null);

  const pickImage = () => fileInputRef.current?.click();

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
      showToast({
        message: "Unsupported image format. Use PNG/JPG/WebP.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast({
        message: "Image must be less than 3MB.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
      return;
    }

    setImgFile(file);
    const reader = new FileReader();
    reader.onload = () => setImgPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  // Datos
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");

  // Stats (desde tesis)
  const [thesisCount, setThesisCount] = useState(0);
  const [citationsTotal, setCitationsTotal] = useState(0);
  const [likesTotal, setLikesTotal] = useState(0);

  // Copy ID pill
  const [idCopied, setIdCopied] = useState(false);
  const userId = initialData?._id || "";

  const copyUserId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 900);
      showToast({
        message: "User ID copied to clipboard",
        type: "success",
        icon: BadgeCheck,
        duration: 1800,
      });
    } catch {
      showToast({
        message: "Could not copy the user ID.",
        type: "error",
        icon: OctagonAlert,
        duration: 2400,
      });
    }
  };

  // Account settings (correo + password)
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Instituciones
  const [institutions, setInstitutions] = useState([]);

  // Mapas separados para email + status (status default PENDING)
  const [institutionEmails, setInstitutionEmails] = useState({});
  const [institutionEmailStatus, setInstitutionEmailStatus] = useState({});

  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [editingInstitutionId, setEditingInstitutionId] = useState("");
  const [showAddInst, setShowAddInst] = useState(false);

  // Validaciones
  const [errors, setErrors] = useState({});

  // Para saber cuáles son “nuevas” vs ya existían
  const initialInstitutionIdSet = useMemo(() => {
    const ids = new Set();
    if (!initialData) return ids;

    const eduEmails = initialData.educationalEmails || [];
    eduEmails.forEach((entry) => {
      if (!entry) return;
      const inst = entry.institution;
      if (typeof inst === "string") ids.add(inst);
      else if (inst && inst._id) ids.add(inst._id);
    });

    const insts = initialData.institutions || [];
    insts.forEach((inst) => {
      if (typeof inst === "string") ids.add(inst);
      else if (inst && inst._id) ids.add(inst._id);
    });

    return ids;
  }, [initialData]);

  // ===================== THESIS STATS (usa GET /theses) =====================
  const fetchMyThesesAndStats = async (user) => {
    try {
      const myId = user?._id;
      if (!myId) return;

      const r = await axios.get(`${API_BASE_URL}/theses`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const list = Array.isArray(r.data)
        ? r.data
        : Array.isArray(r.data?.items)
          ? r.data.items
          : Array.isArray(r.data?.theses)
            ? r.data.theses
            : [];

      // ✅ Cuenta tesis donde el user es:
      // - author (string / obj) o authors[]
      // - uploadBy / uploadby / uploadedBy / uploader (string / obj)
      // - (y mantiene fallbacks antiguos por compatibilidad)
      const isMine = (t) => {
        const candidates = [
          // antiguos / genéricos
          t?.user,
          t?.createdBy,
          t?.idUser,
          t?.owner,

          // author directo
          t?.author,

          // uploader variants (lo que pediste)
          t?.uploadBy,
          t?.uploadby,
          t?.uploadedBy,
          t?.uploader,
        ];

        for (const c of candidates) {
          if (!c) continue;
          if (typeof c === "string" && c === myId) return true;
          if (typeof c === "object" && c?._id === myId) return true;
        }

        // authors array
        if (Array.isArray(t?.authors)) {
          if (t.authors.some((a) => a === myId || a?._id === myId)) return true;
        }

        // a veces author puede venir como array (por si acaso)
        if (Array.isArray(t?.author)) {
          if (t.author.some((a) => a === myId || a?._id === myId)) return true;
        }

        return false;
      };

      const mine = list.filter(isMine);

      setThesisCount(mine.length);

      const cTotal = mine.reduce((acc, t) => {
        const q = Number(t?.quotes ?? t?.citations ?? 0);
        return acc + (Number.isFinite(q) ? q : 0);
      }, 0);
      setCitationsTotal(cTotal);

      const lTotal = mine.reduce((acc, t) => {
        const likesArr = Array.isArray(t?.likes) ? t.likes.length : null;
        const likesNum = Number(t?.likesCount ?? t?.likes ?? 0);
        const val =
          likesArr !== null
            ? likesArr
            : Number.isFinite(likesNum)
              ? likesNum
              : 0;
        return acc + val;
      }, 0);
      setLikesTotal(lTotal);
    } catch (err) {
      console.error(err);
      showToast({
        message: "Could not load thesis stats.",
        type: "error",
        icon: OctagonAlert,
        duration: 2400,
      });
    }
  };

  // ===================== LOAD PROFILE =====================
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          setLoadError("No auth token found. Please log in again.");
          setLoading(false);
          return;
        }

        const [userRes, instRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/institutions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const user = userRes.data;
        const allInstitutions = instRes.data;

        setInitialData(user);
        setInstitutionOptions(allInstitutions);

        setImgPreview(user.imgUrl || "");
        setName(user.name || "");
        setLastname(user.lastname || "");
        setEmail(user.email || "");
        setWallet(user.wallet || "");

        // educationalEmails -> emailMap + statusMap
        const eduEmails = user.educationalEmails || [];
        const emailMap = {};
        const statusMap = {};

        eduEmails.forEach((entry) => {
          const instId =
            typeof entry?.institution === "string"
              ? entry.institution
              : entry?.institution?._id;

          if (!instId) return;

          emailMap[instId] = (entry?.email || "").trim();
          statusMap[instId] = normalizeStatus(entry?.status || "PENDING");
        });

        setInstitutionEmails(emailMap);
        setInstitutionEmailStatus(statusMap);

        // instituciones del usuario (derivadas de educationalEmails para tu UI actual)
        const instIdsFromEdu = eduEmails
          .map((e) =>
            typeof e?.institution === "string"
              ? e.institution
              : e?.institution?._id,
          )
          .filter(Boolean);

        const userInsts = allInstitutions.filter((inst) =>
          instIdsFromEdu.includes(inst._id),
        );

        setInstitutions(userInsts);

        // Stats desde tesis
        fetchMyThesesAndStats(user);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("Error loading profile data.");
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingOptions = useMemo(() => {
    const selectedIds = new Set(institutions.map((i) => i._id));
    return institutionOptions.filter((opt) => !selectedIds.has(opt._id));
  }, [institutionOptions, institutions]);

  const addInstitution = () => {
    if (!selectedInstitutionId) return;

    const opt = institutionOptions.find((o) => o._id === selectedInstitutionId);
    if (!opt) return;

    setInstitutions((prev) => {
      if (prev.some((i) => i._id === opt._id)) return prev;
      return [...prev, opt];
    });

    // Al añadir: status PENDING por defecto
    setInstitutionEmailStatus((prev) => ({
      ...prev,
      [opt._id]: "PENDING",
    }));

    // Email vacío por defecto (si no existe)
    setInstitutionEmails((prev) => ({
      ...prev,
      [opt._id]: prev[opt._id] ?? "",
    }));

    setEditingInstitutionId(opt._id);
    setSelectedInstitutionId("");
    setShowAddInst(false);
  };

  const removeInstitution = (id) => {
    setInstitutions((prev) => prev.filter((i) => i._id !== id));

    setInstitutionEmails((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setInstitutionEmailStatus((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setEditingInstitutionId((prev) => (prev === id ? "" : prev));
  };

  // Si se modifica email -> vuelve a PENDING automáticamente
  const handleInstitutionEmailChange = (instId, value) => {
    setInstitutionEmails((prev) => ({ ...prev, [instId]: value }));
    setInstitutionEmailStatus((prev) => ({ ...prev, [instId]: "PENDING" }));
  };

  const validateBasic = () => {
    const e = {};

    if (!email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) e.email = "Invalid email format.";

    if (password || confirm) {
      const pwd = password || "";
      const conf = confirm || "";

      if (!pwd.trim()) e.password = "Password is required.";
      if (!conf.trim()) e.confirm = "Please confirm your password.";

      if (pwd.trim()) {
        if (pwd.length < 8)
          e.password = "Password must be at least 8 characters long.";

        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasDigit = /\d/.test(pwd);
        const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
        if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
          e.password =
            "Password must have uppercase, lowercase, a number and a symbol.";
        }
      }

      if (pwd && conf && pwd !== conf) e.confirm = "Passwords do not match.";
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

  const validateInstitutionEmails = () => {
    for (const [instId, eduEmailRaw] of Object.entries(institutionEmails)) {
      const eduEmail = (eduEmailRaw || "").trim();
      if (!eduEmail) continue;

      const institution = institutionOptions.find((i) => i._id === instId);
      if (!institution) continue;

      const atIndex = eduEmail.indexOf("@");
      if (atIndex === -1) {
        showToast({
          message: `The institutional email "${eduEmail}" for "${institution.name}" is invalid.`,
          type: "error",
          icon: OctagonAlert,
          duration: 3000,
        });
        return false;
      }

      const domain = eduEmail.slice(atIndex + 1).toLowerCase();
      const allowedDomains = (institution.emailDomains || []).map((d) =>
        String(d || "").toLowerCase(),
      );

      if (!allowedDomains.length) {
        showToast({
          message: `Institution "${institution.name}" has no configured email domains.`,
          type: "error",
          icon: OctagonAlert,
          duration: 3200,
        });
        return false;
      }

      if (!allowedDomains.includes(domain)) {
        showToast({
          message: `The email "${eduEmail}" does not match allowed domains for "${institution.name}" (${allowedDomains.join(
            ", ",
          )}).`,
          type: "error",
          icon: OctagonAlert,
          duration: 3500,
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();

    if (!validateBasic()) return;
    if (!validateInstitutionEmails()) return;

    if (!initialData) {
      showToast({
        message: "Profile not loaded yet.",
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

      if (imgFile) form.append("img", imgFile);

      form.append("name", name.trim());
      form.append("lastname", lastname.trim());
      form.append("email", email.trim().toLowerCase());
      form.append("wallet", (wallet || "").trim());

      if (password) form.append("password", password);

      const currentInstIds = institutions.map((i) => i._id);
      form.append("institutions", JSON.stringify(currentInstIds));

      // Payload educativo: incluye status; si no hay status -> PENDING
      const educationalEmailsPayload = Object.entries(institutionEmails)
        .map(([instId, eduEmailRaw]) => ({
          institution: instId,
          email: (eduEmailRaw || "").trim(),
          status: normalizeStatus(
            institutionEmailStatus?.[instId] || "PENDING",
          ),
        }))
        .filter((entry) => entry.email.length > 0);

      form.append(
        "educationalEmails",
        JSON.stringify(educationalEmailsPayload),
      );

      const res = await axios.put(`${API_BASE_URL}/users/me`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast({
        message: "Profile updated successfully.",
        type: "success",
        icon: BadgeCheck,
        duration: 2200,
      });

      const updatedUser = res.data;
      setInitialData(updatedUser);

      // refresca stats también
      fetchMyThesesAndStats(updatedUser);

      if (updatedUser.imgUrl) {
        setImgPreview(updatedUser.imgUrl);
        setImgFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      // Rehidrata status/email por si el backend actualizó (APPROVED/REJECTED/etc)
      const eduEmails = updatedUser.educationalEmails || [];
      const emailMap = {};
      const statusMap = {};
      eduEmails.forEach((entry) => {
        const instId =
          typeof entry?.institution === "string"
            ? entry.institution
            : entry?.institution?._id;

        if (!instId) return;

        emailMap[instId] = (entry?.email || "").trim();
        statusMap[instId] = normalizeStatus(entry?.status || "PENDING");
      });
      setInstitutionEmails(emailMap);
      setInstitutionEmailStatus(statusMap);

      setEditingInstitutionId("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      console.error(err);
      showToast({
        message: "Error updating profile.",
        type: "error",
        icon: OctagonAlert,
        duration: 2600,
      });
    }
  };

  if (loading) return <div className="container py-2">Loading profile...</div>;
  if (loadError)
    return <div className="container py-2 text-danger">{loadError}</div>;

  const publishedCount = thesisCount;
  const citationsCount = citationsTotal;
  const likesCount = likesTotal;

  return (
    <form className="mcProfileWrap" onSubmit={handleSubmit}>
      <div className="mcContainer">
        {/* ===================== HERO ===================== */}
        <section className="mcProfileHero">
          <div className="mcProfileHeroActions">
            <button
              type="button"
              className={`mcIdPill ${idCopied ? "is-copied" : ""}`}
              onClick={copyUserId}
              title="Copy user id"
            >
              <span className="mcIdText">{userId || "User ID"}</span>
              <span className="mcIdIcon">
                {idCopied ? <Check size={18} /> : <Copy size={18} />}
              </span>
            </button>
          </div>

          <div className="mcProfileHeroInner">
            <div className="mcProfileHeroLeft">
              <div className="mcAvatarWrap">
                <div className="mcAvatar">
                  {imgPreview ? (
                    <img src={imgPreview} alt="profile" />
                  ) : (
                    <div className="mcAvatarFallback">
                      {(name?.[0] || "U").toUpperCase()}
                      {(lastname?.[0] || "").toUpperCase()}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="mcAvatarCamTL"
                  onClick={pickImage}
                  title="Change photo"
                >
                  <Camera />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onImageChange}
                  hidden
                />
              </div>
            </div>

            <div className="mcProfileMeta">
              <h2 className="mcProfileName">
                {name || "—"} {lastname || ""}
              </h2>

              <div className="mcProfileStatsInline">
                <div className="mcStatCard2">
                  <div className="mcStatIcon">
                    <BookMarked />
                  </div>
                  <div className="mcStatText">
                    <div className="mcStatNum2">{publishedCount}</div>
                    <div className="mcStatLbl2">Published</div>
                  </div>
                </div>

                <div className="mcStatCard2">
                  <div className="mcStatIcon">
                    <Quote />
                  </div>
                  <div className="mcStatText">
                    <div className="mcStatNum2">{citationsCount}</div>
                    <div className="mcStatLbl2">Citations</div>
                  </div>
                </div>

                <div className="mcStatCard2">
                  <div className="mcStatIcon">
                    <Heart />
                  </div>
                  <div className="mcStatText">
                    <div className="mcStatNum2">{likesCount}</div>
                    <div className="mcStatLbl2">Likes</div>
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
              <div className="col-12">
                <label className="form-label">Email</label>
                <input
                  className={`form-control mcProfileInput ${
                    errors.email ? "is-invalid" : ""
                  }`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                />
                {errors.email && (
                  <div className="invalid-feedback d-block">{errors.email}</div>
                )}
              </div>

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
                  <div className="invalid-feedback d-block">
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Confirm password</label>

                <div className="input-group mcWizardInputGroup mcWizardKeyGroup">
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
                  <div className="invalid-feedback d-block">
                    {errors.confirm}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== INSTITUTIONS ===================== */}
        <section className="mcPanelCard mt-3">
          <div className="mcPanelHead">
            <div className="mcPanelHeadLeft">
              <div className="mcPanelIcon">
                <University />
              </div>
              <h5 className="m-0">Affiliated Institutions</h5>
            </div>

            <div className="mcPanelHeadRight">
              <button
                type="button"
                className="btn btn-outline-memory mcAddBtn"
                onClick={() => setShowAddInst((v) => !v)}
              >
                <span className="mcAddBtnIcon" aria-hidden="true">
                  <SquarePlus size={18} />
                </span>
                <span className="mcAddBtnText">Add</span>
              </button>
            </div>
          </div>

          <div className="mcPanelBody">
            {showAddInst && (
              <div className="mcAddInstPanel">
                <div className="row g-3 align-items-end">
                  <div className="col-md-8">
                    <label className="form-label">Select an institution</label>

                    <div className="dropdown mcSelectDd">
                      <button
                        className="mcSelectBtn"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span className="mcSelectText">
                          {selectedInstitutionId
                            ? remainingOptions.find(
                                (o) => o._id === selectedInstitutionId,
                              )?.name
                            : "— Select Institution —"}
                        </span>
                        <span style={{ opacity: 0.75 }}>▾</span>
                      </button>

                      <ul className="dropdown-menu mcDropdownMenu">
                        {remainingOptions.length === 0 ? (
                          <li>
                            <span className="dropdown-item text-muted">
                              No more institutions
                            </span>
                          </li>
                        ) : (
                          remainingOptions.map((opt) => (
                            <li key={opt._id}>
                              <button
                                type="button"
                                className={`dropdown-item ${
                                  selectedInstitutionId === opt._id
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() =>
                                  setSelectedInstitutionId(opt._id)
                                }
                              >
                                {opt.name}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="col-md-4 d-grid">
                    <button
                      type="button"
                      className="btn btn-memory"
                      onClick={addInstitution}
                      disabled={!selectedInstitutionId}
                    >
                      Add Institution
                    </button>
                  </div>
                </div>
              </div>
            )}

            {institutions.length === 0 ? (
              <div className="mcEmptyState">No institutions added.</div>
            ) : (
              <div className="mcAffGrid">
                {institutions.map((inst) => {
                  const instId = inst._id;

                  const eduEmail = institutionEmails?.[instId] || "";
                  const status = normalizeStatus(
                    institutionEmailStatus?.[instId] || "PENDING",
                  );

                  const allowedDomains = inst.emailDomains || [];
                  const isEditing = editingInstitutionId === instId;
                  const isNew = !initialInstitutionIdSet.has(instId);

                  return (
                    <div className="mcAffItem" key={instId}>
                      <div className="mcAffRow">
                        <div className="mcAffLogo">
                          {inst.logoUrl ? (
                            <img src={inst.logoUrl} alt={`${inst.name} logo`} />
                          ) : (
                            <span>
                              {(inst.name?.[0] || "I").toUpperCase()}
                              {(inst.name?.[1] || "").toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="mcAffMid">
                          <div className="mcAffName">{inst.name}</div>
                          <div className="mcAffEmail">
                            {eduEmail || "No institutional email"}
                          </div>
                        </div>

                        <div className="mcAffRight">
                          <StatusPill status={status} />

                          <button
                            type="button"
                            className="mcAffEditBtn"
                            onClick={() =>
                              setEditingInstitutionId((prev) =>
                                prev === instId ? "" : instId,
                              )
                            }
                            title={isEditing ? "Close" : "Edit"}
                          >
                            {isEditing ? (
                              <X size={18} />
                            ) : (
                              <SquarePen size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mcAffEditPanel">
                          <label className="form-label mb-2">
                            Institutional email{" "}
                            {allowedDomains?.length > 0 && (
                              <span className="mcMuted">
                                (allowed: {allowedDomains.join(", ")})
                              </span>
                            )}
                          </label>

                          <div className="d-flex gap-2">
                            <input
                              type="email"
                              className="form-control mcProfileInput"
                              value={institutionEmails?.[instId] || ""}
                              onChange={(e) =>
                                handleInstitutionEmailChange(
                                  instId,
                                  e.target.value,
                                )
                              }
                              placeholder="john@youruniversity.edu"
                            />

                            {isNew && (
                              <button
                                type="button"
                                className="btn btn-outline-danger d-flex align-items-center justify-content-center"
                                onClick={() => removeInstitution(instId)}
                                title="Discard"
                              >
                                <Delete size={18} />
                              </button>
                            )}
                          </div>

                          <div className="mcMuted" style={{ marginTop: 10 }}>
                            Any change will set the status back to{" "}
                            <b>Pending</b> until your institution verifies it.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

export default FormProfile;
