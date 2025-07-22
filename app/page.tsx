import supabase from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function Home() {
  const { data: events, error } = await supabase
    .from("click_events")
    .select("*")
    .order("timestamp", { ascending: false })

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📊 Pixel Dashboard</h1>
      {error && <p className="text-red-600">Error loading data: {error.message}</p>}
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-2 border">Client</th>
            <th className="text-left p-2 border">GCLID</th>
            <th className="text-left p-2 border">UTM Source</th>
            <th className="text-left p-2 border">Page URL</th>
            <th className="text-left p-2 border">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {events?.map((event) => (
            <tr key={event.id}>
              <td className="p-2 border">{event.client_id}</td>
              <td className="p-2 border">{event.gclid || "—"}</td>
              <td className="p-2 border">{event.utm_source || "—"}</td>
              <td className="p-2 border truncate max-w-xs">{event.page_url}</td>
              <td className="p-2 border">
                {format(new Date(event.timestamp), "yyyy-MM-dd HH:mm")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
