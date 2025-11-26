// src/utils/fileUtils.js

export const getLanguage = (filename = "") => {
  if (!filename) return "plaintext";

  const lower = filename.toLowerCase();

  // handle special filenames without extension
  if (lower === "dockerfile") return "dockerfile";
  if (lower === "makefile") return "makefile";

  const parts = lower.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";

  const map = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",

    ts: "typescript",
    tsx: "typescript",

    html: "html",
    htm: "html",

    css: "css",
    scss: "scss",
    less: "less",

    json: "json",
    jsonc: "json",

    md: "markdown",
    markdown: "markdown",

    sh: "shell",
    bash: "shell",
    zsh: "shell",

    py: "python",
    pyi: "python",

    java: "java",

    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",

    c: "c",
    h: "c",

    cs: "csharp",
    vb: "vb",

    rb: "ruby",
    php: "php",

    sql: "sql",

    yml: "yaml",
    yaml: "yaml",

    go: "go",
    rs: "rust",
    swift: "swift",
    kt: "kotlin",
    kts: "kotlin",
    dart: "dart",

    vue: "vue",
    svelte: "svelte",

    xml: "xml",
    svg: "xml",

    ini: "ini",
    toml: "toml",
    env: "plaintext",
    log: "plaintext",
    txt: "plaintext",
    conf: "plaintext",
  };

  return map[ext] || "plaintext";
};
