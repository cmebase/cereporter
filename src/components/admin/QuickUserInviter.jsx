import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { UserPlus, Link2 } from "lucide-react";
import { toast } from "sonner";

function getErrorMessage(err) {
  // Axios-like
  const status = err?.response?.status;
  const dataMsg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.response?.data?.detail;

  if (status && dataMsg) return `${status}: ${dataMsg}`;
  if (status) return `${status}: Request failed`;
  return err?.message || "Request failed";
}

async function copyToClipboardWithFallback(text) {
  // Try modern API first
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // Fallback: create temp textarea + execCommand
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function QuickUserInviter() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  const [inviting, setInviting] = useState(false);
  const [linking, setLinking] = useState(false);

  const [generatedLink, setGeneratedLink] = useState("");

  const emailTrimmed = useMemo(() => email.trim(), [email]);

  const handleInvite = async () => {
    if (!emailTrimmed) {
      toast.error("Enter an email address");
      return;
    }

    setInviting(true);
    try {
      await base44.users.inviteUser(emailTrimmed, role);
      toast.success(`Invited ${emailTrimmed} as ${role}`);
      // Keep email if you want to generate setup link next; comment out if not desired
      // setEmail("");
      // setRole("user");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const handleCopySetupLink = async () => {
    if (!emailTrimmed) {
      toast.error("Enter an email address");
      return;
    }

    setLinking(true);
    try {
      // NOTE: Ensure this function exists in Base44.
      const res = await base44.functions.invoke("generatePasswordSetupLink", {
        email: emailTrimmed,
      });

      // Base44 responses can vary; handle both shapes safely
      const setupLink =
        res?.data?.setupLink ||
        res?.data?.url ||
        res?.setupLink ||
        res?.url;

      if (!setupLink) {
        toast.error("No setup link returned by generatePasswordSetupLink");
        console.error("generatePasswordSetupLink response:", res);
        return;
      }

      setGeneratedLink(setupLink);

      // Try to copy automatically but don't fail if it doesn't work
      try {
        await copyToClipboardWithFallback(setupLink);
        toast.success("Setup link generated (see below)");
      } catch {
        toast.success("Setup link generated (see below)");
      }
    } catch (err) {
      console.error("generatePasswordSetupLink error:", err);
      toast.error(getErrorMessage(err));
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card className="p-6 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
      <div className="flex items-center gap-3 mb-4">
        <UserPlus className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-slate-900">Quick Invite</h3>
      </div>

      <div className="space-y-3">
        <Input
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          disabled={inviting || linking}
          className="h-9"
        />

        <div className="flex gap-2">
          <Select value={role} onValueChange={setRole} disabled={inviting || linking}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleInvite}
            disabled={inviting || linking}
            className="h-9 bg-indigo-600 hover:bg-indigo-700"
          >
            {inviting ? "Inviting..." : "Invite"}
          </Button>

          <Button
            onClick={handleCopySetupLink}
            disabled={inviting || linking}
            variant="outline"
            className="h-9"
          >
            <Link2 className="w-4 h-4 mr-2" />
            {linking ? "Generating..." : "Copy Setup Link"}
          </Button>
        </div>

        {generatedLink && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <div className="text-xs font-medium text-green-900">
              ✓ Setup link generated - Click Copy or select text:
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                onClick={(e) => e.target.select()}
                onFocus={(e) => e.target.select()}
              />
              <Button
                onClick={async () => {
                  const copied = await copyToClipboardWithFallback(generatedLink);
                  toast.success(copied ? "Copied to clipboard!" : "Please select text and press Ctrl+C");
                }}
                variant="default"
                size="sm"
                className="h-9 bg-green-600 hover:bg-green-700"
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}