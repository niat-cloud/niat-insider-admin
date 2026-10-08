"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axios from "axios";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Step = "phone" | "otp";

const COOKIE_MAX_AGE_DAYS = 7;

function setAdminAccessCookie(token: string) {
  const maxAge = 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS;
  document.cookie = `admin_access_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "otp") {
      otpInputRef.current?.focus();
    }
  }, [step]);

  /**
   * Turns what people type into the +91XXXXXXXXXX form the backend expects:
   * "9398377986", "09398377986", "+91 93983 77986" and "+9398377986" (the
   * 91 left out) all become "+919398377986". A number that starts with "+"
   * and another country code is kept as typed. Returns null when it can't be
   * a phone number.
   */
  function normalizePhone(value: string): string | null {
    const raw = value.trim();
    const digits = raw.replace(/\D/g, "");
    const indianMobile = /^[6-9]\d{9}$/;
    if (indianMobile.test(digits)) return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith("0") && indianMobile.test(digits.slice(1))) return `+91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith("91") && indianMobile.test(digits.slice(2))) return `+${digits}`;
    if (raw.startsWith("+") && digits.length >= 11 && digits.length <= 15 && !digits.startsWith("91")) return `+${digits}`;
    return null;
  }

  async function handleSendOtp() {
    setError("");
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Enter your 10-digit mobile number, e.g. 9876543210 or +91 98765 43210.");
      return;
    }
    if (normalized !== phone.trim()) setPhone(normalized);
    const trimmed = normalized;
    setLoading(true);
    try {
      await api.post("/api/verification/otp/request/", {
        phone_number: trimmed,
        for: "login",
      });
      setStep("otp");
      setOtp("");
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { detail?: string; message?: string; error?: string } } };
      const status = ax.response?.status;
      const msg =
        ax.response?.data?.detail ??
        ax.response?.data?.message ??
        ax.response?.data?.error ??
        (status && status >= 500
          ? "The server couldn't send the OTP. Check the number, wait a minute and try again."
          : !ax.response
            ? "Couldn't reach the server. Check your connection and try again."
            : "Failed to send OTP");
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    const code = otp.trim();
    if (!code) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      // Same-origin route: it extracts the refresh token that Django only
      // sends as a cookie, so the session can be refreshed (see app/api/login).
      const { data } = await axios.post<{ access: string; refresh: string }>(
        "/api/login",
        { phone_number: phone.trim(), code }
      );
      const me = await api.get<{ role?: string }>("/api/auth/me/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      if ((me.data?.role || "").toLowerCase() !== "admin") {
        setError("This portal is restricted to admin users only.");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_access_token", data.access);
        localStorage.setItem("admin_refresh_token", data.refresh);
        setAdminAccessCookie(data.access);
      }
      router.push("/articles");
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          data?: {
            detail?: string;
            message?: string;
            non_field_errors?: string[];
          };
        };
      };
      const d = ax.response?.data;
      const msg =
        d?.detail ??
        (Array.isArray(d?.non_field_errors) ? d.non_field_errors[0] : undefined) ??
        d?.message ??
        "Invalid OTP";
      setError(typeof msg === "string" ? msg : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  function handleChangeNumber() {
    setStep("phone");
    setOtp("");
    setError("");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <h1 className="mb-8 text-center text-2xl font-bold text-white">
        NIAT Admin Portal
      </h1>
      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900 p-8 shadow-xl rounded-xl">
        <CardHeader className="p-0">
          {step === "otp" && (
            <p className="mb-4 text-sm text-zinc-400">
              OTP sent to {phone}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {step === "phone" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-zinc-200">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  disabled={loading}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
              <Button
                className="w-full bg-white text-black hover:bg-zinc-200"
                onClick={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-zinc-200">
                  Enter OTP
                </Label>
                <Input
                  ref={otpInputRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  disabled={loading}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
              <Button
                className="w-full bg-white text-black hover:bg-zinc-200"
                onClick={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-zinc-400 hover:text-zinc-200"
                onClick={handleChangeNumber}
                disabled={loading}
              >
                ← Change number
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
