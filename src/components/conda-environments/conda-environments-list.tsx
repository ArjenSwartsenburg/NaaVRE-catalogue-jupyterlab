import React, { useContext, useEffect, useState } from 'react';
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

import { CondaEnvironmentListItem, LocalOnlyCondaEnvironmentListItem } from './conda-environment-list-item';
import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';
import { ListFilters } from '../assets-browser/list-filters';
import { PageNav } from '../assets-browser/page-nav';
import { SettingsContext } from '../../settings';
import { useCatalogueList } from '../../hooks/use-catalogue-list';
import { getLocalCondaEnvs, ILocalCondaEnv } from '../../services/conda-server';

export function CondaEnvironmentsList({
  selectedUrl,
  onSelect,
  selectedLocalName,
  onSelectLocal
}: {
  selectedUrl: string | null;
  onSelect: (env: ICondaEnvironment) => void;
  selectedLocalName: string | null;
  onSelectLocal: (env: ILocalCondaEnv) => void;
}) {
  const settings = useContext(SettingsContext);

  const [localEnvs, setLocalEnvs] = useState<ILocalCondaEnv[]>([]);

  useEffect(() => {
    getLocalCondaEnvs()
      .then(res => {
        console.debug('[CondaEnvironmentsList] local envs:', res.envs);
        setLocalEnvs(res.envs);
      })
      .catch(err => {
        console.warn('[CondaEnvironmentsList] failed to get local envs:', err);
        setLocalEnvs([]);
      });
  }, []);

  const localEnvNames = new Set(localEnvs.map(e => e.name));

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

  const catalogueEnvNames = new Set(
    (response?.results ?? []).map(e => e.environment_name)
  );
  const localOnlyEnvs = localEnvs.filter(
    e => !catalogueEnvNames.has(e.name)
  );
  const hasAnyEnvs =
    (response?.results?.length ?? 0) > 0 || localOnlyEnvs.length > 0;

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
          {!hasAnyEnvs ? (
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
                    isLocal={localEnvNames.has(env.environment_name)}
                  />
                ))}
                {localOnlyEnvs.map(env => (
                  <LocalOnlyCondaEnvironmentListItem
                    key={`local-${env.name}`}
                    environmentName={env.name}
                    selected={env.name === selectedLocalName}
                    onSelect={() => onSelectLocal(env)}
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
