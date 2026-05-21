import { supabase } from "../../../src/lib/supabase";
import ClientPage from "./ClientPage";

export async function generateStaticParams() {
  const { data } = await supabase.from('gudang').select('id');
  if (!data || data.length === 0) return [{ id: '1' }];
  return data.map((g) => ({
    id: g.id.toString(),
  }));
}

export default function Page() {
  return <ClientPage />;
}
