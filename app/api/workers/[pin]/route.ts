import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const SELECT_FIELDS =
  "pin,nombre,puesto,departamento,razon_social,hora_entrada,hora_salida,tolerancia_minutos,tiempo_comida_minutos,activo";

type Ctx = { params: Promise<{ pin: string }> };

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { pin: pinStr } = await ctx.params; // ✅ aquí
    const pin = Number(pinStr);

    if (!Number.isFinite(pin)) {
      return NextResponse.json({ error: "PIN inválido" }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("empleados")
      .select(SELECT_FIELDS)
      .eq("pin", pin)
      .maybeSingle();

    if (error) {
      console.error("Supabase GET error:", error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ empleado: data });
  } catch (e: any) {
    console.error("Route crash:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { pin: pinStr } = await ctx.params; // ✅ aquí
    const pin = Number(pinStr);

    if (!Number.isFinite(pin)) {
      return NextResponse.json({ error: "PIN inválido" }, { status: 400 });
    }

    const body = await req.json();

    const allowed = [
      "nombre",
      "puesto",
      "departamento",
      "razon_social",
      "hora_entrada",
      "hora_salida",
      "tolerancia_minutos",
      "tiempo_comida_minutos",
      "activo",
    ] as const;

    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) update[k] = body[k];
    }

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("empleados")
      .update(update)
      .eq("pin", pin)
      .select(SELECT_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("Supabase PATCH error:", error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ empleado: data });
  } catch (e: any) {
    console.error("Route crash:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
