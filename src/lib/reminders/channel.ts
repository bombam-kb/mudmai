export function shouldPushLine(input: {
  configured: boolean;
  reachable: boolean;
  optIn: boolean;
  lineUserId?: string | null;
}) {
  return Boolean(
    input.configured && input.optIn && input.reachable && input.lineUserId,
  );
}
