import { getBreadName, getTypeProfile } from "@/lib/bread";
import { buildShareSvg } from "@/lib/image";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await context.params;
  const supabase = getServiceSupabaseClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, name, needed_thing, generated_message")
    .eq("id", submissionId)
    .single();

  if (!data) {
    return new Response("not_found", { status: 404 });
  }

  const lines = data.generated_message
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);
  const breadName = getBreadName(data.needed_thing);
  const profile = getTypeProfile(data.needed_thing);
  const svg = buildShareSvg({
    title: `${data.name}님의 미래 레시피`,
    breadName,
    resultType: data.needed_thing || "프리즘 포춘형",
    typeName: profile.typeName,
    typeEmoji: profile.typeEmoji,
    lines
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120"
    }
  });
}
