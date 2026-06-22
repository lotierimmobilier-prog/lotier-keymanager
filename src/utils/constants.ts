export const UNLIMITED_KEYS = -1;

export const isUnlimited = (value: number): boolean => {
  return value === -1 || value >= 999;
};

export const formatKeyLimit = (value: number): string => {
  return isUnlimited(value) ? 'Clés illimitées' : `${value} clés`;
};
