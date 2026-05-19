export const getBaseUrl = (): string => {
  const hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || "192.168.0.102";
  const port = 8000;
  return `http://${hostname}:${port}`;
};
