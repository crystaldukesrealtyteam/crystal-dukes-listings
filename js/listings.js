
(() => {
  const $ = (id) => document.getElementById(id);

  $("year").textContent = new Date().getFullYear();

  const configured =
    window.SUPABASE_URL &&
    !window.SUPABASE_URL.startsWith("YOUR_") &&
    window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_ANON_KEY.startsWith("YOUR_");

  if (!configured) {
    $("listing-grid").innerHTML =
      '<div class="setup-notice">Connect your Supabase project in <code>js/config.js</code> to load live listings.</div>';

    ["active-count", "sold-count"].forEach(
      (id) => ($ (id).textContent = "0")
    );

    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  let all = [];
  let status = "all";

  const money = (value) =>
    value == null
      ? "Price upon request"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        }).format(value);

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const statusLabel = (value) => ({
    active: "Current Listing",
    under_contract: "Under Contract",
    sold: "Sold"
  }[value] || value);

  const photo = (p) => p.photos?.[0] || "";

  async function load() {
    const { data, error } = await db
      .from("properties")
      .select("*")
      .eq("published", true)
      .in("status", ["active", "sold"])
      .order("created_at", { ascending: false });

    if (error) {
      $("listing-grid").innerHTML =
        `<div class="setup-notice">Unable to load listings: ${escapeHTML(error.message)}</div>`;
      return;
    }

    all = data || [];

    $("active-count").textContent =
      all.filter((p) => p.status === "active").length;

    $("sold-count").textContent =
      all.filter((p) => p.status === "sold").length;

    render();
  }

  function render() {
    const query = $("search-input").value.trim().toLowerCase();

    let rows = all.filter(
      (p) =>
        (status === "all" || p.status === status) &&
        [
          p.title,
          p.address,
          p.city,
          p.state,
          p.zip_code,
          p.description
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
    );

    const sort = $("sort-select").value;

    if (sort === "price-low") {
      rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    }

    if (sort === "price-high") {
      rows.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    }

    $("listing-grid").innerHTML = rows
      .map(
        (p) => `
        <article class="property-card">
          <button class="property-image" data-open="${escapeHTML(p.id)}" aria-label="View ${escapeHTML(p.title)}">
            ${
              photo(p)
                ? `<img src="${escapeHTML(photo(p))}" alt="${escapeHTML(p.title)}">`
                : `<span class="image-placeholder">CRYSTAL DUKES<br>REALTY TEAM</span>`
            }
            <span class="status-pill status-${escapeHTML(p.status)}">${escapeHTML(statusLabel(p.status))}</span>
          </button>

          <div class="property-info">
            <p class="property-price">${money(p.price)}</p>
            <h3>${escapeHTML(p.title)}</h3>

            <p class="property-location">
              ${escapeHTML([p.address, p.city, p.state, p.zip_code].filter(Boolean).join(", "))}
            </p>

            <div class="property-meta">
              <span><strong>${p.bedrooms ?? "—"}</strong> bd</span>
              <span><strong>${p.bathrooms ?? "—"}</strong> ba</span>
              <span><strong>${p.square_feet ? Number(p.square_feet).toLocaleString() : "—"}</strong> sqft</span>
            </div>

            <button class="details-link" data-open="${escapeHTML(p.id)}">
              View Property Details →
            </button>
          </div>
        </article>
      `
      )
      .join("");

    $("empty-state").hidden = rows.length !== 0;
  }

  async function openDetails(id) {
    const p = all.find((x) => x.id === id);
    if (!p) return;

    $("dialog-content").innerHTML = `
      <div class="detail-gallery">
        ${
          (p.photos || [])
            .map(
              (url) =>
                `<img src="${escapeHTML(url)}" alt="${escapeHTML(p.title)}">`
            )
            .join("") ||
          '<div class="image-placeholder">PROPERTY PHOTOS</div>'
        }
      </div>

      <p class="eyebrow">${escapeHTML(statusLabel(p.status))}</p>

      <h2>${escapeHTML(p.title)}</h2>

      <p class="property-price">${money(p.price)}</p>

      <p>${escapeHTML(
        [p.address, p.city, p.state, p.zip_code]
          .filter(Boolean)
          .join(", ")
      )}</p>

      <div class="property-meta">
        <span>${p.bedrooms ?? "—"} bedrooms</span>
        <span>${p.bathrooms ?? "—"} bathrooms</span>
        <span>${p.square_feet ? Number(p.square_feet).toLocaleString() + " sqft" : "Size not listed"}</span>
      </div>

      <p class="detail-description">
        ${escapeHTML(p.description || "Contact Crystal for additional property details.")}
      </p>

      <a
        class="button button-primary"
        href="mailto:crystaldukes@kw.com?subject=${encodeURIComponent("Property inquiry: " + p.title)}"
      >
        Ask Crystal About This Property
      </a>
    `;

    $("property-dialog").showModal();
  }

  document.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelector(".tab.active")?.classList.remove("active");

      btn.classList.add("active");
      status = btn.dataset.status;

      render();
    })
  );

  $("search-input").addEventListener("input", render);
  $("sort-select").addEventListener("change", render);

  $("listing-grid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (b) openDetails(b.dataset.open);
  });

  $("dialog-close").addEventListener("click", () =>
    $("property-dialog").close()
  );

  $("property-dialog").addEventListener("click", (e) => {
    if (e.target === $("property-dialog")) {
      $("property-dialog").close();
    }
  });

  load();
})();
