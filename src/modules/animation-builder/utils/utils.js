// formatter functions
export const toCamelCase = (str = "") => {
  if (!str || typeof str !== "string") return;
  return str
    .trim()
    .replace(/[^a-zA-Z0-9 ]+/g, "")
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
};

export const trimString = (str = "", limit = "full") => {
  if (!str) return;
  if (limit === "full") return str;
  if (str?.length > limit) {
    return str.slice(0, limit) + "...";
  }
  return str;
};

// utility functions
export const debounceFn = (mainFunction, delay = 300) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      mainFunction(...args);
    }, delay);
  };
};

export const generateUniqueId = () => {
  const timestamp = Date.now().toString(36); // Convert current time to base-36
  const randomPart = Math.random().toString(36).substring(2, 8); // Random alphanumeric string
  return `${timestamp}-${randomPart}`;
};
