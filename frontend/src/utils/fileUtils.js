export const getLanguage = (filename) => {
  if (filename.endsWith(".html")) return "html";
  if (filename.endsWith(".css")) return "css";
  if (filename.endsWith(".json")) return "json";
  if (filename.endsWith(".py")) return "python";
  return "javascript";
};
