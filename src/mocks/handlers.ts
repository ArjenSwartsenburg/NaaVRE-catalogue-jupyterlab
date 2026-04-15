import { delay, http, HttpResponse, matchRequestUrl } from 'msw';
import { INaaVREExternalServiceResponse } from '@naavre/communicator-jupyterlab';
import { getCellsList, patchCell } from './catalogue-service/workflow-cells';
import { getSharingScopesList } from './catalogue-service/sharing-scopes';
import { getUsersList } from './catalogue-service/users';
import {
  deleteNotebook,
  getNotebooksList,
  patchNotebook
} from './catalogue-service/notebook-files';
import {
  deleteCondaEnvironment,
  getCondaEnvironmentsList,
  patchCondaEnvironment
} from './catalogue-service/conda-environments';

function getExternalServiceHandler(
  method: string,
  origin: string,
  pathname: string,
  getExternalServiceResponse: (
    request: Request
  ) => Promise<INaaVREExternalServiceResponse>
) {
  return async ({ request }: { request: Request }) => {
    const actualBody = await request.clone().json();
    const queryUrl = new URL(actualBody.query.url);
    if (actualBody.query.method !== method) {
      return;
    }
    if (!matchRequestUrl(queryUrl, pathname, origin).matches) {
      return;
    }

    await delay(300);
    return HttpResponse.json(await getExternalServiceResponse(request));
  };
}

export const externalServiceHandlers = [
  http.get('/naavre-communicator/me', async () =>
    HttpResponse.json({
      sub: '00000000-0000-0000-0000-000000000000',
      preferred_username: 'test-user-2',
      name: null
    })
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'GET',
      'http://localhost:8000',
      '/sharing-scopes/',
      getSharingScopesList
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'GET',
      'http://localhost:8000',
      '/users/',
      getUsersList
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'GET',
      'http://localhost:8000',
      '/notebook-files/',
      getNotebooksList
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'PATCH',
      'http://localhost:8000',
      '/notebook-files/*/',
      patchNotebook
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'DELETE',
      'http://localhost:8000',
      '/notebook-files/*/',
      deleteNotebook
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'GET',
      'http://localhost:8000',
      '/workflow-cells/',
      getCellsList
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'PATCH',
      'http://localhost:8000',
      '/workflow-cells/*/',
      patchCell
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'GET',
      'http://localhost:8000',
      '/conda-environments/',
      getCondaEnvironmentsList
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'PATCH',
      'http://localhost:8000',
      '/conda-environments/*/',
      patchCondaEnvironment
    )
  ),
  http.post(
    '/naavre-communicator/external-service',
    getExternalServiceHandler(
      'DELETE',
      'http://localhost:8000',
      '/conda-environments/*/',
      deleteCondaEnvironment
    )
  )
];
