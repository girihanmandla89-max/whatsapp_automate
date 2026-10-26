"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  Smartphone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  KeyRound,
  BatteryCharging,
} from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({ isOpen, onClose, clientId }) => {
  const [activeTab, setActiveTab] = useState<"qr" | "code">("qr");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState<string>("DISCONNECTED");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  // Poll connection status while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp?clientId=${clientId}`);
        const data = await res.json();
        setStatus(data.status);
        if (data.qrCodeDataUrl) setQrCodeUrl(data.qrCodeDataUrl);
        if (data.pairingCode) setPairingCode(data.pairingCode);
        if (data.deviceInfo) setDeviceInfo(data.deviceInfo);
      } catch (err) {
        console.error("Failed to check status:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen, clientId]);

  const handleStartConnection = async (forceFresh = false) => {
    setIsLoading(true);
    if (forceFresh || activeTab === "code") {
      setPairingCode(null);
      setQrCodeUrl(null);
    }
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          clientId,
          phoneNumber: activeTab === "code" ? phoneNumber : undefined,
          forceFresh,
        }),
      });
      const data = await res.json();
      setStatus(data.status);
      if (data.qrCodeDataUrl) setQrCodeUrl(data.qrCodeDataUrl);
      if (data.pairingCode) setPairingCode(data.pairingCode);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", clientId }),
      });
      setStatus("DISCONNECTED");
      setQrCodeUrl(null);
      setPairingCode(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel-glow max-w-md w-full p-6 rounded-2xl space-y-6 shadow-2xl relative border-cyan-500/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <Smartphone className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">WhatsApp Multi-Device Link</h3>
              <p className="text-xs text-slate-400 font-mono">CLIENT: {clientId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/5"
          >
            ✕
          </button>
        </div>

        {/* State: Connected */}
        {status === "CONNECTED" ? (
          <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_#10b981]">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Device Active & Connected</h4>
              <p className="text-xs text-slate-400 mt-1">Ready for automated AI messaging and lead flows</p>
            </div>

            <div className="p-3 rounded-lg bg-black/40 text-left text-xs font-mono space-y-1.5 border border-white/5">
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-emerald-400">{deviceInfo.phoneNumber || "+Connected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Battery:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5" /> 88%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Socket Protocol:</span>
                <span className="text-cyan-400">Multi-Device WebSockets</span>
              </div>
            </div>

            <CyberButton variant="danger" size="sm" onClick={handleDisconnect} className="w-full">
              Disconnect Session
            </CyberButton>
          </div>
        ) : (
          /* State: Pairing (QR Code or 8-Digit Pairing Code) */
          <div className="space-y-5">
            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-black/40 p-1 border border-white/5 text-xs font-medium">
              <button
                onClick={() => setActiveTab("qr")}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "qr"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                Scan QR Code
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "code"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                8-Digit Phone Code
              </button>
            </div>

            {/* Tab A: Dynamic QR Code */}
            {activeTab === "qr" && (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-slate-950 rounded-xl border border-white/10 flex flex-col items-center justify-center min-h-[220px]">
                  {qrCodeUrl ? (
                    <div className="p-3 bg-white rounded-2xl shadow-2xl flex items-center justify-center">
                      <img
                        src={qrCodeUrl}
                        alt="WhatsApp QR Code"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 py-6">
                      <QrCode className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                      <p className="text-xs text-slate-400">
                        Click below to initialize high-speed socket
                      </p>
                    </div>
                  )}
                </div>

                <CyberButton
                  variant="primary"
                  className="w-full"
                  onClick={() => handleStartConnection(true)}
                  isLoading={isLoading}
                  icon={<RefreshCw className="w-4 h-4 text-slate-950" />}
                >
                  {qrCodeUrl ? "Refresh QR Code" : "Generate Pairing QR"}
                </CyberButton>
              </div>
            )}

            {/* Tab B: 8-Digit Pairing Code */}
            {activeTab === "code" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">
                    Phone Number (Must Include Country Code, e.g., 91 or +91 for India)
                  </label>
                  <input
                    type="text"
                    placeholder="919876543210 (without spaces or dashes)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-cyan-500/30 text-white font-mono text-sm focus:border-cyan-400 outline-none placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: Enter your full WhatsApp registered number starting with country code (e.g. <strong>919876543210</strong>).
                  </p>
                </div>

                {pairingCode && (
                  <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/50 text-center space-y-2 animate-in zoom-in-95">
                    <span className="text-[11px] text-cyan-300 font-medium uppercase tracking-wide">
                      Enter this Code on your WhatsApp:
                    </span>
                    <p className="text-3xl font-mono font-extrabold text-cyan-300 tracking-wider select-all py-1">
                      {pairingCode}
                    </p>
                    <p className="text-[10px] text-amber-300 font-mono">
                      ⏱ Code expires in 60s. Enter it promptly on your phone.
                    </p>
                  </div>
                )}

                <CyberButton
                  variant="primary"
                  className="w-full"
                  onClick={() => handleStartConnection(true)}
                  isLoading={isLoading}
                >
                  {pairingCode ? "Generate New Code" : "Request 8-Digit Code"}
                </CyberButton>
              </div>
            )}

            <div className="text-[11px] text-slate-400 space-y-1.5 border-t border-white/5 pt-3">
              <p className="font-semibold text-slate-300 text-center">How to link on your phone:</p>
              <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-0.5">
                <li>Open WhatsApp on your phone</li>
                <li>Go to <strong>Settings</strong> (iOS) or <strong>⋮ Menu</strong> (Android)</li>
                <li>Tap <strong>Linked Devices</strong> ➔ <strong>Link a Device</strong></li>
                <li>Tap <strong>"Link with phone number instead"</strong> at the bottom</li>
                <li>Enter the 8-digit code shown above</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
