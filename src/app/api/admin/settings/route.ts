// PUT /api/admin/settings — booking rules and feature flags.
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { saveSettings } from "@/lib/settings";

const ALLOWED = new Set([
  "slot_step_minutes",
  "max_advance_days",
  "cancellation_cutoff_hours",
  "auto_confirm",
  "notifications_enabled",
  "analytics_enabled",
  "booking_enabled",
  "whatsapp_enabled",
  "whatsapp_number",
]);

export async function PUT(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!ALLOWED.has(k)) continue;
      if (k === "whatsapp_number") {
        const digits = String(v ?? "").replace(/\D/g, "");
        if (v && (digits.length < 10 || digits.length > 15)) {
          return apiError("VALIDATION_ERROR", "Enter a valid WhatsApp number with country code.", 400);
        }
        patch[k] = digits;
        continue;
      }
      if (["slot_step_minutes", "max_advance_days", "cancellation_cutoff_hours"].includes(k)) {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 365) {
          return apiError("VALIDATION_ERROR", `Invalid value for ${k.replace(/_/g, " ")}.`, 400);
        }
        patch[k] = String(Math.round(n));
        continue;
      }
      patch[k] = v ? "true" : "false";
    }

    if (Object.keys(patch).length === 0) {
      return apiError("VALIDATION_ERROR", "Nothing to update.", 400);
    }
    await saveSettings(patch);
    return apiOk({ saved: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
