import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const removeFromDynamicCopy = (str) => {
  const regex = /\s*copy(_\d+)?$/i;

  return str.replace(regex, "").trim();
};

export const copyTitle = (mainTitle, sameTitle) => {
  if (sameTitle.length > 1) {
    return `${mainTitle} copy_${sameTitle.length}`;
  } else {
    return mainTitle + " copy";
  }
};

export const validateInput = (value, regex) => {
  if (value === "") {
    return false;
  } else if (regex.test(value)) {
    return false;
  } else {
    return true;
  }
};

export const validateStringFormat = (input) => {
  const pattern = /^(\w+:\s*[\w\d\-]+)(,\s*\w+:\s*[\w\d\-]+)*$/;
  return pattern.test(input);
};

export function deepSmartMerge(source, target, base = {}) {
  if (typeof source !== "object" || source === null) return source;
  if (typeof target !== "object" || target === null)
    return structuredClone(source);

  const merged = Array.isArray(source)
    ? structuredClone(source)
    : { ...structuredClone(source) };

  for (const key in source) {
    const srcVal = source[key];
    const tgtVal = target[key];
    const baseVal = base[key];

    if (Array.isArray(srcVal)) {
      merged[key] = mergeArrayObjects(srcVal, tgtVal ?? [], baseVal ?? []);
    } else if (typeof srcVal === "object" && srcVal !== null) {
      merged[key] = deepSmartMerge(srcVal, tgtVal || {}, baseVal || {});
    } else {
      const wasCustomized = JSON.stringify(tgtVal) !== JSON.stringify(baseVal);
      merged[key] = wasCustomized
        ? structuredClone(tgtVal)
        : structuredClone(srcVal);
    }
  }

  for (const key in target) {
    if (!(key in source)) {
      const tgtVal = target[key];
      const baseVal = base[key];

      const wasCustomized = JSON.stringify(tgtVal) !== JSON.stringify(baseVal);

      if (wasCustomized) {
        merged[key] = structuredClone(tgtVal);
      }
    }
  }

  return merged;
}

export const mergeArrayObjects = (sourceArr, targetArr = [], baseArr = []) => {
  const result = [];

  sourceArr.forEach((srcItem) => {
    const targetMatch = targetArr.find((tgtItem) => tgtItem.id === srcItem.id);
    const baseMatch = baseArr.find((baseItem) => baseItem.id === srcItem.id);

    if (targetMatch) {
      result.push(deepSmartMerge(srcItem, targetMatch, baseMatch));
    } else {
      result.push(structuredClone(srcItem));
    }
  });

  targetArr.forEach((tgtItem) => {
    const exists = result.find((item) => item.id === tgtItem.id);
    if (!exists) result.push(structuredClone(tgtItem)); // FIXED: Clone to prevent reference
  });

  return result;
};

export const isElementCustomized = (
  targetEl,
  sourceEl,
  device,
  deviceOrder,
  allAnimation
) => {
  const currentIndex = deviceOrder.indexOf(device);
  if (currentIndex <= 0) return false;

  const parentDevice = deviceOrder[currentIndex - 1];
  const parentList = allAnimation[parentDevice] || [];
  const parentElement = parentList.find((el) => el.id === targetEl.id);

  if (!parentElement) {
    return !deepEqual(targetEl, sourceEl);
  }

  return hasSignificantDifferences(targetEl, parentElement);
};

const deepEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 !== "object") return obj1 === obj2;
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deepEqual(item, obj2[index]));
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(
    (key) => keys2.includes(key) && deepEqual(obj1[key], obj2[key])
  );
};

const hasSignificantDifferences = (obj1, obj2) => {
  const significantKeys = new Set();

  const collectSignificantDifferences = (a, b, path = "") => {
    if (typeof a !== typeof b) {
      significantKeys.add(path);
      return;
    }

    if (typeof a === "object" && a !== null && b !== null) {
      const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

      for (const key of allKeys) {
        if (key === "id" || key === "title" || key === "type") continue;

        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in a) || !(key in b)) {
          const value = a[key] || b[key];
          if (isSignificantValue(value)) {
            significantKeys.add(currentPath);
          }
        } else if (!deepEqual(a[key], b[key])) {
          collectSignificantDifferences(a[key], b[key], currentPath);
        }
      }
    } else if (a !== b) {
      if (isSignificantValue(a) || isSignificantValue(b)) {
        significantKeys.add(path);
      }
    }
  };

  collectSignificantDifferences(obj1, obj2);
  return significantKeys.size > 0;
};

const isSignificantValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number" && value !== 0) return true;
  if (typeof value === "string" && value.trim() !== "") return true;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value) && value.length > 0) return true;
  if (typeof value === "object" && Object.keys(value).length > 0) return true;
  return false;
};

export function handleMediaQuery(mediaQuery = "", callback = () => {}) {
  const isMatched = window.matchMedia(mediaQuery);
  if (isMatched?.matches) {
    callback();
  }
}

