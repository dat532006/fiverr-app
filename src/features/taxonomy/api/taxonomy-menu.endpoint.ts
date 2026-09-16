import type { AxiosInstance } from 'axios';
import { getHttpClient } from '../../../infrastructure/http/client';
import { decodeTaxonomyMenuResponse, type TopCategoryDto } from './taxonomy-menu.dto';

const TAXONOMY_MENU_PATH = '/api/cong-viec/lay-menu-loai-cong-viec';

export async function fetchTaxonomyMenu(
  client: AxiosInstance = getHttpClient(),
): Promise<readonly TopCategoryDto[]> {
  const response = await client.get<unknown>(TAXONOMY_MENU_PATH);
  return decodeTaxonomyMenuResponse(response.data);
}
