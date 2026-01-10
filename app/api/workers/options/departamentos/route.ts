import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("empleados")
      .select("departamento")
      .not("departamento", "is", null);

    if (error) {
      console.error("Supabase departamentos error:", error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    const departamentos = Array.from(
      new Set((data ?? []).map((r) => String(r.departamento).trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "es"));

    return NextResponse.json({ departamentos });
  } catch (e: any) {
    console.error("Route crash:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
