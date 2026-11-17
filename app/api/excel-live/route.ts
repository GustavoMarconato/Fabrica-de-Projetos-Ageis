const ORION_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTrAmRWRlvQSllEj-89GAclvSIToZtr_CbPoNki_l0s3aSSdwrkNZyX64cLp5IiPg/pub?gid=1204955107&single=true&output=csv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const downloadUrl = new URL(ORION_SHEET_CSV_URL);
    downloadUrl.searchParams.set("_", Date.now().toString());

    const upstream = await fetch(downloadUrl.toString(), {
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok) {
      return Response.json(
        {
          error: "Não foi possível consultar o Google Planilhas.",
          status: upstream.status,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const csv = await upstream.text();

    if (!csv.includes("Data e hora") || !csv.includes("Janela de aplicação")) {
      return Response.json(
        { error: "A aba publicada não contém as colunas esperadas." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "inline; filename=Orion_Previsao_Horaria.csv",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return Response.json(
      { error: "A conexão com o Google Planilhas falhou." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
