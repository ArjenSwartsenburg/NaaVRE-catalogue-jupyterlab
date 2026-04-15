import { INaaVREExternalServiceResponse } from '@naavre/communicator-jupyterlab';
import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';

export const condaEnvironments: ICondaEnvironment[] = [
  {
    url: 'http://localhost:8000/conda-environments/aaaaaaaa-0000-0000-0000-000000000001/',
    owner: 'fixture-user-1',
    virtual_lab: 'test-virtual-lab-1',
    shared_with_scopes: ['test-community-1'],
    shared_with_users: [],
    title: 'ml-env',
    description: 'Machine learning environment with scikit-learn and torch',
    created: '2026-03-17T10:00:00.000000Z',
    modified: '2026-03-17T10:00:00.000000Z',
    environment_name: 'my-ml-env',
    python_version: '3.11.0',
    package_count: 42,
    created_date: '2026-03-17T10:00:00.000000Z',
    environment_file:
      'http://localhost:9000/dev-bucket/conda_environments/aaaaaaaa-0000-env.tar.gz',
    dependency_list:
      'http://localhost:9000/dev-bucket/dependency_lists/aaaaaaaa-0000-requirements.txt'
  },
  {
    url: 'http://localhost:8000/conda-environments/bbbbbbbb-0000-0000-0000-000000000002/',
    owner: 'test-user-2',
    virtual_lab: 'test-virtual-lab-2',
    shared_with_scopes: [],
    shared_with_users: [],
    title: 'geo-analysis-env',
    description: 'Geospatial analysis environment',
    created: '2026-02-10T09:30:00.000000Z',
    modified: '2026-02-10T09:30:00.000000Z',
    environment_name: 'geo-analysis',
    python_version: '3.10.12',
    package_count: 28,
    created_date: '2026-02-10T09:30:00.000000Z',
    environment_file: null,
    dependency_list:
      'http://localhost:9000/dev-bucket/dependency_lists/bbbbbbbb-0000-requirements.txt'
  },
  {
    url: 'http://localhost:8000/conda-environments/cccccccc-0000-0000-0000-000000000003/',
    owner: 'fixture-user-1',
    virtual_lab: 'test-virtual-lab-1',
    shared_with_scopes: ['test-virtual-lab-1'],
    shared_with_users: ['test-user-2'],
    title: 'bioinformatics-env',
    description: 'Bioinformatics tools including biopython',
    created: '2026-01-05T14:00:00.000000Z',
    modified: '2026-01-05T14:00:00.000000Z',
    environment_name: 'bioinformatics',
    python_version: '3.12.0',
    package_count: 65,
    created_date: '2026-01-05T14:00:00.000000Z',
    environment_file:
      'http://localhost:9000/dev-bucket/conda_environments/cccccccc-0000-env.tar.gz',
    dependency_list:
      'http://localhost:9000/dev-bucket/dependency_lists/cccccccc-0000-requirements.txt'
  }
];

export async function getCondaEnvironmentsList(
  _request: Request
): Promise<INaaVREExternalServiceResponse> {
  return {
    status_code: 200,
    reason: 'OK',
    headers: { 'content-type': 'application/json' },
    content: JSON.stringify({
      count: condaEnvironments.length,
      next: null,
      previous: null,
      results: condaEnvironments
    })
  };
}

export async function patchCondaEnvironment(
  request: Request
): Promise<INaaVREExternalServiceResponse> {
  const body = await request.clone().json();
  const queryUrl = new URL(body.query.url);
  const id = queryUrl.pathname.split('/').filter(Boolean).pop();
  const env = condaEnvironments.find(e => e.url.includes(id!));
  if (!env) {
    return {
      status_code: 404,
      reason: 'Not Found',
      headers: { 'content-type': 'application/json' },
      content: JSON.stringify({ detail: 'Not found' })
    };
  }
  return {
    status_code: 200,
    reason: 'OK',
    headers: { 'content-type': 'application/json' },
    content: JSON.stringify({ ...env, ...body.query.body })
  };
}

export async function deleteCondaEnvironment(
  _request: Request
): Promise<INaaVREExternalServiceResponse> {
  return {
    status_code: 204,
    reason: 'No Content',
    headers: { 'content-type': 'application/json' },
    content: JSON.stringify({})
  };
}
