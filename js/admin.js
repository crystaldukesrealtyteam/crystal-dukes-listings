(() => {
  const $ = id => document.getElementById(id);
  const configured = window.SUPABASE_URL && !window.SUPABASE_URL.startsWith("YOUR_") &&
    window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.startsWith("YOUR_");
  if (!configured) { $("login-message").textContent = "Add your Supabase project URL and anon key in js/config.js first."; return; }
  const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  let properties = [];
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const message = (id,text,error=false) => { $(id).textContent=text; $(id).className="form-message"+(error?" error":""); };
  async function sessionChanged(session) {
    $("login-panel").hidden=!!session; $("dashboard").hidden=!session;
    if(session){$("signed-in-user").textContent=session.user.email;await loadProperties();}
  }
  $("login-form").addEventListener("submit",async e=>{
    e.preventDefault(); message("login-message","Signing in…");
    const {error}=await db.auth.signInWithPassword({email:$("login-email").value,password:$("login-password").value});
    if(error) message("login-message",error.message,true);
  });
  $("signout-button").addEventListener("click",()=>db.auth.signOut());
  db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>sessionChanged(session),0);});
  db.auth.getSession().then(({data})=>sessionChanged(data.session));

  async function loadProperties(){
    const {data,error}=await db.from("properties").select("*").order("created_at",{ascending:false});
    if(error){$("admin-property-list").innerHTML=`<p class="form-message error">${escapeHTML(error.message)}</p>`;return;}
    properties=data||[];
    const counts={active:0,under_contract:0,sold:0};properties.forEach(p=>counts[p.status]=(counts[p.status]||0)+1);
    $("admin-stats").innerHTML=Object.entries(counts).map(([k,v])=>`<div><strong>${v}</strong><span>${k.replace("_"," ")}</span></div>`).join("");
    renderAdminList();
  }
  function renderAdminList(){
    const q=$("admin-search").value.toLowerCase();
    const rows=properties.filter(p=>[p.title,p.address,p.city].join(" ").toLowerCase().includes(q));
    $("admin-property-list").innerHTML=rows.map(p=>`<article class="admin-property-row">
      <div><strong>${escapeHTML(p.title)}</strong><small>${escapeHTML([p.city,p.state].filter(Boolean).join(", "))} · ${escapeHTML(p.status)} · ${p.published?"Published":"Draft"}</small></div>
      <div class="row-actions"><button class="text-button" data-edit="${p.id}">Edit</button><button class="text-button danger" data-delete="${p.id}">Archive</button></div>
    </article>`).join("")||'<p class="muted">No properties yet. Add your first property using the form.</p>';
  }
  $("admin-search").addEventListener("input",renderAdminList);
  $("admin-property-list").addEventListener("click",async e=>{
    const edit=e.target.closest("[data-edit]")?.dataset.edit, del=e.target.closest("[data-delete]")?.dataset.delete;
    if(edit){const p=properties.find(x=>x.id===edit);if(p)fillForm(p);}
    if(del && confirm("Archive this property? It will no longer appear publicly.")){
      const {error}=await db.from("properties").update({published:false}).eq("id",del);
      if(error)alert(error.message);else await loadProperties();
    }
  });
  function fillForm(p){
    $("property-id").value=p.id;$("title").value=p.title||"";$("address").value=p.address||"";$("city").value=p.city||"";$("state").value=p.state||"AL";$("zip").value=p.zip_code||"";
    $("price").value=p.price??"";$("bedrooms").value=p.bedrooms??"";$("bathrooms").value=p.bathrooms??"";$("sqft").value=p.square_feet??"";
    $("status").value=p.status;$("description").value=p.description||"";$("featured").checked=!!p.featured;$("published").checked=!!p.published;
    $("form-title").textContent="Edit Property";$("save-button").textContent="Update Property";$("cancel-edit").hidden=false;window.scrollTo({top:0,behavior:"smooth"});
  }
  function resetForm(){
    $("property-form").reset();$("property-id").value="";$("state").value="AL";$("published").checked=true;
    $("form-title").textContent="Add a Property";$("save-button").textContent="Save Property";$("cancel-edit").hidden=true;message("form-message","");
  }
  $("cancel-edit").addEventListener("click",resetForm);
  $("property-form").addEventListener("submit",async e=>{
    e.preventDefault();$("save-button").disabled=true;message("form-message","Saving property…");
    try{
      const id=$("property-id").value||crypto.randomUUID();
      const existing=properties.find(p=>p.id===id);
      let photoUrls=existing?.photos||[];
      const selected=[...$("photos").files];
      if(selected.length){
        for(const file of selected){
          const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
          const path=`${id}/${Date.now()}-${safe}`;
          const {error:uploadError}=await db.storage.from("property-photos").upload(path,file,{upsert:false});
          if(uploadError)throw uploadError;
          const {data}=db.storage.from("property-photos").getPublicUrl(path);
          photoUrls.push(data.publicUrl);
        }
      }
      const record={
        id,title:$("title").value.trim(),address:$("address").value.trim(),city:$("city").value.trim(),
        state:$("state").value.trim().toUpperCase(),zip_code:$("zip").value.trim()||null,
        price:$("price").value?Number($("price").value):null,bedrooms:$("bedrooms").value?Number($("bedrooms").value):null,
        bathrooms:$("bathrooms").value?Number($("bathrooms").value):null,square_feet:$("sqft").value?Number($("sqft").value):null,
        status:$("status").value,description:$("description").value.trim(),photos:photoUrls,
        featured:$("featured").checked,published:$("published").checked
      };
      const {error}=await db.from("properties").upsert(record);
      if(error)throw error;
      message("form-message","Property saved successfully.");resetForm();await loadProperties();
    }catch(err){message("form-message",err.message||"Unable to save property.",true);}
    finally{$("save-button").disabled=false;}
  });
})();
