
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
      '<div class="setup-notice">Connect your Supabase project in js/config.js to load live listings.</div>';
    ["active-count", "sold-count"].forEach(id => $(id).textContent = "0");
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  let all = [];
  let status = "all";
  let currentPhotos = [];
  let currentPhotoIndex = 0;

  const money = value =>
    value == null
      ? "Price upon request"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        }).format(value);

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const statusLabel = value => ({
    active: "Active",
    sold: "Sold",
    under_contract: "Under Contract"
  }[value] || value);

  const photo = property =>
    Array.isArray(property.photos) ? property.photos : [];

  const listSection = (title, values) => {
    if (!Array.isArray(values) || !values.length) return "";

    return `
      <section class="detail-section">
        <h3>${escapeHTML(title)}</h3>
        <ul class="feature-list">
          ${values.map(item =>
            `<li>${escapeHTML(item)}</li>`
          ).join("")}
        </ul>
      </section>
    `;
  };

  const detailRow = (label, value) => {
    if (value === null || value === undefined || value === "") return "";

    return `
      <div class="detail-row">
        <span>${escapeHTML(label)}</span>
        <strong>${escapeHTML(value)}</strong>
      </div>
    `;
  };

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
      all.filter(p => p.status === "active").length;

    $("sold-count").textContent =
      all.filter(p => p.status === "sold").length;

    render();
  }

  function render() {
    const query = $("search-input").value.trim().toLowerCase();

    let rows = all.filter(property =>
      (status === "all" || property.status === status) &&
      [
        property.title,
        property.address,
        property.city,
        property.state,
        property.zip_code,
        property.description,
        property.property_type,
        property.county
      ].join(" ").toLowerCase().includes(query)
    );

    const sort = $("sort-select").value;

    if (sort === "price-low") {
      rows.sort((a, b) =>
        (a.price ?? Infinity) - (b.price ?? Infinity)
      );
    }

    if (sort === "price-high") {
      rows.sort((a, b) =>
        (b.price ?? -1) - (a.price ?? -1)
      );
    }

    $("listing-grid").innerHTML = rows.map(property => `
      <article class="property-card">

        <button
          class="property-image"
          data-open="${escapeHTML(property.id)}"
          aria-label="View ${escapeHTML(property.title)}"
        >
          ${
            photo(property)[0]
              ? `<img src="${escapeHTML(photo(property)[0])}" alt="${escapeHTML(property.title)}">`
              : `<span class="image-placeholder">CRYSTAL DUKES<br>REALTY TEAM</span>`
          }

          <span class="status-pill status-${escapeHTML(property.status)}">
            ${escapeHTML(statusLabel(property.status))}
          </span>
        </button>

        <div class="property-info">

          <p class="property-price">${money(property.price)}</p>

          <h3>${escapeHTML(property.title)}</h3>

          <p class="property-location">
            ${escapeHTML([
              property.address,
              property.city,
              property.state,
              property.zip_code
            ].filter(Boolean).join(", "))}
          </p>

          <div class="property-meta">
            <span><strong>${property.bedrooms ?? "—"}</strong> bd</span>
            <span><strong>${property.bathrooms ?? "—"}</strong> ba</span>
            <span><strong>${property.square_feet ? Number(property.square_feet).toLocaleString() : "—"}</strong> sqft</span>
          </div>

          <button class="details-link" data-open="${escapeHTML(property.id)}">
            View Property Details →
          </button>

        </div>
      </article>
    `).join("");

    $("empty-state").hidden = rows.length !== 0;
  }

  // OPEN COMPLETE PROPERTY DETAILS

  function openDetails(id) {
    const property = all.find(p => String(p.id) === String(id));
    if (!property) return;

    currentPhotos = photo(property);
    currentPhotoIndex = 0;

    const address = [
      property.address,
      property.city,
      property.state,
      property.zip_code
    ].filter(Boolean).join(", ");

    const mapAvailable =
      property.latitude != null &&
      property.longitude != null;

    const mapQuery = mapAvailable
      ? `${property.latitude},${property.longitude}`
      : "";

    const gallery = currentPhotos.length
      ? `
        <div class="property-main-photo">
          <button class="gallery-arrow gallery-prev" data-gallery="prev" aria-label="Previous photo">‹</button>

          <img
            id="main-property-photo"
            src="${escapeHTML(currentPhotos[0])}"
            alt="${escapeHTML(property.title)}"
          >

          <button class="gallery-arrow gallery-next" data-gallery="next" aria-label="Next photo">›</button>

          <span class="gallery-counter" id="gallery-counter">
            1 / ${currentPhotos.length}
          </span>
        </div>

        <div class="property-thumbnails">
          ${currentPhotos.map((url, index) => `
            <button
              class="property-thumbnail ${index === 0 ? "selected" : ""}"
              data-gallery-index="${index}"
              aria-label="View photo ${index + 1}"
            >
              <img src="${escapeHTML(url)}" alt="">
            </button>
          `).join("")}
        </div>
      `
      : `
        <div class="property-main-photo">
          <div class="image-placeholder">PROPERTY PHOTOS</div>
        </div>
      `;

    $("dialog-content").innerHTML = `

      <div class="property-detail-page">

        <!-- PHOTO GALLERY -->
        ${gallery}

        <!-- PROPERTY INTRODUCTION -->
        <div class="detail-intro">

          <div>
            <p class="eyebrow">${escapeHTML(statusLabel(property.status))}</p>

            <h2>${escapeHTML(property.title)}</h2>

            <p class="detail-address">${escapeHTML(address)}</p>
          </div>

          <div class="detail-price">
            ${money(property.price)}
          </div>

        </div>

        <!-- PROPERTY OVERVIEW -->
        <section class="detail-overview">

          <div>
            <strong>${property.bedrooms ?? "—"}</strong>
            <span>Bedrooms</span>
          </div>

          <div>
            <strong>${property.bathrooms ?? "—"}</strong>
            <span>Bathrooms</span>
          </div>

          <div>
            <strong>${property.square_feet ? Number(property.square_feet).toLocaleString() : "—"}</strong>
            <span>Square Feet</span>
          </div>

          <div>
            <strong>${escapeHTML(property.lot_size || "—")}</strong>
            <span>Lot Size</span>
          </div>

        </section>

        <!-- DESCRIPTION -->
        <section class="detail-section">
          <h3>About This Property</h3>

          <p class="detail-description">
            ${escapeHTML(property.description || "Contact Crystal for additional information about this property.")}
          </p>
        </section>

        <!-- PROPERTY DETAILS -->
        <section class="detail-section">

          <h3>Property Details</h3>

          <div class="detail-grid">

            ${detailRow("Property Type", property.property_type)}
            ${detailRow("MLS Number", property.mls_number)}
            ${detailRow("County", property.county)}
            ${detailRow("Year Built", property.year_built)}
            ${detailRow("Property Style", property.property_style)}
            ${detailRow("Construction", property.construction_materials)}
            ${detailRow("Parking", property.parking)}
            ${detailRow("HOA Fee", property.hoa_fee == null ? null : money(property.hoa_fee))}

          </div>

        </section>

        <!-- INTERIOR FEATURES -->
        ${listSection("Interior Features", property.interior_features)}
        ${listSection("Kitchen Features", property.kitchen_features)}
        ${listSection("Appliances", property.appliances)}
        ${listSection("Heating", property.heating)}
        ${listSection("Cooling", property.cooling)}

        <!-- EXTERIOR FEATURES -->
        ${listSection("Exterior Features", property.exterior_features)}
        ${listSection("Patio & Porch Features", property.patio_porch_features)}

        <!-- UTILITIES -->
        <section class="detail-section">

          <h3>Utilities & Building Information</h3>

          <div class="detail-grid">

            ${detailRow("Water Source", property.water_source)}
            ${detailRow("Sewer", property.sewer)}

          </div>

        </section>

        <!-- MAP -->
        ${mapAvailable ? `
          <section class="detail-section">

            <h3>Property Location</h3>

            <div class="property-map">
              <iframe
                title="Property location map"
                src="https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen
              ></iframe>
            </div>

            <a
              class="map-link"
              href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps ↗
            </a>

          </section>
        ` : ""}

        <!-- CONTACT -->
        <section class="detail-contact">

          <p class="eyebrow">LET'S FIND YOUR NEXT HOME</p>

          <h3>Interested in this property?</h3>

          <p>
            Contact Crystal Dukes Realty Team for additional information
            or to schedule a showing.
          </p>

          <a
            class="button button-gold"
            href="https://www.facebook.com/crystal.goinesdukes/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Crystal →
          </a>

        </section>

      </div>
    `;

    $("property-dialog").showModal();
  }

  // PHOTO GALLERY CONTROLS

  function showPhoto(index) {
    if (!currentPhotos.length) return;

    currentPhotoIndex =
      (index + currentPhotos.length) % currentPhotos.length;

    $("main-property-photo").src =
      currentPhotos[currentPhotoIndex];

    $("gallery-counter").textContent =
      `${currentPhotoIndex + 1} / ${currentPhotos.length}`;

    document.querySelectorAll(".property-thumbnail").forEach((button, i) => {
      button.classList.toggle("selected", i === currentPhotoIndex);
    });
  }

  $("dialog-content").addEventListener("click", event => {
    const galleryButton = event.target.closest("[data-gallery]");
    const thumbnail = event.target.closest("[data-gallery-index]");

    if (galleryButton) {
      showPhoto(
        currentPhotoIndex +
        (galleryButton.dataset.gallery === "next" ? 1 : -1)
      );
    }

    if (thumbnail) {
      showPhoto(Number(thumbnail.dataset.galleryIndex));
    }
  });

  // LISTING FILTERS

  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(".tab.active")?.classList.remove("active");

      button.classList.add("active");
      status = button.dataset.status;

      render();
    });
  });

  $("search-input").addEventListener("input", render);
  $("sort-select").addEventListener("change", render);

  // OPEN PROPERTY

  $("listing-grid").addEventListener("click", event => {
    const button = event.target.closest("[data-open]");
    if (button) openDetails(button.dataset.open);
  });

  // CLOSE PROPERTY DETAILS

  $("dialog-close").addEventListener("click", () => {
    $("property-dialog").close();
  });

  $("property-dialog").addEventListener("click", event => {
    if (event.target === $("property-dialog")) {
      $("property-dialog").close();
    }
  });

  load();

})();
