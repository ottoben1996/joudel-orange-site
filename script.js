// Joudel — lightbox des créations + motion design.
// Tout le motion est coupé si prefers-reduced-motion ; sans JS, le site reste lisible (.anim absent).
(() => {
  "use strict";
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const racine = document.documentElement;
  racine.setAttribute("data-motion", "1"); // désarme le filet de sécurité du <head>
  const entete = document.querySelector(".entete");
  const hero = document.querySelector(".hero");
  const heroVisuel = document.querySelector(".hero-visuel");
  const piste = document.querySelector(".ruban-piste");
  const cartes = Array.from(document.querySelectorAll(".carte"));
  const dialog = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const nom = document.getElementById("lightbox-nom");
  const desc = document.getElementById("lightbox-desc");
  const fermer = dialog.querySelector(".lightbox-fermer");
  const prec = dialog.querySelector(".lightbox-prec");
  const suiv = dialog.querySelector(".lightbox-suiv");
  let courant = 0;

  /* ---------- lightbox ---------- */
  function afficher(i, fondu) {
    courant = (i + cartes.length) % cartes.length;
    const carte = cartes[courant];
    const source = carte.querySelector("img");
    const pose = () => {
      img.src = source.src;
      img.alt = source.alt;
      nom.textContent = carte.querySelector(".carte-nom").textContent;
      desc.textContent = carte.querySelector(".carte-desc").textContent;
      img.classList.remove("change");
    };
    if (fondu && !reduit) {
      img.classList.add("change");
      setTimeout(pose, 180);
    } else {
      pose();
    }
  }

  /* ---------- FLIP : l'image vole de la carte vers la lightbox ---------- */
  async function voler(source) {
    if (reduit || !source) return;
    const a = source.getBoundingClientRect();
    if (!a.width) { dialog.classList.remove("instant"); return; }
    try { await img.decode(); } catch (e) { /* image peut-être déjà décodée */ }
    const b = img.getBoundingClientRect();
    if (!b.width || !b.height) { dialog.classList.remove("instant"); return; }
    // .instant reste pendant tout le vol : un ancêtre transformé (le dialogue qui
    // s'ouvre) ferait dériver le clone positionné en fixed

    const clone = document.createElement("img");
    clone.className = "vol";
    clone.src = source.currentSrc || source.src;
    clone.alt = "";
    clone.style.width = a.width + "px";
    clone.style.height = a.height + "px";
    clone.style.visibility = "hidden";
    dialog.appendChild(clone);
    // un dialogue a un transform (même identité) : il devient le repère des enfants
    // en position fixed. On mesure l'origine réelle au lieu de la supposer.
    const o = clone.getBoundingClientRect();
    const dx = a.left - o.left;
    const dy = a.top - o.top;
    clone.style.transform = `translate(${dx}px, ${dy}px)`;
    clone.style.visibility = "";

    img.style.opacity = "0";     // la cible attend le clone
    source.style.opacity = "0";  // la carte libère son image : pas de double

    const echelle = b.width / a.width;
    const anim = clone.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(1)` },
      { transform: `translate(${dx + (b.left - a.left)}px, ${dy + (b.top - a.top)}px) scale(${echelle})` },
    ], { duration: 430, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    const atterrit = () => {
      clone.remove();
      img.style.opacity = "";
      source.style.opacity = "";
      dialog.classList.remove("instant");
    };
    anim.addEventListener("finish", atterrit, { once: true });
    anim.addEventListener("cancel", atterrit, { once: true });
  }

  cartes.forEach((carte, i) => {
    carte.addEventListener("click", () => {
      afficher(i, false);
      // la boîte s'installe sans transition : c'est l'image qui vole, pas le cadre
      if (!reduit) dialog.classList.add("instant");
      dialog.showModal();
      voler(carte.querySelector("img"));
    });
  });
  // filet : si une lightbox se ferme pendant le vol, images et cartes redeviennent visibles
  dialog.addEventListener("close", () => {
    img.style.opacity = "";
    dialog.classList.remove("instant");
    document.querySelectorAll(".carte img").forEach(i => { i.style.opacity = ""; });
  });
  fermer.addEventListener("click", () => dialog.close());
  prec.addEventListener("click", () => afficher(courant - 1, true));
  suiv.addEventListener("click", () => afficher(courant + 1, true));
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); afficher(courant - 1, true); }
    if (e.key === "ArrowRight") { e.preventDefault(); afficher(courant + 1, true); }
  });
  // clic sur le fond (hors boîte) ferme la lightbox
  dialog.addEventListener("click", (e) => {
    const r = dialog.getBoundingClientRect();
    const dedans = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
    if (!dedans) dialog.close();
  });

  /* ---------- hauteur d'entête (scroll-padding des ancres) ---------- */
  function mesureEntete() {
    racine.style.setProperty("--hauteur-entete", entete.offsetHeight + "px");
  }
  mesureEntete();
  window.addEventListener("resize", mesureEntete);

  /* ---------- rideau d'ouverture + montée du titre ---------- */
  const reveleTitre = () => document.querySelectorAll(".hero h1 .ligne-int")
    .forEach(el => el.classList.add("monte"));
  const rideau = document.querySelector(".rideau");
  let intro = false;
  if (!reduit && rideau) {
    let dejaVu = false;
    try { dejaVu = sessionStorage.getItem("joudel-intro") === "1"; } catch (e) { /* mode privé */ }
    if (dejaVu || location.search.indexOf("nointro") !== -1) {
      rideau.remove(); // déjà vu dans la session : on ne rejoue pas le rideau
    } else {
      intro = true;
      try { sessionStorage.setItem("joudel-intro", "1"); } catch (e) { /* sans stockage */ }
    }
  }
  if (!reduit) setTimeout(reveleTitre, intro ? 1100 : 80);

  /* ---------- révélations au scroll ---------- */
  const elements = [];
  [[".creations .section-tete", 0], [".maison-texte", 0], [".maison-visuel", 0.12], [".infos .section-tete", 0]]
    .forEach(([sel, retard]) => {
      document.querySelectorAll(sel).forEach(el => {
        el.setAttribute("data-reveal", "");
        el.style.setProperty("--retard", retard + "s");
        elements.push(el);
      });
    });
  document.querySelectorAll(".grille > li").forEach((li, i) => {
    li.setAttribute("data-reveal", "");
    li.style.setProperty("--retard", (i % 3) * 0.08 + "s"); // cascade par rangée
    elements.push(li);
  });
  document.querySelectorAll(".infos-bloc").forEach((bloc, i) => {
    bloc.setAttribute("data-reveal", "");
    bloc.style.setProperty("--retard", i * 0.1 + "s");
    elements.push(bloc);
  });
  if (!reduit && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("vu"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    elements.forEach(el => io.observe(el));
  } else {
    elements.forEach(el => el.classList.add("vu"));
  }

  /* ---------- lien de nav actif selon la section visible ---------- */
  const liens = Array.from(document.querySelectorAll(".nav a"));
  const sections = liens.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  // au clic, on marque tout de suite : l'observer ne refire pas si la cible est déjà visible
  liens.forEach(a => a.addEventListener("click", () => {
    liens.forEach(x => x.classList.toggle("actif", x === a));
  }));
  if ("IntersectionObserver" in window) {
    const ioNav = new IntersectionObserver((entrees) => {
      entrees.forEach(en => {
        if (en.isIntersecting) {
          liens.forEach(a => a.classList.toggle("actif", a.getAttribute("href") === "#" + en.target.id));
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(s => ioNav.observe(s));
  }

  /* ---------- boucle scroll : barre de lecture, entête, parallaxe, ruban ---------- */
  let dernierY = window.scrollY;
  let vitesseRuban = 1; // multiplicateur de vitesse, revient vers 1 quand on s'arrête
  let dernierT = performance.now();
  // le ruban est une animation CSS : on module son playbackRate (reste sur le compositeur,
  // pas de saut de phase) et on le met en pause au survol (WCAG 2.2.2).
  const animRuban = piste.getAnimations ? piste.getAnimations()[0] || null : null;
  let survolRuban = false;
  const ruban = document.querySelector(".ruban");
  ruban.addEventListener("mouseenter", () => { survolRuban = true; });
  ruban.addEventListener("mouseleave", () => { survolRuban = false; });

  function boucle(t) {
    const dt = Math.min((t - dernierT) / 1000, 0.1);
    dernierT = t;
    const y = window.scrollY;
    const maxY = racine.scrollHeight - window.innerHeight;

    racine.style.setProperty("--lu", maxY > 0 ? (y / maxY).toFixed(4) : 0);
    entete.classList.toggle("compacte", y > hero.offsetHeight * 0.6);
    // en haut de page, aucun lien de nav n'est actif
    if (y < 120) liens.forEach(a => a.classList.remove("actif"));

    // parallaxe douce du visuel héro, tant qu'il est à l'écran
    if (y < hero.offsetHeight + 200) {
      heroVisuel.style.setProperty("--py", (y * 0.12).toFixed(1) + "px");
    }
    // le ruban accélère avec la vitesse de scroll puis revient à son rythme
    const v = Math.abs(y - dernierY) / Math.max(dt, 0.001); // px/s
    const cible = survolRuban ? 0 : 1 + Math.min(v / 1400, 2.2);
    vitesseRuban += (cible - vitesseRuban) * Math.min(dt * 4, 1);
    // sous 2 % de vitesse, on colle à zéro : la pause au survol est un vrai arrêt, pas un ralenti
    if (animRuban) animRuban.playbackRate = vitesseRuban < 0.02 ? 0 : vitesseRuban;
    dernierY = y;

    if (document.visibilityState === "visible") {
      requestAnimationFrame(boucle);
    } else {
      // onglet caché : on s'arrête, on repart au retour
      document.addEventListener("visibilitychange", function reprise() {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", reprise);
          dernierT = performance.now();
          dernierY = window.scrollY;
          requestAnimationFrame(boucle);
        }
      });
    }
  }
  if (!reduit) {
    requestAnimationFrame(boucle); // le ruban reste l'animation CSS, on module sa vitesse
  } else {
    window.addEventListener("scroll", () => {
      const maxY = racine.scrollHeight - window.innerHeight;
      racine.style.setProperty("--lu", maxY > 0 ? (window.scrollY / maxY).toFixed(4) : 0);
      entete.classList.toggle("compacte", window.scrollY > hero.offsetHeight * 0.6);
    }, { passive: true });
  }

  /* ---------- boutons aimantés + curseur personnalisé (pointeur fin uniquement) ---------- */
  const pointeurFin = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (pointeurFin && !reduit) {
    document.querySelectorAll(".bouton").forEach(btn => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
        btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });

    const curseur = document.querySelector(".curseur");
    let cx = -100, cy = -100, px = -100, py = -100;
    let curseurActif = false;
    window.addEventListener("mousemove", (e) => {
      cx = e.clientX; cy = e.clientY;
      if (!curseurActif) {
        curseurActif = true;
        px = cx; py = cy;
        if (!dialog.open) racine.classList.add("has-curseur");
        requestAnimationFrame(suitCurseur);
      }
      curseur.classList.toggle("voir", !!e.target.closest(".carte") && !dialog.open);
    });
    document.addEventListener("mouseleave", () => {
      racine.classList.remove("has-curseur");
      curseurActif = false;
    });
    function suitCurseur() {
      if (!curseurActif) return;
      px += (cx - px) * 0.2; // inertie douce
      py += (cy - py) * 0.2;
      curseur.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      requestAnimationFrame(suitCurseur);
    }
    // dans la lightbox (top layer), le curseur natif reprend la main
    const obsDialog = new MutationObserver(() => {
      racine.classList.toggle("has-curseur", !dialog.open && curseurActif);
      if (dialog.open) curseur.classList.remove("voir");
    });
    obsDialog.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }

  /* ---------- année du pied ---------- */
  const annee = document.getElementById("annee");
  if (annee) annee.textContent = new Date().getFullYear();

  /* ---------- horaires : le jour courant est signalé ---------- */
  const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const aujourdhui = jours[new Date().getDay()];
  document.querySelectorAll("#horaires tr").forEach(tr => {
    if (tr.querySelector("th").textContent.trim() === aujourdhui) tr.classList.add("aujourd-hui");
  });
})();
