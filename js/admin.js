
(() => {
  const $ = (id) => document.getElementById(id);

  const configured =
    window.SUPABASE_URL &&
    !window.SUPABASE_URL.startsWith("YOUR_") &&
    window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_ANON_KEY.startsWith("YOUR_");

  if (!configured) {
    $("login-message").textContent =
      "Add your Supabase project URL and anon key in js/config.js first.";
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  let properties = [];

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const message = (id, text, error = false) => {
    $(id).textContent = text;
    $(id).className = "form-message" + (error ? " error" : "");
  };

  const getValue = (id) => $(id).value.trim();

  const getNumber = (id) => {
    const value = getValue(id);
    return value === "" ? null : Number(value);
  };

  const getList = (id) =>
    getValue(id)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const setList = (id, values) => {
    $(id).value = Array.isArray(values)
      ? values.join(", ")
      : values || "";
  };

  // AUTHENTICATION

  async function sessionChanged(session) {
    $("login-panel").hidden = !!session;
    $("dashboard").hidden = !session;

    if (session) {
      $("signed-in-user").textContent = session.user.email;
      await loadProperties();
    }
  }

  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    message("login-message", "Signing in…");

    const { error } = await db.auth.signInWithPassword({
      email: getValue("login-email"),
      password: $("login-password").value
    });

    if (error) {
      message("login-message", error.message, true);
    }
  });

  $("signout-button").addEventListener("click", async () => {
    const { error } = await db.auth.signOut();

    if (error) {
      alert(error.message);
    }
  });

  db.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => sessionChanged(session), 0);
  });

  db.auth.getSession().then(({ data, error }) => {
    if (error) {
      message("login-message", error.message, true);
      return;
    }

    sessionChanged(data.session);
  });

  // LOAD PROPERTIES

  async function loadProperties() {
    const { data, error } = await db
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      $("admin-property-list").innerHTML =
        `<p class="form-message error">${escapeHTML(error.message)}</p>`;
      return;
    }

    properties = data || [];

    const counts = {
      active: 0,
      under_contract: 0,
      sold: 0
    };

    properties.forEach((property) => {
      counts[property.status] =
        (counts[property.status] || 0) + 1;
    });

    $("admin-stats").innerHTML = Object.entries(counts)
      .map(([status, count]) => `
        <div>
          <strong>${count}</strong>
          <span>${escapeHTML(status.replace("_", " "))}</span>
        </div>
      `)
      .join("");

    renderAdminList();
  }

  // PROPERTY LIST

  function renderAdminList() {
    const query = getValue("admin-search").toLowerCase();

    const rows = properties.filter((property) =>
      [
        property.title,
        property.address,
        property.city,
        property.state,
        property.mls_number
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );

    $("admin-property-list").innerHTML = rows
      .map((property) => `
        <article class="admin-property-row">
          <div>
            <strong>${escapeHTML(property.title)}</strong>
            <small>
              ${escapeHTML([property.city, property.state].filter(Boolean).join(", "))}
              · ${escapeHTML(property.status)}
              · ${property.published ? "Published" : "Draft"}
            </small>
          </div>

          <div class="row-actions">
            <button class="text-button" data-edit="${escapeHTML(property.id)}">
              Edit
            </button>

            <button class="text-button danger" data-archive="${escapeHTML(property.id)}">
              Archive
            </button>
          </div>
        </article>
      `)
      .join("") ||
      '<p class="muted">No properties found.</p>';
  }

  $("admin-search").addEventListener("input", renderAdminList);

  $("admin-property-list").addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit]");
    const archiveButton = event.target.closest("[data-archive]");

    if (editButton) {
      const property = properties.find(
        (item) => item.id === editButton.dataset.edit
      );

      if (property) {
        fillForm(property);
      }
    }

    if (archiveButton) {
      const id = archiveButton.dataset.archive;

      if (!confirm("Archive this property? It will no longer appear publicly.")) {
        return;
      }

      const { error } = await db
        .from("properties")
        .update({
          published: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) {
        alert(error.message);
      } else {
        await loadProperties();
      }
    }
  });

  // FILL FORM FOR EDITING

  function fillForm(property) {
    $("property-id").value = property.id;

    $("title").value = property.title || "";
    $("address").value = property.address || "";
    $("city").value = property.city || "";
    $("state").value = property.state || "AL";
    $("zip").value = property.zip_code || "";
    $("county").value = property.county || "";
    $("mls-number").value = property.mls_number || "";

    $("property-type").value = property.property_type || "";
    $("price").value = property.price ?? "";
    $("bedrooms").value = property.bedrooms ?? "";
    $("bathrooms").value = property.bathrooms ?? "";
    $("sqft").value = property.square_feet ?? "";
    $("year-built").value = property.year_built ?? "";
    $("property-style").value = property.property_style || "";

    $("status").value = property.status || "active";
    $("description").value = property.description || "";

    $("construction-materials").value =
      property.construction_materials || "";

    $("sewer").value = property.sewer || "";
    $("water-source").value = property.water_source || "";
    $("parking").value = property.parking || "";
    $("lot-size").value = property.lot_size || "";
    $("hoa-fee").value = property.hoa_fee ?? "";

    setList("cooling", property.cooling);
    setList("heating", property.heating);
    setList("kitchen-features", property.kitchen_features);
    setList("interior-features", property.interior_features);
    setList("exterior-features", property.exterior_features);
    setList("patio-porch-features", property.patio_porch_features);
    setList("appliances", property.appliances);

    $("latitude").value = property.latitude ?? "";
    $("longitude").value = property.longitude ?? "";

    $("featured").checked = !!property.featured;
    $("published").checked = !!property.published;

    $("photos").value = "";

    $("form-title").textContent = "Edit Property";
    $("save-button").textContent = "Update Property";
    $("cancel-edit").hidden = false;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    message("form-message", "Editing property. Existing photos will be retained.");
  }

  // RESET FORM

  function resetForm() {
    $("property-form").reset();

    $("property-id").value = "";
    $("state").value = "AL";
    $("published").checked = true;

    $("form-title").textContent = "Add a Property";
    $("save-button").textContent = "Save Property";
    $("cancel-edit").hidden = true;

    message("form-message", "");
  }

  $("cancel-edit").addEventListener("click", resetForm);

  // UPLOAD PROPERTY PHOTOS

  async function uploadPhotos(propertyId, existingPhotos) {
    const selectedFiles = [...$("photos").files];

    const photoUrls = [...(existingPhotos || [])];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files can be uploaded.");
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");

      const path =
        `${propertyId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error } = await db.storage
        .from("property-photos")
        .upload(path, file, {
          upsert: false
        });

      if (error) {
        throw error;
      }

      const { data } = db.storage
        .from("property-photos")
        .getPublicUrl(path);

      photoUrls.push(data.publicUrl);
    }

    return photoUrls;
  }

  // SAVE PROPERTY

  $("property-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    $("save-button").disabled = true;
    message("form-message", "Saving property information…");

    try {
      const id =
        $("property-id").value || crypto.randomUUID();

      const existingProperty = properties.find(
        (property) => property.id === id
      );

      const photoUrls = await uploadPhotos(
        id,
        existingProperty?.photos || []
      );

      const status = getValue("status");

      // Under Contract properties must never be published publicly.
      const publicAllowed =
        status === "active" || status === "sold";

      const record = {
        id,

        title: getValue("title"),
        address: getValue("address"),
        city: getValue("city"),
        state: getValue("state").toUpperCase(),
        zip_code: getValue("zip") || null,
        county: getValue("county") || null,
        mls_number: getValue("mls-number") || null,

        property_type: getValue("property-type") || null,
        price: getNumber("price"),
        bedrooms: getNumber("bedrooms"),
        bathrooms: getNumber("bathrooms"),
        square_feet: getNumber("sqft"),

        year_built: getNumber("year-built"),
        property_style: getValue("property-style") || null,

        status,
        description: getValue("description"),

        construction_materials:
          getValue("construction-materials") || null,

        sewer: getValue("sewer") || null,
        water_source: getValue("water-source") || null,
        parking: getValue("parking") || null,
        lot_size: getValue("lot-size") || null,
        hoa_fee: getNumber("hoa-fee"),

        cooling: getList("cooling"),
        heating: getList("heating"),
        kitchen_features: getList("kitchen-features"),
        interior_features: getList("interior-features"),
        exterior_features: getList("exterior-features"),
        patio_porch_features: getList("patio-porch-features"),
        appliances: getList("appliances"),

        latitude: getNumber("latitude"),
        longitude: getNumber("longitude"),

        photos: photoUrls,
        featured: $("featured").checked,

        published:
          publicAllowed && $("published").checked,

        updated_at: new Date().toISOString()
      };

      const { error } = await db
        .from("properties")
        .upsert(record);

      if (error) {
        throw error;
      }

      resetForm();

      message(
        "form-message",
        status === "under_contract"
          ? "Property saved. Under Contract listings remain hidden from the public website."
          : "Property saved successfully."
      );

      await loadProperties();

    } catch (error) {
      console.error("Property save error:", error);

      message(
        "form-message",
        error.message || "Unable to save property.",
        true
      );

    } finally {
      $("save-button").disabled = false;
    }
  });

})();
