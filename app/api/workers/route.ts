import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("empleados") // <- confirma que tu tabla se llama EXACTO así
      .select(
        "pin,nombre,puesto,departamento,razon_social,hora_entrada,hora_salida,tolerancia_minutos,tiempo_comida_minutos,activo"
      )
      .order("pin", { ascending: true })
      .limit(10000);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ workers: data ?? [] });
  } catch (e: any) {
    console.error("Route crash:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
