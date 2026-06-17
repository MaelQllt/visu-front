import Api from '@terralego/core/modules/Api';
import searchInMap from './search';  // bloc ES debug

export const fetchNominatim = async ({
  query,
  translate,
  baseUrl,
  language = 'en',
  options: { viewbox = [] } = {},
}) => {
  const url = new URL(baseUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('accept-language', language);
  if (viewbox.length) {
    url.searchParams.set('viewbox', viewbox);
    url.searchParams.set('polygon_geojson', 1);
    url.searchParams.set('bounded', 1);
  }

  const headers = new Headers([['Content-Type', 'application/json']]);
  let results;
  try {
    results = await fetch(url, {
      headers,
    }).then(response => response.json());
  } catch (e) {
    return [];
  }
  // Filter to avoid duplicates location
  const filteredFeatures = results.features.reduce((list, result) => {
    if (!list.some(item => item.properties.display_name === result.properties.display_name)) {
      list.push(result);
    }
    return list;
  }, []);
  const data = [
    {
      total: filteredFeatures.length,
      group: translate('terralego.map.search_results.locations'),
      results: filteredFeatures.map(
        ({ bbox, properties: { osm_id: id, display_name: label } }) => ({
          label,
          id,
          bounds: bbox,
        }),
      ),
    },
  ];
  return data;
};

async function fetchLayerResults(layerName, query) {
  console.log(`[Search] geo-api ${layerName} q="${query}"`);
  try {
    // endpoint /geo-api
    const url = `${Api.host}/geo-api/${layerName}/feature/?search=${encodeURIComponent(query)}&limit=5`;
    const debut = performance.now();
    const response = await fetch(url);
    const data = await response.json();
    const fin = performance.now();
    if (!response.ok) {
      console.warn('[GeoAPI] fetchLayerResults not ok:', response.status, response.statusText);
      return { features: [], count: 0, timing: fin - debut };
    }
    return {
      features: (
        Array.isArray(data.results) ? data.results : data.results?.features
      ) || data.features || [],
      count: data.count || 0,
      timing: fin - debut,
    };
  } catch (err) {
    console.error('[GeoAPI] fetchLayerResults error:', err);
    return { features: [], count: 0, timing: 0 };
  }
}


const searchInMapGeoAPI = ({ 
  searchProvider: { provider, baseUrl, options = {} } = {},
  layers,
  translate,
  locationsEnable,
  layersEnable = true,
  language = 'en',
}) => async query => {
  let locations = [];
  if (locationsEnable && provider === 'nominatim') {
    locations = await fetchNominatim({ query, language, translate, baseUrl, options });
  }

  if (!layers.length && !locations.length) return undefined;

  let results = [];
  if (layersEnable) {
    // geo api
    const geoPromise = Promise.all(
      layers.map(async ([{
        filters: { layer, mainField },
        label,
        layers: resultsLayers,
      }]) => {
        const { features, count: total } = await fetchLayerResults(layer, query);
        return {
          group: label,
          total,
          results: (features || []).map(feature => ({
            label: feature.properties?.search_match
              ? `${feature.properties[feature.properties.search_match]} (${feature.properties.search_match})`
              : (feature.properties?.[mainField] || feature.id),
            ...feature.properties,
            id: feature.identifier, /// C'ÉTAIT ICI LE BUG !!!!!!!
            layers: resultsLayers,
            layerName: layer,
          })),
        };
      }),
    );

    // // bloc ES debug
    // const esPromise = searchInMap({
    //   searchProvider: { provider, baseUrl, options },
    //   layers,
    //   translate,
    //   locationsEnable,
    //   layersEnable,
    //   language,
    // })(query);
    // const [, layerResultsEs] = await Promise.all([geoPromise, esPromise]);
    // 
    // if (process.env.NODE_ENV !== 'production') {
    //   layers.forEach(([{ filters: { layer } }], i) => {
    //     const es = layerResultsEs[i];
    //     const geo = layerResultsGeo[i];
    //     console.log(`[Search] ${layer} - ES:${es?.total ?? '?'} Geo:${geo?.total ?? '?'}`);
    //   });
    // }

    const layerResultsGeo = await geoPromise;

    // ajout du bloc si 0 résultat sinon juste pas de bloc
    // à voir si on garde  
    results = layerResultsGeo.filter(({ total }) => total > 0);
    if (!results.length && !locations.length) {
      results.push({
        group: translate('terralego.map.search_results.no_result'),
        total: 0,
        results: [],
      });
    }
  }

  return [...results, ...locations];
};

export default searchInMapGeoAPI;
