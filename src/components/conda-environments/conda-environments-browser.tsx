import React, { useContext, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';
import { CondaEnvironmentsList } from './conda-environments-list';
import { CondaEnvironmentDetail } from './conda-environment-detail';
import { CreateEnvironmentDialog } from './create-environment-dialog';
import { ImportEnvironmentDialog } from './import-environment-dialog';
import { SharingScopesContext } from '../../contexts/SharingScopesContext';
import { UserInfoContext } from '../../contexts/UserInfoContext';
import { useCatalogueList } from '../../hooks/use-catalogue-list';
import { ISharingScope } from '../../types/NaaVRECatalogue/assets';
import { SettingsContext } from '../../settings';
import { useUserInfo } from '../../hooks/use-user-info';

export function CondaEnvironmentsBrowser() {
  const settings = useContext(SettingsContext);
  const userInfo = useUserInfo();

  const { response: sharingScopesResponse } = useCatalogueList<ISharingScope>({
    catalogueServiceUrl: settings.catalogueServiceUrl,
    path: 'sharing-scopes',
    initialSearchParams: '?page_size=100',
    getAllPages: true
  });

  const [selectedEnv, setSelectedEnv] = useState<ICondaEnvironment | null>(
    null
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Bump this to force list refresh
  const [listKey, setListKey] = useState(0);

  const refreshList = () => setListKey(k => k + 1);

  return (
    <SharingScopesContext.Provider
      value={sharingScopesResponse?.results || null}
    >
      <UserInfoContext.Provider value={userInfo}>
        <Stack spacing={2}>
          {/* Toolbar */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Environments
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCreateOpen(true)}
            >
              Create manually
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setImportOpen(true)}
            >
              Import env
            </Button>
          </Stack>

          {/* Main area: list + optional detail panel side-by-side */}
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
              <CondaEnvironmentsList
                key={listKey}
                selectedUrl={selectedEnv?.url ?? null}
                onSelect={env => {
                  setSelectedEnv(prev =>
                    prev?.url === env.url ? null : env
                  );
                }}
              />
            </Stack>

            {selectedEnv && (
              <Stack sx={{ width: 460, flexShrink: 0 }}>
                <CondaEnvironmentDetail
                  environment={selectedEnv}
                  onClose={() => setSelectedEnv(null)}
                  onUpdated={updated => setSelectedEnv(updated)}
                />
              </Stack>
            )}
          </Stack>
        </Stack>

        <CreateEnvironmentDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={env => {
            setCreateOpen(false);
            setSelectedEnv(env);
            refreshList();
          }}
        />

        <ImportEnvironmentDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={env => {
            setImportOpen(false);
            setSelectedEnv(env);
            refreshList();
          }}
        />
      </UserInfoContext.Provider>
    </SharingScopesContext.Provider>
  );
}
