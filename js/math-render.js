/* Render teks soal: LaTeX ($...$, $$...$$) via KaTeX lokal, sisanya di-escape aman. */
const PatMath = (() => {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function plainHtml(s) {
    let out = esc(s);
    out = out.replace(/(^|[\s(\[])\*(\S(?:[^*\n]*?\S)?)\*(?=$|[\s.,;:!?)\]])/g, "$1<em>$2</em>");
    return out;
  }

  function tex(src, display) {
    if (window.katex) {
      try {
        return window.katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false, output: "html" });
      } catch (e) {}
    }
    return esc(display ? "$$" + src + "$$" : "$" + src + "$");
  }

  function html(text) {
    const s = String(text == null ? "" : text).replace(/\\\$/g, "\u0001");
    const re = /\$\$([\s\S]+?)\$\$|\$((?:\\[\s\S]|[^$\\\n])+)\$/g;
    let out = "", last = 0, m;
    while ((m = re.exec(s)) !== null) {
      const inline = m[2] !== undefined;
      const body = inline ? m[2] : m[1];
      if (inline && (/^\s/.test(body) || /\s$/.test(body))) {
        re.lastIndex = m.index + 1;
        continue;
      }
      out += plainHtml(s.slice(last, m.index));
      out += tex(body, !inline);
      last = m.index + m[0].length;
    }
    out += plainHtml(s.slice(last));
    return out.replace(/\u0001/g, "$");
  }

  return { html, esc };
})();
window.PatMath = PatMath;
