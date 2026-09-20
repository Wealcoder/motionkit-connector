(() => {
  var B = "__motionkitPresetHandlers";
  function ie() {
    return typeof window == "undefined"
      ? new Map()
      : (window[B] || (window[B] = new Map()), window[B]);
  }
  function q(t, e) {
    if (!t || typeof e != "function") return;
    let r = ie();
    if (r.has(t)) return;
    let o = e() || {};
    r.set(t, {
      key: t,
      run: typeof o.run == "function" ? o.run : function () {},
      teardown: typeof o.teardown == "function" ? o.teardown : function () {},
    });
  }
  var y = { DRAFT: "draft", SAVED: "saved", PUBLISHED: "published" },
    se = [y.DRAFT, y.SAVED, y.PUBLISHED],
    ce = "preview";
  function le(t) {
    return !t || typeof t != "object"
      ? y.PUBLISHED
      : se.indexOf(t.status) !== -1
      ? t.status
      : t.status === ce || t.isPublished === !1
      ? y.SAVED
      : y.PUBLISHED;
  }
  function F(t) {
    return le(t) !== y.DRAFT;
  }
  function ue() {
    return typeof window == "undefined"
      ? {}
      : window.__motionkitHostData || window.motionkitData || {};
  }
  function N() {
    return ue().motionkit_token || null;
  }
  var U = () =>
    typeof window == "undefined"
      ? !1
      : window.location.search.includes("action=motionkit-editor")
      ? !0
      : !!N();
  var k = "__motionkitOwnership";
  function T() {
    let t = typeof window != "undefined" ? window : globalThis;
    return (
      t[k] ||
        (t[k] = {
          ownerByEl: new WeakMap(),
          elsByAnim: new Map(),
          animsByAnim: new Map(),
          resetByAnim: new Map(),
        }),
      t[k]
    );
  }
  T();
  function W(t, e) {
    t && T().animsByAnim.set(t, e || []);
  }
  function $(t, e) {
    !t || typeof e != "function" || T().resetByAnim.set(t, e);
  }
  function fe(t, e, r) {
    let o = t.elsByAnim.get(e);
    o || ((o = new Set()), t.elsByAnim.set(e, o)), o.add(r);
  }
  function P(t, e) {
    if (!e || !t || !t.length) return !1;
    let r = T(),
      o = new Map();
    return (
      t.forEach((n) => {
        var i;
        if (!n) return;
        let c = r.ownerByEl.get(n);
        c && c !== e && (o.has(c) || o.set(c, []), o.get(c).push(n)),
          r.ownerByEl.set(n, e),
          fe(r, e, n),
          (i = n.setAttribute) == null ||
            i.call(n, "data-motionkit-anim-id", e);
      }),
      o.size
        ? (o.forEach((n, c) => {
            (r.animsByAnim.get(c) || []).forEach((l) => {
              var s;
              try {
                (s = l.pause) == null || s.call(l);
              } catch (u) {}
            });
            let i = r.resetByAnim.get(c);
            if (i)
              try {
                i(n);
              } catch (l) {
                console.warn("[motionkit] ownership reset error:", l);
              }
          }),
          !0)
        : !1
    );
  }
  function G(t) {
    let e = T(),
      r = e.elsByAnim.get(t);
    r &&
      (r.forEach((o) => {
        e.ownerByEl.get(o) === t && e.ownerByEl.delete(o);
      }),
      e.elsByAnim.delete(t)),
      e.animsByAnim.delete(t),
      e.resetByAnim.delete(t);
  }
  var D = "__motionkitScreen";
  function z(t) {
    let e = t || (typeof window != "undefined" ? window : null);
    return e
      ? (e[D] || (e[D] = { held: !1, queue: [], deadline: 12e3 }), e[D])
      : { held: !1, queue: [], deadline: 12e3 };
  }
  function Y(t) {
    try {
      t();
    } catch (e) {
      console.error("[motionkit] a screen-release waiter threw", e);
    }
  }
  function V(t) {
    return z(t).held === !0;
  }
  function I(t, e) {
    let r = z(t);
    if (!r.held) {
      Y(e);
      return;
    }
    let o = !1,
      n = () => {
        o || ((o = !0), Y(e));
      };
    r.queue.push(n);
    let c = t || window;
    c && typeof c.setTimeout == "function" && c.setTimeout(n, r.deadline + 400);
  }
  var R = "__motionkitSplits",
    j = "__no_owner__";
  function C() {
    let t = typeof window != "undefined" ? window : globalThis;
    return (
      t[R] || (t[R] = { bySig: new Map(), elKeys: new WeakMap(), seq: 0 }), t[R]
    );
  }
  function ae(t) {
    if (typeof t == "string") return t;
    if (!t || t.nodeType !== 1) return String(t);
    let e = C(),
      r = e.elKeys.get(t);
    return r || ((e.seq += 1), (r = `__el${e.seq}`), e.elKeys.set(t, r)), r;
  }
  function de(t, e) {
    return `${ae(t)}::${JSON.stringify(e || {})}`;
  }
  function pe(t, e) {
    if (typeof SplitText == "undefined") return null;
    try {
      return typeof SplitText.create == "function"
        ? SplitText.create(t, e)
        : new SplitText(t, e);
    } catch (r) {
      return console.warn("[motionkit] SplitText failed for", t, r), null;
    }
  }
  function we(t) {
    var e, r;
    try {
      (r = (e = t.split) == null ? void 0 : e.revert) == null || r.call(e);
    } catch (o) {}
  }
  function X(t, e, r) {
    if (!e) return null;
    let o = t || j,
      n = C(),
      c = de(e, r),
      i = n.bySig.get(c);
    if (i) return i.owners.add(o), i;
    let l = null;
    if (
      (n.bySig.forEach((a) => {
        !l && a.target === e && (l = a);
      }),
      l)
    )
      return l.owners.add(o), l;
    let s = pe(e, r);
    if (!s) return null;
    let u = { split: s, target: e, sig: c, owners: new Set([o]) };
    return n.bySig.set(c, u), u;
  }
  function J(t) {
    let e = t || j,
      r = C();
    r.bySig.forEach((o, n) => {
      o.owners.has(e) &&
        (o.owners.delete(e), o.owners.size === 0 && (we(o), r.bySig.delete(n)));
    });
  }
  function he(t) {
    return typeof t != "string" || t.includes("chars")
      ? "chars"
      : t.includes("words")
      ? "words"
      : t.includes("lines")
      ? "lines"
      : "chars";
  }
  function Q(t, e) {
    var o, n;
    if (!t) return null;
    let r = he(e);
    if ((o = t[r]) != null && o.length) return t[r];
    for (let c of ["chars", "words", "lines"])
      if ((n = t[c]) != null && n.length) return t[c];
    return null;
  }
  var ge = "data-motionkit-anim-id",
    ye = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "span",
      "div",
      "a",
      "img",
      "video",
      "button",
      "li",
      "ul",
      "ol",
      "section",
      "article",
      "header",
      "footer",
      "nav",
      "main",
      "aside",
    ];
  function me(t) {
    if (!t || typeof t != "string") return "";
    let e = t.trim();
    return e.startsWith(".") ||
      e.startsWith("#") ||
      e.startsWith("[") ||
      e.startsWith(":") ||
      e.includes(" ") ||
      e.includes(">") ||
      e.includes(",") ||
      ye.includes(e.toLowerCase())
      ? e
      : "." + e;
  }
  var Z = new Set();
  function Ee(t, e, r) {
    let o = t + "|" + e;
    Z.has(o) || (Z.add(o), console.warn(`[${t}] ${r}`));
  }
  function _(t, e, r) {
    if (!e || typeof e != "string") return [];
    let o = r || document,
      n = me(e);
    try {
      let c = o.querySelectorAll(n);
      if (c.length || n === e) return [...c];
    } catch (c) {}
    try {
      return [...o.querySelectorAll(e)];
    } catch (c) {
      return Ee(t, e, `invalid selector "${e}": ${c.message}`), [];
    }
  }
  function Se() {
    return {
      listeners: [],
      scrollTriggers: [],
      animations: [],
      elements: [],
      tweenRestores: [],
      structuralRestores: [],
      cleanups: [],
    };
  }
  function w(t, e, r) {
    try {
      r();
    } catch (o) {
      console.warn(`[${t}] ${e} teardown error:`, o);
    }
  }
  function ee(t, e, r) {
    r.listeners.forEach(({ el: n, type: c, fn: i, opts: l }) =>
      w(t, "listener", () => n.removeEventListener(c, i, l)),
    ),
      r.scrollTriggers.forEach((n) =>
        w(t, "scrollTrigger", () => (n == null ? void 0 : n.kill())),
      );
    let o =
      typeof window != "undefined" && window.ScrollTrigger
        ? window.ScrollTrigger.getById(e)
        : null;
    o && w(t, "scrollTrigger", () => o.kill()),
      r.animations.forEach((n) =>
        w(t, "animation", () => {
          var c, i;
          (c = n == null ? void 0 : n.revert) == null || c.call(n),
            (i = n == null ? void 0 : n.kill) == null || i.call(n);
        }),
      ),
      r.elements.forEach((n) =>
        w(t, "element", () => {
          var c;
          return (c = n == null ? void 0 : n.remove) == null
            ? void 0
            : c.call(n);
        }),
      ),
      r.tweenRestores.forEach((n) => w(t, "style", n)),
      r.structuralRestores.forEach((n) => w(t, "style", n)),
      w(t, "split", () => J(e));
    for (let n = r.cleanups.length - 1; n >= 0; n--)
      w(t, "cleanup", r.cleanups[n]);
  }
  function Te(t, e, r, o, n) {
    var c;
    return {
      id: e.id,
      targets: r,
      data: o,
      vars: e.vars || {},
      markers: ((c = e.vars) == null ? void 0 : c.markers) === !0 && U(),
      get triggers() {
        var s;
        let i =
            ((s = e.trigger) == null ? void 0 : s.selector) || e.triggerClass,
          l = i ? _(t, i) : [];
        return l.length ? l : r;
      },
      select: (i, l) => _(t, i, l),
      on(i, l, s, u) {
        i &&
          (i.addEventListener(l, s, u),
          n.listeners.push({ el: i, type: l, fn: s, opts: u }));
      },
      add(i) {
        return i && n.animations.push(i), i;
      },
      addScrollTrigger(i) {
        return i && n.scrollTriggers.push(i), i;
      },
      addElement(i) {
        return i && n.elements.push(i), i;
      },
      split(i, l) {
        let s = X(e.id, i, l);
        return s ? Q(s.split, l == null ? void 0 : l.type) || [] : [];
      },
      clearProps(i, l) {
        i && n.tweenRestores.push(() => gsap.set(i, { clearProps: l }));
      },
      restoreStyle(i, l) {
        if (!i) return;
        let s = {};
        l.forEach((u) => (s[u] = i.style[u])),
          n.structuralRestores.push(() => {
            l.forEach((u) => {
              var a;
              return (i.style[u] = (a = s[u]) != null ? a : "");
            });
          });
      },
      claim() {
        let i = P(r, e.id);
        return (
          i &&
            n.animations.forEach((l) => {
              var s;
              try {
                (s = l.invalidate) == null || s.call(l);
              } catch (u) {}
            }),
          i
        );
      },
      onCleanup(i) {
        typeof i == "function" && n.cleanups.push(i);
      },
    };
  }
  function te(t, e) {
    let r = e.label || t,
      o = e.requires || ["itemClass"];
    q(t, function () {
      let n = new Map();
      function c(s) {
        let u = n.get(s);
        u && (n.delete(s), G(s), ee(r, s, u));
      }
      function i() {
        for (let s of [...n.keys()]) c(s);
        typeof e.teardownGlobal == "function" &&
          w(r, "global", e.teardownGlobal);
      }
      function l(s) {
        var A;
        if (!s || typeof s != "object" || !F(s) || o.some((f) => !s[f])) return;
        let u,
          a = null;
        if (typeof e.resolve == "function") {
          let f = e.resolve(s, { select: (E, d) => _(r, E, d) });
          if (
            (Array.isArray(f)
              ? (u = f)
              : f && ((u = f.targets), (a = (A = f.data) != null ? A : null)),
            !u)
          )
            return;
        } else if (((u = _(r, s.itemClass)), !u.length)) return;
        if ((c(s.id), u.forEach((f) => f.setAttribute(ge, s.id)), s.mkInert))
          return;
        let g = Se(),
          x = Te(r, s, u, a, g);
        n.set(s.id, g);
        let m = () => {
          var E;
          if (n.get(s.id) !== g) return;
          try {
            e.build(s, x);
          } catch (d) {
            console.error(`[${r}] build failed:`, d),
              n.delete(s.id),
              ee(r, s.id, g);
            return;
          }
          W(s.id, g.animations),
            $(s.id, () =>
              g.tweenRestores.forEach((d) => w(r, "ownership reset", d)),
            );
          let f = (E = s.trigger) == null ? void 0 : E.type;
          f !== "click" && f !== "hover" && P(u, s.id);
        };
        V(window) ? I(window, m) : m();
      }
      return { run: l, teardown: i };
    });
  }
  var Ae = "motionkit-mk-image-cm-pa",
    ve = 1,
    _e = 12,
    xe = 72,
    be = 8;
  function Be(t) {
    let e = {
      topToBottom: "inset(0% 0% 100% 0%)",
      bottomToTop: "inset(100% 0% 0% 0%)",
      leftToRight: "inset(0% 100% 0% 0%)",
      rightToLeft: "inset(0% 0% 0% 100%)",
    };
    return e[t] || e.bottomToTop;
  }
  function re(t, e, r) {
    let o = { x: 0, y: 0, xPercent: 0, yPercent: 0 },
      n = r === "pixel" ? "x" : "xPercent",
      c = r === "pixel" ? "y" : "yPercent";
    return (
      t === "topToBottom"
        ? (o[c] = -e)
        : t === "bottomToTop"
        ? (o[c] = e)
        : t === "leftToRight"
        ? (o[n] = -e)
        : t === "rightToLeft" && (o[n] = e),
      o
    );
  }
  function ke(t, { withSweep: e }) {
    if (!e) return { wrap: null, sweep: null };
    let r = document.createElement("div");
    r.setAttribute("data-mk-cm-overlay", ""),
      Object.assign(r.style, {
        position: "absolute",
        inset: "0",
        pointerEvents: "none",
        borderRadius: "inherit",
        overflow: "hidden",
        zIndex: "2",
      });
    let o = document.createElement("div");
    return (
      Object.assign(o.style, {
        position: "absolute",
        top: "0",
        bottom: "0",
        width: "42%",
        left: "-58%",
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.64), transparent)",
        mixBlendMode: "overlay",
        transform: "skewX(-18deg)",
        opacity: "0",
      }),
      r.appendChild(o),
      t.appendChild(r),
      { wrap: r, sweep: o }
    );
  }
  te(Ae, {
    label: "imageCinematicMask",
    resolve(t, { select: e }) {
      let r = e(t.itemClass);
      if (!r.length) return null;
      let o = r.map((n) => n.parentElement).filter(Boolean);
      return { targets: [...r, ...o], data: { items: r } };
    },
    build(t, e) {
      let { triggerClass: r, trigger: { type: o, selector: n } = {} } = t,
        {
          direction: c = "bottomToTop",
          startScale: i = 1.28,
          sweep: l = !0,
          delay: s = 0,
          duration: u = 1.25,
          animationStart: a,
          animationCStart: g,
          ease: x = "expo.inOut",
        } = e.vars,
        m = n || r,
        A = a === "custom" ? g : a,
        f = o === "click" || o === "hover",
        E = o === "play_with_scroll" ? "power2.out" : x;
      e.data.items.forEach((d) => {
        let p = d.parentElement;
        if (!p) return;
        let M = l === !0 || l === "true";
        M &&
          getComputedStyle(p).position === "static" &&
          (e.restoreStyle(p, ["position"]), (p.style.position = "relative"));
        let { wrap: L, sweep: b } = ke(p, { withSweep: M });
        L && e.addElement(L),
          e.clearProps(
            p,
            "transform,opacity,visibility,clipPath,overflow,perspective",
          ),
          e.clearProps(
            d,
            "transform,opacity,visibility,filter,transformOrigin",
          );
        let ne = re(c, xe, "pixel"),
          oe = re(c, _e),
          v;
        if (o === "page_load") v = { delay: s };
        else if (f) v = { delay: s, paused: !0 };
        else {
          let h = o === "play_with_scroll";
          v = {
            delay: s,
            scrollTrigger: {
              trigger: m || p,
              start: A,
              ...(h ? { end: "bottom top" } : {}),
              scrub: h,
            },
          };
        }
        let O = {
            ...ne,
            rotationX: be,
            scale: 0.94,
            overflow: "hidden",
            transformPerspective: 1400,
            clipPath: Be(c),
          },
          H = {
            ...oe,
            scale: i,
            transformOrigin: "50% 50%",
            filter: "saturate(0.8) contrast(1.14)",
          };
        (o === "on_scroll" || o === "play_with_scroll") &&
          (gsap.set(p, O), gsap.set(d, H));
        let S = e.add(gsap.timeline(v));
        if (
          (S.set(p, O)
            .set(d, H)
            .to(
              p,
              {
                x: 0,
                y: 0,
                rotationX: 0,
                scale: 1,
                clipPath: "inset(0% 0% 0% 0%)",
                duration: u,
                ease: E,
              },
              0,
            )
            .to(
              d,
              {
                xPercent: 0,
                yPercent: 0,
                scale: ve,
                filter: "saturate(1) contrast(1)",
                duration: u * 1.08,
                ease: "power3.out",
              },
              0,
            ),
          b)
        ) {
          let h = u * 0.28;
          S.fromTo(
            b,
            { autoAlpha: 0, xPercent: 0 },
            {
              autoAlpha: 0.85,
              xPercent: 390,
              duration: Math.min(0.95, u),
              ease: "power2.inOut",
            },
            h,
          ).to(
            b,
            { autoAlpha: 0, duration: 0.22 },
            h + Math.min(0.74, u * 0.65),
          );
        }
        if (!f) return;
        let K = m ? e.select(m) : [];
        (K.length ? K : [p]).forEach((h) => {
          if (o === "click") {
            e.on(h, "click", () => {
              e.claim(), S.restart(!0);
            });
            return;
          }
          e.on(h, "mouseenter", () => {
            e.claim(), S.play();
          }),
            e.on(h, "mouseleave", () => S.reverse());
        });
      });
    },
  });
})();
