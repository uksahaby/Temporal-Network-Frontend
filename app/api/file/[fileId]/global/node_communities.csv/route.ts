import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await context.params;

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/file/${fileId}/global/node_communities.csv`,
      {
        headers: {
          Accept: "text/csv",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status },
      );
    }

    const csvData = await response.text();

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileId}_node_communities.csv"`,
      },
    });
  } catch (error) {
    console.error("Error proxying CSV to backend:", error);
    return NextResponse.json(
      { error: "Failed to fetch CSV from backend" },
      { status: 500 },
    );
  }
}
