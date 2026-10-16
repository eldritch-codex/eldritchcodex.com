/* EldritchCodex · syntax highlighting, shell renderer, tab switcher, WebGL triangle, copy button. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const KEYWORDS = {
    cpp: new Set(("import export module class struct public private protected override virtual " +
      "void int float double bool char auto static inline const constexpr return for while if else " +
      "new delete default true false using namespace template typename nullptr").split(" ")),
    slang: new Set(("static struct return uint int float float2 float3 float4 void const in out inout " +
      "if else for true false").split(" ")),
  };

  function highlight(src, lang) {
    const kw = KEYWORDS[lang] || new Set();
    const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|(\b\d+(?:\.\d*)?f?\b)|([A-Za-z_]\w*)|([\s\S])/g;
    let out = "";
    let m;
    while ((m = re.exec(src))) {
      const [tok, com, str, num, id] = m;
      if (com) out += `<span class="t-com">${esc(com)}</span>`;
      else if (str) out += `<span class="t-str">${esc(str)}</span>`;
      else if (num) out += `<span class="t-num">${num}</span>`;
      else if (id) {
        const next = src.slice(re.lastIndex).match(/^\s*(\(|\{)/);
        if (kw.has(id)) out += `<span class="t-kw">${id}</span>`;
        else if (/^SV_/.test(id)) out += `<span class="t-attr">${id}</span>`;
        else if (next && next[1] === "(") out += `<span class="t-fn">${id}</span>`;
        else if (/^[A-Z]/.test(id) && src[m.index - 1] !== ".") out += `<span class="t-type">${id}</span>`;
        else out += id;
      } else out += esc(tok);
    }
    return out;
  }

  function renderCode(pre, id) {
    const el = document.getElementById(`src-${id}`);
    if (!el) return;
    const raw = el.textContent.replace(/^\n/, "").replace(/\s+$/, "");
    pre.innerHTML = highlight(raw, el.dataset.lang)
      .split("\n")
      .map((l) => `<span class="ln">${l || " "}</span>`)
      .join("");
  }

  function renderShell(pre, id) {
    const el = document.getElementById(`sh-${id}`);
    if (!el) return;
    const raw = el.textContent.replace(/^\n/, "").replace(/\s+$/, "");
    pre.innerHTML = raw
      .split("\n")
      .map((line) => {
        const idx = line.indexOf("#");
        const cmd = idx >= 0 ? esc(line.slice(0, idx)) : esc(line);
        const com = idx >= 0 ? `<span class="c">${esc(line.slice(idx))}</span>` : "";
        return `<span class="sh-ln"><span class="p">$ </span>${cmd}${com}</span>`;
      })
      .join("");
  }

  $$("pre.code[data-src]").forEach((pre) => renderCode(pre, pre.dataset.src));
  $$("pre.shell[data-shell]").forEach((pre) => renderShell(pre, pre.dataset.shell));

  $$("[data-tabgroup]").forEach((fig) => {
    const pre = $("pre.code", fig);
    fig.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-show]");
      if (!btn) return;
      $$("[data-show]", fig).forEach((b) => b.classList.toggle("active", b === btn));
      renderCode(pre, btn.dataset.show);
    });
  });

  const canvas = $("#triangle");
  if (canvas) {
    const gl = canvas.getContext("webgl", { antialias: true });
    if (gl) {
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return sh;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, `
        attribute vec2 aPos; attribute vec3 aCol;
        uniform float uT; uniform float uAspect;
        varying vec3 vCol;
        void main() {
          float c = cos(uT), s = sin(uT);
          vec2 p = mat2(c, -s, s, c) * aPos;
          p.x /= uAspect;
          gl_Position = vec4(p * 1.35, 0.0, 1.0);
          vCol = aCol;
        }`));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec3 vCol;
        void main() { gl_FragColor = vec4(vCol, 1.0); }`));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const buf = new Float32Array([
        0.0, 0.5, 1, 0, 0,
        0.5, -0.5, 0, 1, 0,
        -0.5, -0.5, 0, 0, 1,
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      const aCol = gl.getAttribLocation(prog, "aCol");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(aCol);
      gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 20, 8);

      const uT = gl.getUniformLocation(prog, "uT");
      const uAspect = gl.getUniformLocation(prog, "uAspect");
      const fpsEl = $("#fps");
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let visible = false, frames = 0, last = performance.now();

      const draw = (now) => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
        gl.clearColor(0.031, 0.035, 0.047, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uT, still ? 0 : now * 0.0003);
        gl.uniform1f(uAspect, w / h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        frames++;
        if (now - last > 500) {
          fpsEl.textContent = `${Math.round((frames * 1000) / (now - last))} fps`;
          frames = 0; last = now;
        }
        if (visible && !still) requestAnimationFrame(draw);
      };

      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) requestAnimationFrame(draw);
      }).observe(canvas);
    }
  }

  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = $(btn.dataset.copy)?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "copied";
      } catch {
        btn.textContent = "ctrl+c";
      }
      setTimeout(() => (btn.textContent = "copy"), 1500);
    });
  });
})();
