import { RegionDetailView } from '@/components/dashboard/region-detail-view';

export const dynamic = 'force-dynamic';

export default async function CountyRegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RegionDetailView level="county" id={id} />;
}
