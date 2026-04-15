import React from 'react';
import Chip from '@mui/material/Chip';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';

function ArtifactStatusChip({
  environmentFile
}: {
  environmentFile: string | null;
}) {
  const ready = environmentFile !== null && environmentFile !== '';
  return (
    <Chip
      label={ready ? 'ready' : 'no artifact'}
      color={ready ? 'success' : 'default'}
      size="small"
      variant="outlined"
    />
  );
}

export function CondaEnvironmentListItem({
  environment,
  selected,
  onSelect
}: {
  environment: ICondaEnvironment;
  selected: boolean;
  onSelect: (env: ICondaEnvironment) => void;
}) {
  return (
    <TableRow
      hover
      selected={selected}
      onClick={() => onSelect(environment)}
      sx={{ cursor: 'pointer' }}
    >
      <TableCell>
        <Typography variant="body2" fontWeight={selected ? 600 : 400}>
          {environment.title}
        </Typography>
      </TableCell>
      <TableCell>
        <ArtifactStatusChip environmentFile={environment.environment_file} />
      </TableCell>
      <TableCell>
        <Typography variant="body2">{environment.owner ?? '—'}</Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {environment.modified
            ? environment.modified.slice(0, 10)
            : '—'}
        </Typography>
      </TableCell>
    </TableRow>
  );
}
