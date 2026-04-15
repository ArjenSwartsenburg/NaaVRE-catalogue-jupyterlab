import React, { useContext } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import RefreshIcon from '@mui/icons-material/Refresh';

import { CondaEnvironmentListItem } from './conda-environment-list-item';
import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';
import { ListFilters } from '../assets-browser/list-filters';
import { PageNav } from '../assets-browser/page-nav';
import { SettingsContext } from '../../settings';
import { useCatalogueList } from '../../hooks/use-catalogue-list';

export function CondaEnvironmentsList({
  selectedUrl,
  onSelect
}: {
  selectedUrl: string | null;
  onSelect: (env: ICondaEnvironment) => void;
}) {
  const settings = useContext(SettingsContext);

  const {
    setUrl,
    loading,
    errorMessage,
    setPaused,
    fetchResponse,
    response
  } = useCatalogueList<ICondaEnvironment>({
    catalogueServiceUrl: settings.catalogueServiceUrl,
    path: 'conda-environments',
    initialSearchParams: '?ordering=-created',
    startPaused: true
  });

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <ListFilters setUrl={setUrl} setPaused={setPaused} />
        <Tooltip title="Refresh">
          <IconButton
            aria-label="Refresh"
            style={{ borderRadius: '100%' }}
            onClick={() => fetchResponse()}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {errorMessage && (
        <Alert severity="error">{errorMessage}</Alert>
      )}

      {!loading && !errorMessage && response && (
        <>
          {response.results.length === 0 ? (
            <Alert severity="info">No conda environments to display.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Last updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {response.results.map(env => (
                  <CondaEnvironmentListItem
                    key={env.url}
                    environment={env}
                    selected={env.url === selectedUrl}
                    onSelect={onSelect}
                  />
                ))}
              </TableBody>
            </Table>
          )}
          <PageNav listResponse={response} setUrl={setUrl} />
        </>
      )}
    </Stack>
  );
}
