import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const sb = supabaseAdmin();

    // Trae todos y lo hacemos distinct en JS para evitar depender de SQL/raw
    const { data, error } = await sb
      .from("empleados")
      .select("puesto")
      .not("puesto", "is", null);

    if (error) {
      console.error("Supabase puestos error:", error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    const puestos = Array.from(
      new Set((data ?? []).map((r) => String(r.puesto).trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "es"));

    return NextResponse.json({ puestos });
  } catch (e: any) {
    console.error("Route crash:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
