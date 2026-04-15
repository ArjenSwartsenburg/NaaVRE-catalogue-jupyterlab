import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

const API_NAMESPACE = 'naavre-catalogue';

export async function requestCondaAPI<T>(
  endpoint: string,
  init: RequestInit = {}
): Promise<T> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(settings.baseUrl, API_NAMESPACE, endpoint);

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as Error);
  }

  let data: any = await response.text();
  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(
      response,
      data?.message || String(data)
    );
  }

  return data as T;
}

export interface ICondaPackRequest {
  environment_name: string;
  upload_url: string;
}

export interface ICondaPackResponse {
  file_size: number;
}

export interface ICondaInstallRequest {
  download_url: string;
  environment_name: string;
}

export interface ICondaInstallResponse {
  success: boolean;
  message: string;
}

export function packCondaEnvironment(
  req: ICondaPackRequest
): Promise<ICondaPackResponse> {
  return requestCondaAPI<ICondaPackResponse>('conda/pack', {
    method: 'POST',
    body: JSON.stringify(req),
    headers: { 'Content-Type': 'application/json' }
  });
}

export function installCondaEnvironment(
  req: ICondaInstallRequest
): Promise<ICondaInstallResponse> {
  return requestCondaAPI<ICondaInstallResponse>('conda/install', {
    method: 'POST',
    body: JSON.stringify(req),
    headers: { 'Content-Type': 'application/json' }
  });
}
