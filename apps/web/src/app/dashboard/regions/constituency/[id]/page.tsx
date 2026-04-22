import { RegionDetailView } from '@/components/dashboard/region-detail-view';

export const dynamic = 'force-dynamic';

export default async function ConstituencyRegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RegionDetailView level="constituency" id={id} />;
}
