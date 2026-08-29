import type { ChannelId } from "@/lib/reminders/schema";

export function shouldPushLine(input: {
  channel: ChannelId;
  configured: boolean;
  reachable: boolean;
  optIn: boolean;
  lineUserId?: string | null;
}) {
  return Boolean(
    input.configured &&
      input.optIn &&
      input.reachable &&
      input.lineUserId &&
      input.channel === "LINE",
  );
}
