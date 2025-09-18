"use client";

import { LiveKitRoom, AudioConference } from "@livekit/components-react";
import "@livekit/components-styles";

interface LiveKitRoomWrapperProps {
  token: string;
  livekitUrl: string;
  onDisconnected: () => void;
}

export default function LiveKitRoomWrapper({
  token,
  livekitUrl,
  onDisconnected,
}: LiveKitRoomWrapperProps) {
  return (
    <LiveKitRoom
      key={token}
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onDisconnected}
      style={{ height: "500px" }}
    >
      <AudioConference />
    </LiveKitRoom>
  );
}
