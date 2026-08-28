import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Use service-role key for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Accept-invite is public — no auth required
    const isPublicAction = req.method === "POST" && path === "admin-users";

    let callerAdmin: Record<string, unknown> | null = null;

    if (!isPublicAction) {
      // Extract and verify the caller's JWT
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify caller is an active admin
      const { data: admin, error: callerAdminError } = await supabaseAdmin
        .from("admins")
        .select("*")
        .eq("auth_id", user.id)
        .eq("status", "active")
        .single();

      if (callerAdminError || !admin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Not an active admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      callerAdmin = admin;

      // Verify caller is a superadmin for invite/management operations
      if (req.method === "POST" && callerAdmin.role !== "superadmin") {
        // Allow accept-invite without superadmin check (public action)
        const body = await req.clone().json().catch(() => ({}));
        if (body.action !== "accept-invite" && body.action !== "validate-invite") {
          return new Response(
            JSON.stringify({ error: "Forbidden: Only superadmins can manage admin users" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // GET /admin-users - List all admins
    if (req.method === "GET" && path === "admin-users") {
      const { data: admins, error } = await supabaseAdmin
        .from("admins")
        .select("id, username, email, status, role, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ data: admins }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /admin-users
    if (req.method === "POST" && path === "admin-users") {
      const body = await req.json();
      const { action } = body;

      // Invite a new admin
      if (action === "invite") {
        const { username, email } = body;

        if (!username || !email) {
          return new Response(
            JSON.stringify({ error: "Username and email are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check username uniqueness
        const { data: existingUsername } = await supabaseAdmin
          .from("admins")
          .select("id")
          .eq("username", username)
          .single();

        if (existingUsername) {
          return new Response(
            JSON.stringify({ error: "Username already taken" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check email uniqueness
        const { data: existingEmail } = await supabaseAdmin
          .from("admins")
          .select("id")
          .eq("email", email)
          .single();

        if (existingEmail) {
          return new Response(
            JSON.stringify({ error: "Email already registered" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate invite token
        const inviteToken = crypto.randomUUID();
        const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // Create admin record
        const { data: newAdmin, error: createError } = await supabaseAdmin
          .from("admins")
          .insert({
            username,
            email,
            status: "invited",
            invite_token: inviteToken,
            invite_expires: inviteExpires,
            invited_by: callerAdmin.id,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Create auth user and send invite
        const { data: authData, error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
              admin_id: newAdmin.id,
              username,
            },
            redirectTo: `${Deno.env.get("SITE_URL") || Deno.env.get("CLIENT_URL") || "https://pefalconsafaris.com"}/accept-invite?token=${inviteToken}`,
          });

        if (inviteError) {
          // Rollback: delete admin record if auth invite fails
          await supabaseAdmin.from("admins").delete().eq("id", newAdmin.id);
          throw inviteError;
        }

        // Update admin with auth_id
        if (authData?.user) {
          await supabaseAdmin
            .from("admins")
            .update({ auth_id: authData.user.id })
            .eq("id", newAdmin.id);
        }

        return new Response(
          JSON.stringify({ message: "Admin invited successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Resend admin invite
      if (action === "resend-invite") {
        const { admin_id } = body;

        if (!admin_id) {
          return new Response(
            JSON.stringify({ error: "Admin ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find admin with invited status
        const { data: admin, error: adminError } = await supabaseAdmin
          .from("admins")
          .select("*")
          .eq("id", admin_id)
          .eq("status", "invited")
          .single();

        if (adminError || !admin) {
          return new Response(
            JSON.stringify({ error: "Admin not found or not in invited status" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate new invite token
        const inviteToken = crypto.randomUUID();
        const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // Update invite token and expiry
        const { error: updateError } = await supabaseAdmin
          .from("admins")
          .update({
            invite_token: inviteToken,
            invite_expires: inviteExpires,
          })
          .eq("id", admin.id);

        if (updateError) {
          throw updateError;
        }

        // Resend invite email
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          admin.email,
          {
            data: {
              admin_id: admin.id,
              username: admin.username,
            },
            redirectTo: `${Deno.env.get("SITE_URL") || Deno.env.get("CLIENT_URL") || "https://pefalconsafaris.com"}/accept-invite?token=${inviteToken}`,
          }
        );

        if (inviteError) {
          throw inviteError;
        }

        return new Response(
          JSON.stringify({ message: "Invite resent successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate invite token (public — no auth required)
      if (action === "validate-invite") {
        const { token } = body;

        if (!token) {
          return new Response(
            JSON.stringify({ error: "Token is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: admin, error: adminError } = await supabaseAdmin
          .from("admins")
          .select("username, email, invite_expires")
          .eq("invite_token", token)
          .eq("status", "invited")
          .single();

        if (adminError || !admin) {
          return new Response(
            JSON.stringify({ error: "Invalid invite token" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (admin.invite_expires && new Date(admin.invite_expires) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Invite token has expired" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ username: admin.username, email: admin.email }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Accept admin invite
      if (action === "accept-invite") {
        const { invite_token, password } = body;

        if (!invite_token || !password) {
          return new Response(
            JSON.stringify({ error: "Invite token and password are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find admin by invite token
        const { data: admin, error: adminError } = await supabaseAdmin
          .from("admins")
          .select("*")
          .eq("invite_token", invite_token)
          .eq("status", "invited")
          .single();

        if (adminError || !admin) {
          return new Response(
            JSON.stringify({ error: "Invalid invite token" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check token expiry
        if (admin.invite_expires && new Date(admin.invite_expires) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Invite token has expired" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update user password
        if (!admin.auth_id) {
          return new Response(
            JSON.stringify({ error: "Admin account not properly initialized" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updatePasswordError } =
          await supabaseAdmin.auth.admin.updateUserById(admin.auth_id, {
            password,
          });

        if (updatePasswordError) {
          throw updatePasswordError;
        }

        // Update admin status to active
        const { error: updateAdminError } = await supabaseAdmin
          .from("admins")
          .update({
            status: "active",
            invite_token: null,
            invite_expires: null,
          })
          .eq("id", admin.id);

        if (updateAdminError) {
          throw updateAdminError;
        }

        return new Response(
          JSON.stringify({ message: "Admin account activated successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
