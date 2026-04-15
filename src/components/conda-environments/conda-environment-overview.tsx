import React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';

function OverviewRow({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value ?? '—'}</Typography>
    </Stack>
  );
}

function artifactState(env: ICondaEnvironment): string {
  return env.environment_file ? 'ready' : 'no artifact';
}

export function CondaEnvironmentOverview({
  environment
}: {
  environment: ICondaEnvironment;
}) {
  const id = environment.url.split('/').filter(Boolean).pop();

  return (
    <Stack spacing={1} sx={{ py: 1 }}>
      <OverviewRow label="ID" value={id} />
      <OverviewRow
        label="Created"
        value={environment.created ? environment.created.slice(0, 10) : null}
      />
      <OverviewRow
        label="Updated"
        value={environment.modified ? environment.modified.slice(0, 10) : null}
      />
      <OverviewRow
        label="Python version"
        value={environment.python_version || null}
      />
      <OverviewRow
        label="Package count"
        value={
          environment.package_count != null
            ? String(environment.package_count)
            : null
        }
      />
      <OverviewRow label="Artifact state" value={artifactState(environment)} />
      {environment.environment_file && (
        <OverviewRow
          label="Artifact key"
          value={
            <Typography
              variant="body2"
              sx={{
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.75rem'
              }}
            >
              {environment.environment_file}
            </Typography>
          }
        />
      )}
    </Stack>
  );
}
