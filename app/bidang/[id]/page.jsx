import { supabase } from "../../../src/lib/supabase";
import ClientPage from "./ClientPage";

export async function generateStaticParams() {
  const { data } = await supabase.from('bidang_upt').select('id');
  if (!data || data.length === 0) return [{ id: '1' }];
  return data.map((bidang) => ({
    id: bidang.id.toString(),
  }));
}

export default function Page() {
  return <ClientPage />;
}
