export const isObject = (val: unknown): val is object => {
  return typeof val === "object" && val !== null;
};
