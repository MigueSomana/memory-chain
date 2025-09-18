import React, { useState } from "react";

const NavbarReal = () => {
  const [activeKey, setActiveKey] = useState("dashboard");

  const items = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="nav-icon" fill="currentColor">
          <path d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z"/>
        </svg>
      ),
      href: "#",
    },
    {
      key: "explore",
      label: "Explore",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 1A1.5 1.5 0 0 0 3 2.5V3h4v-.5A1.5 1.5 0 0 0 5.5 1zM7 4v1h2V4h4v.882a.5.5 0 0 0 .276.447l.895.447A1.5 1.5 0 0 1 15 7.118V13H9v-1.5a.5.5 0 0 1 .146-.354l.854-.853V9.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v.793l.854.853A.5.5 0 0 1 7 11.5V13H1V7.118a1.5 1.5 0 0 1 .83-1.342l.894-.447A.5.5 0 0 0 3 4.882V4zM1 14v.5A1.5 1.5 0 0 0 2.5 16h3A1.5 1.5 0 0 0 7 14.5V14zm8 0v.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5V14zm4-11H9v-.5A1.5 1.5 0 0 1 10.5 1h1A1.5 1.5 0 0 1 13 2.5z"/>
        </svg>
      ),
      href: "#",
    },
    {
      key: "library",
      label: "Library",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.765 1.559a.5.5 0 0 1 .47 0l7.5 4a.5.5 0 0 1 0 .882l-7.5 4a.5.5 0 0 1-.47 0l-7.5-4a.5.5 0 0 1 0-.882z"/>
          <path d="m2.125 8.567-1.86.992a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882l-1.86-.992-5.17 2.756a1.5 1.5 0 0 1-1.41 0z"/>
        </svg>
      ),
      href: "#",
    },
    {
      key: "profile",
      label: "Profile",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
          <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
        </svg>
      ),
      href: "#",
    },
    {
      key: "signout nav-link text-white",
      label: "Sign Out",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" viewBox="0 0 640 640" fill="currentColor">
          <path d="M569 337C578.4 327.6 578.4 312.4 569 303.1L425 159C418.1 152.1 407.8 150.1 398.8 153.8C389.8 157.5 384 166.3 384 176L384 256L272 256C245.5 256 224 277.5 224 304L224 336C224 362.5 245.5 384 272 384L384 384L384 464C384 473.7 389.8 482.5 398.8 486.2C407.8 489.9 418.1 487.9 425 481L569 337zM224 160C241.7 160 256 145.7 256 128C256 110.3 241.7 96 224 96L160 96C107 96 64 139 64 192L64 448C64 501 107 544 160 544L224 544C241.7 544 256 529.7 256 512C256 494.3 241.7 480 224 480L160 480C142.3 480 128 465.7 128 448L128 192C128 174.3 142.3 160 160 160L224 160z"/>
        </svg>
      ),
      href:"#modalExit",
                    dbt1:"modal",
                    dbt2:"#modalExit",
    },
  ];

const renderItemDesktop = (it) => (
  <li className="nav-item flex-grow-1 d-flex" key={it.key}>
    <a
      href={it.href}
      onClick={() => setActiveKey(it.key)}
      className={`nav-link text-white text-center d-flex flex-column align-items-center justify-content-center w-100 h-100 rounded ${activeKey === it.key ? "active" : "opacity-75"}`}
      data-bs-toggle={it.dbt1}
      data-bs-target={it.dbt2}
    >
      <span className="d-block mb-1">{it.icon}</span>
      <span className="fw-semibold">{it.label}</span>
    </a>
  </li>
);


  const renderItemMobile = (it) => (
    <li className="nav-item" key={it.key}>
      <a
        href={it.href}
        data-bs-dismiss="offcanvas"
        onClick={() => setActiveKey(it.key)}
        className={`nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${activeKey === it.key ? "active" : "text-white-50"}`}
      >
        {it.icon}
        <span className="fw-semibold">{it.label}</span>
      </a>
    </li>
  );

  return (
    <>
      <div className="d-md-none">
        <div
          className="position-fixed top-0 start-0 h-100 d-flex align-items-center justify-content-center"
          style={{ width: 56, background: "#121212", borderRight: "1px solid rgba(255,255,255,0.08)", zIndex: 1040 }}
        >
          <button
            className="btn p-2 text-white"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mcOffcanvas"
            aria-controls="mcOffcanvas"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="22" height="22" fill="currentColor">
              <path d="M320 208C289.1 208 264 182.9 264 152C264 121.1 289.1 96 320 96C350.9 96 376 121.1 376 152C376 182.9 350.9 208 320 208zM320 432C350.9 432 376 457.1 376 488C376 518.9 350.9 544 320 544C289.1 544 264 518.9 264 488C264 457.1 289.1 432 320 432zM376 320C376 350.9 350.9 376 320 376C289.1 376 264 350.9 264 320C264 289.1 289.1 264 320 264C350.9 264 376 289.1 376 320z"/>
            </svg>
          </button>
        </div>

        <div
          className="offcanvas offcanvas-start text-white"
          tabIndex="-1"
          id="mcOffcanvas"
          aria-labelledby="mcOffcanvasLabel"
          style={{ background: "#121212", width: "88vw", maxWidth: 520, marginLeft: 56 }}
        >
          <div className="offcanvas-header">
            <h5 className="offcanvas-title" id="mcOffcanvasLabel">Menu</h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
          </div>
          <div className="offcanvas-body d-flex flex-column ">
            <ul className="nav flex-column gap-2 ">
              {items.map(renderItemMobile)}
            </ul>
          </div>
        </div>

        <div style={{ paddingLeft: 56 }} />
      </div>

      <aside
        className="d-none d-md-flex flex-column flex-wrap "
        style={{
          background: "#121212",
          color: "#fff",
          height: "100vh",
          position: "sticky",
          top: 0,
          width: "9vw", 
          maxWidth: "320px",
          minWidth: "200px"
        }}
      >
        <ul className="nav d-flex flex-column h-100 w-100 py-4 px-2">
  {items.map(renderItemDesktop)}
</ul>

      </aside>
    </>
  );
};

export default NavbarReal;
