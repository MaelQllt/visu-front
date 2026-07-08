import Api from '@terralego/core/modules/Api';
import { getExtent } from '@terralego/core/modules/Visualizer/services/search';

export { getExtent };

const unfilteredTotalCache = {};

export const fetchTableDataGeoAPI = async ({
  layer,
  fields,
  form,
  page = 0,
  pageSize = 25,
  query,
  boundingBox,
  sort,
  filters = {},
}) => {
  const params = new URLSearchParams();

  params.set('limit', String(pageSize));
  params.set('offset', String(page * pageSize));

  if (fields && fields.length > 0) {
    params.set('fields', fields.map(f => f.value).join(','));
  }

  if (query) {
    params.set('search', query);
  }

  if (boundingBox) {
    const [topLeft, bottomRight] = boundingBox;
    params.set('bbox', `${topLeft[0]},${bottomRight[1]},${bottomRight[0]},${topLeft[1]}`);
  }

  if (sort) {
    params.set('ordering', sort);
  }

  const formMap = {};
  if (form) {
    form.forEach(entry => {
      if (entry?.property) {
        formMap[entry.property] = entry;
      }
    });
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return;

    const formEntry = formMap[key];
    if (formEntry?.type === 'range' && Array.isArray(value) && value.length === 2) {
      params.set(key, `${value[0]}-${value[1]}`);
    } else if (Array.isArray(value)) {
      params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  });

  const path = `geo-api/${layer}/feature/?${params.toString()}`;
  const data = await Api.request(path);

  if (!(layer in unfilteredTotalCache)) {
    const totalData = await Api.request(`geo-api/${layer}/feature/?limit=0`);
    unfilteredTotalCache[layer] = totalData.count || 0;
  }

  return {
    hits: data.results || [],
    total: data.count || 0,
    unfilteredTotal: unfilteredTotalCache[layer],
  };
};

export const fetchFeatureGeoAPI = async ({ layer, identifier }) => {
  const data = await Api.request(`geo-api/${layer}/feature/${identifier}/`);
  return data;
};

export const fetchExtentByIds = async ({ layer, ids }) => {
  const data = await Api.request(`geo-api/${layer}/feature/extent/?identifier=${ids.join(',')}`);
  return data.bbox;
};
