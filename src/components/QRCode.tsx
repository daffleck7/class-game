"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeProps {
  roomCode: string;
}

export default function QRCode({ roomCode }: QRCodeProps) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${roomCode}`
      : `/play/${roomCode}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-xl">
        <QRCodeSVG value={url} size={200} />
      </div>
      <p className="text-gray-400 text-sm break-all text-center max-w-xs">{url}</p>
    </div>
  );
}
