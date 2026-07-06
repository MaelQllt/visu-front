export const extractColumnsGeoAPI = (fields, hits) => {
  if (fields && fields.length > 0) {
    return fields;
  }
  if (!hits.length) {
    return [];
  }
  // on remplace _source par properties
  return Object.keys(hits[0].properties).map(value => ({ value }));
};

export const prepareDataGeoAPI = (columns, hits) =>
  hits.map(({ properties: source }) =>
    columns.map(({ value }) => {
      const interpolation = value.match(/\{([^}]+)\}/);
      if (interpolation) {
        const [, key] = interpolation;
        return source[key];
      }
      return source[value];
    }));
