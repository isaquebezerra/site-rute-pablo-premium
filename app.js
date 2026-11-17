/* ==============================================================
   Rute & Pablo — App logic
   Nav | Reveal | Lightbox | Countdown | RSVP | Gifts | PIX modal
   ============================================================== */

(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  if (!C) { console.error("SITE_CONFIG missing"); return; }

  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const money = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ================ NAV ================
  const nav = $("#nav");
  const navMenu = $("#navMenu");
  const navToggle = $("#navToggle");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });
  navMenu.addEventListener("click", e => {
    if (e.target.tagName === "A") {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Maps button
  const mapsBtn = $("#mapsBtn");
  if (mapsBtn && C.venue?.mapsUrl) mapsBtn.href = C.venue.mapsUrl;

  // Current year
  const yearEl = $("#currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ================ REVEAL on scroll ================
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    $$(".reveal").forEach(el => el.classList.add("is-visible"));
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(el => io.observe(el));
  } else {
    $$(".reveal").forEach(el => el.classList.add("is-visible"));
  }

  // ================ LIGHTBOX ================
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lbClose = $("#lightboxClose");
  const lbPrev = $("#lightboxPrev");
  const lbNext = $("#lightboxNext");
  const galleryItems = $$(".gallery-item");
  let lbIndex = 0;

  function openLightbox(i) {
    lbIndex = i;
    const src = galleryItems[i]?.dataset.src;
    if (!src) return;
    lightboxImg.src = src;
    lightboxImg.alt = galleryItems[i].querySelector("img")?.alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function stepLightbox(dir) {
    lbIndex = (lbIndex + dir + galleryItems.length) % galleryItems.length;
    openLightbox(lbIndex);
  }
  galleryItems.forEach((it, i) => it.addEventListener("click", () => openLightbox(i)));
  lbClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
  lbPrev.addEventListener("click", () => stepLightbox(-1));
  lbNext.addEventListener("click", () => stepLightbox(1));
  document.addEventListener("keydown", e => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  // ================ COUNTDOWN ================
  const target = new Date(C.dateISO).getTime();
  const cdDays = $("#cdDays"), cdHours = $("#cdHours"), cdMinutes = $("#cdMinutes"), cdSeconds = $("#cdSeconds");
  function updateCountdown() {
    const now = Date.now();
    let diff = Math.max(0, target - now);
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
    const m = Math.floor(diff / 60000);    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    cdDays.textContent = String(d).padStart(3, "0");
    cdHours.textContent = String(h).padStart(2, "0");
    cdMinutes.textContent = String(m).padStart(2, "0");
    cdSeconds.textContent = String(s).padStart(2, "0");
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ================ RSVP ================
  const rsvpForm = $("#rsvpForm");
  const rsvpSubmit = $("#rsvpSubmit");
  const rsvpStatus = $("#rsvpStatus");
  rsvpForm.addEventListener("submit", async e => {
    e.preventDefault();
    rsvpStatus.className = "rsvp-status";
    rsvpStatus.textContent = "";
    const fd = new FormData(rsvpForm);
    const data = Object.fromEntries(fd.entries());
    if (!data.name || !data.attending) {
      rsvpStatus.className = "rsvp-status err";
      rsvpStatus.textContent = "Por favor, preencha nome e confirmação.";
      return;
    }
    rsvpSubmit.disabled = true;
    rsvpSubmit.textContent = "Enviando…";
    try {
      if (C.rsvp?.endpoint) {
        const res = await fetch(C.rsvp.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        rsvpStatus.className = "rsvp-status ok";
        rsvpStatus.textContent = "Recebido! Obrigado por confirmar. 💌";
        rsvpForm.reset();
      } else {
        // No endpoint set — graceful preview
        console.info("RSVP (sem endpoint configurado):", data);
        rsvpStatus.className = "rsvp-status ok";
        rsvpStatus.textContent = "Obrigado! Sua resposta foi registrada.";
        rsvpForm.reset();
      }
    } catch (err) {
      rsvpStatus.className = "rsvp-status err";
      rsvpStatus.textContent = "Houve um erro ao enviar. Tente novamente em instantes.";
    } finally {
      rsvpSubmit.disabled = false;
      rsvpSubmit.textContent = "Enviar confirmação";
    }
  });

  // ================ GIFTS — list and filters ================
  const gifts = (C.gifts || []).map((g, i) => ({ ...g, index: i }));
  const categories = ["Todos", ...Array.from(new Set(gifts.map(g => g.cat)))];
  const giftFilters = $("#giftFilters");
  const giftGrid = $("#giftGrid");
  let currentFilter = "Todos";

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gift-filter" + (cat === "Todos" ? " is-active" : "");
    btn.dataset.filter = cat;
    btn.textContent = cat;
    giftFilters.appendChild(btn);
  });

  function renderGifts() {
    const frag = document.createDocumentFragment();
    gifts.forEach(g => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "gift-card";
      card.dataset.cat = g.cat;
      card.dataset.index = g.index;
      card.setAttribute("aria-label", "Escolher " + g.name);
      card.innerHTML = `
        <div class="gift-image"><img src="${g.img || "assets/logo-rute-pablo.png"}" alt="${g.name}" loading="lazy" referrerpolicy="no-referrer"></div>
        <div class="gift-body">
          <span class="gift-cat">${g.cat}</span>
          <div class="gift-name">${g.name}</div>
          <div class="gift-price">${money(g.price)}</div>
        </div>`;
      card.addEventListener("click", () => openGiftModal(g));
      frag.appendChild(card);
    });
    giftGrid.appendChild(frag);
  }
  renderGifts();

  giftFilters.addEventListener("click", e => {
    const btn = e.target.closest(".gift-filter");
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    $$(".gift-filter", giftFilters).forEach(b => b.classList.toggle("is-active", b === btn));
    $$(".gift-card", giftGrid).forEach(card => {
      const show = currentFilter === "Todos" || card.dataset.cat === currentFilter;
      card.classList.toggle("gift-hidden", !show);
    });
  });

  // ================ GIFT MODAL ================
  const giftModal     = $("#giftModal");
  const giftModalImg  = $("#giftModalImg");
  const giftModalCat  = $("#giftModalCat");
  const giftModalTtl  = $("#giftModalTitle");
  const giftModalPrc  = $("#giftModalPrice");
  const payTabs       = $$(".pay-tab");
  const payPanels     = { pix: $("#payPix"), card: $("#payCard") };
  const giftModalClose = $("#giftModalClose");
  const copyPixBtn    = $("#copyPixBtn");
  const pixStatus     = $("#pixStatus");
  const cardCheckoutBtn = $("#cardCheckoutBtn");

  // Partial contribution UI
  const pixContribute       = $("#pixContribute");
  const pixMinBadge         = $("#pixMinBadge");
  const pixContributeText   = $("#pixContributeText");
  const pixContributeAmount = $("#pixContributeAmount");
  const pixQuickValues      = $("#pixQuickValues");
  const pixError            = $("#pixError");

  // PIX recipient display from config
  $("#pixKeyDisplay").textContent = C.pix.key;
  $("#pixRecipient").textContent  = C.pix.recipientName;
  $("#pixCity").textContent       = C.pix.cityDisplay;
  $("#pixQr").src                 = C.pix.qrImage;

  let currentGift = null;
  let currentPixAmount = 0;   // value to encode in PIX

  function openGiftModal(gift) {
    currentGift = gift;
    giftModalImg.src = gift.img || "assets/logo-rute-pablo.png";
    giftModalImg.alt = gift.name;
    giftModalCat.textContent = gift.cat;
    giftModalTtl.textContent = gift.name;
    giftModalPrc.textContent = money(gift.price);
    pixStatus.textContent = "";
    switchPayTab("pix");

    // Partial contribution for gifts ≥ R$ 1.000
    if (gift.price >= 1000) {
      const minimum = Math.max(100, Math.round(gift.price * 0.1 / 50) * 50);
      pixContribute.hidden = false;
      pixMinBadge.textContent = "Mínimo " + money(minimum);
      pixContributeText.textContent = `Este presente custa ${money(gift.price)}. Você pode contribuir com qualquer valor a partir de ${money(minimum)}.`;
      pixContributeAmount.min = minimum;
      pixContributeAmount.value = minimum;
      currentPixAmount = minimum;
      // Quick values
      const quicks = [minimum, minimum * 2, Math.round(gift.price * 0.5), gift.price].filter((v, i, a) => a.indexOf(v) === i);
      pixQuickValues.innerHTML = "";
      quicks.forEach(v => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = money(v);
        b.dataset.value = v;
        if (v === minimum) b.classList.add("is-active");
        b.addEventListener("click", () => {
          pixContributeAmount.value = v;
          currentPixAmount = v;
          $$("#pixQuickValues button").forEach(x => x.classList.remove("is-active"));
          b.classList.add("is-active");
          pixError.textContent = "";
        });
        pixQuickValues.appendChild(b);
      });
    } else {
      pixContribute.hidden = true;
      currentPixAmount = gift.price;
    }

    // Prepare card checkout URL
    if (C.infinitePay?.handle) {
      const amountCents = Math.round(currentPixAmount * 100);
      const nsu = "RP-" + Date.now();
      cardCheckoutBtn.href = buildInfinitePayUrl(gift, amountCents, nsu);
    }

    giftModal.classList.add("is-open");
    giftModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeGiftModal() {
    giftModal.classList.remove("is-open");
    giftModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  giftModalClose.addEventListener("click", closeGiftModal);
  giftModal.addEventListener("click", e => { if (e.target === giftModal) closeGiftModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && giftModal.classList.contains("is-open")) closeGiftModal(); });

  // Tabs
  function switchPayTab(which) {
    payTabs.forEach(t => t.classList.toggle("is-active", t.dataset.pay === which));
    Object.entries(payPanels).forEach(([k, el]) => el.classList.toggle("is-active", k === which));
  }
  payTabs.forEach(t => t.addEventListener("click", () => switchPayTab(t.dataset.pay)));

  // Live update when user types a custom amount
  pixContributeAmount?.addEventListener("input", () => {
    const v = Number(pixContributeAmount.value || 0);
    const min = Number(pixContributeAmount.min || 0);
    if (v < min) {
      pixError.textContent = "Valor mínimo: " + money(min);
    } else {
      pixError.textContent = "";
      currentPixAmount = v;
      $$("#pixQuickValues button").forEach(x => x.classList.toggle("is-active", Number(x.dataset.value) === v));
    }
  });

  // ================ PIX payload (EMV / Pix Copia e Cola) ================
  function emvField(id, value) {
    return id + String(value.length).padStart(2, "0") + value;
  }
  function normalizePixText(s, max) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, max);
  }
  function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
  function buildPixPayload(amount, reference) {
    const gui  = emvField("00", "BR.GOV.BCB.PIX");
    const key  = emvField("01", C.pix.key);
    const desc = emvField("02", ("PRESENTE " + reference).slice(0, 72));
    const merchantAccount = emvField("26", gui + key + desc);
    const additional = emvField("62", emvField("05", reference.slice(0, 25)));
    let payload =
      emvField("00", "01") +
      merchantAccount +
      emvField("52", "0000") +
      emvField("53", "986") +
      emvField("54", Number(amount).toFixed(2)) +
      emvField("58", "BR") +
      emvField("59", normalizePixText(C.pix.recipientNameUpper, 25)) +
      emvField("60", normalizePixText(C.pix.city, 15)) +
      additional +
      "6304";
    return payload + crc16(payload);
  }

  copyPixBtn.addEventListener("click", async () => {
    if (!currentGift) return;
    const amount = Number(currentPixAmount || currentGift.price);
    const min = Number(pixContributeAmount?.min || 0);
    if (currentGift.price >= 1000 && amount < min) {
      pixError.textContent = "Valor mínimo: " + money(min);
      return;
    }
    const ref = "RP" + Date.now().toString().slice(-10);
    const payload = buildPixPayload(amount, ref);
    try {
      await navigator.clipboard.writeText(payload);
      pixStatus.textContent = "Código PIX copiado! Abra o app do seu banco e cole no Pix Copia e Cola.";
    } catch {
      // Fallback: prompt
      window.prompt("Copie o código PIX abaixo:", payload);
      pixStatus.textContent = "Código pronto para copiar.";
    }
  });

  // ================ InfinitePay checkout URL ================
  function buildInfinitePayUrl(gift, amountCents, nsu) {
    const handle = C.infinitePay.handle;
    const name = encodeURIComponent("Presente de casamento — " + gift.name);
    // Public InfinitePay checkout URL format
    return `https://me.infinitepay.io/${handle}?amount=${amountCents}&description=${name}&order_nsu=${encodeURIComponent(nsu)}`;
  }

})();
