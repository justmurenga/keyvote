import { RegionDetailView } from '@/components/dashboard/region-detail-view';

export const dynamic = 'force-dynamic';

export default async function WardRegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RegionDetailView level="ward" id={id} />;
}
