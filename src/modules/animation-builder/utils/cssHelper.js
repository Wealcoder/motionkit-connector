// Standard CSS units
const cssUnits = [
  { value: "px" },
  { value: "%" },
  { value: "em" },
  { value: "rem" },
  { value: "vh" },
  { value: "vw" },
  { value: "deg" },
  { value: "rad" },
  { value: "turn" },
  { value: "s" },
  { value: "ms" },
];

// Parse a CSS value string into { value, unit }
const ALLOWED_UNITS = new Set(cssUnits.map((u) => u.value));

export const isValidCssValue = (cssValue) => {
  if (!cssValue || typeof cssValue !== "string") return false;
  const trimmed = cssValue.trim();
  const numberPart = parseFloat(trimmed);
  if (Number.isNaN(numberPart)) return false;
  const unitPart = trimmed.replace(numberPart.toString(), "");
  return ALLOWED_UNITS.has(unitPart);
};

export const parseCssValue = (cssValue, defaultUnit = "px") => {
  if (!cssValue || typeof cssValue !== "string") {
    return { value: 0, unit: defaultUnit };
  }
  const trimmed = cssValue.trim();
  const numberPart = parseFloat(trimmed);
  if (!Number.isNaN(numberPart)) {
    const unitPart = trimmed.replace(numberPart.toString(), "");
    if (ALLOWED_UNITS.has(unitPart)) {
      return { value: numberPart, unit: unitPart };
    }
  }
  return { value: trimmed, unit: null };
};

// Convert number + unit into a valid CSS value
export const toCssValue = (value, unit) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  return `${value}${unit}`;
};
