import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AssetsBrowser } from '../../components/assets-browser/assets-browser';
import { CondaEnvironmentsBrowser } from '../../components/conda-environments/conda-environments-browser';
import { assetKinds } from '../../components/assets-browser/asset-kinds';

export const Route = createFileRoute('/assets/$assetKindSlug')({
  component: RouteComponent
});

function RouteComponent() {
  const { assetKindSlug } = Route.useParams();
  const candidateAssetKinds = assetKinds.filter(a => a.slug === assetKindSlug);
  if (candidateAssetKinds.length !== 1) {
    throw Error(`Invalid asset kind: ${assetKindSlug}`);
  }
  const assetKind = candidateAssetKinds[0];

  if (assetKind.slug === 'conda-environments') {
    return <CondaEnvironmentsBrowser />;
  }

  return (
    <>
      <AssetsBrowser assetKind={assetKind} />
    </>
  );
}
