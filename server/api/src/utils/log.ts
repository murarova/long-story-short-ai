export const logLine = (
  out: "stdout" | "stderr",
  payload: Record<string, unknown>
) => {
  const line = `${JSON.stringify(payload)}\n`;
  if (out === "stdout") process.stdout.write(line);
  else process.stderr.write(line);
};
