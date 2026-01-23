export async function getEPG() {
  const res = await fetch("/api/epg");
  return res.json();
}
