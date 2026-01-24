
export async function getEPG(hours = 24) {
  const res = await fetch(`/api/epg?hours=${hours}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`EPG request failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}
