import { connectLayersTree } from '../../../LayersTreeProvider/context';


// version ES 
import FiltersPanelContent from './FiltersPanelContent';

console.log('[FiltersPanel] version ES');


// // version geo-api
// import FiltersPanelContent from './FiltersPanelContentGeoAPI';
//
// console.log('[FiltersPanel] version geo-api');


export default connectLayersTree((
  { getLayerState, translate }, // context
  { layer, layer: { exclusive, layers } }, // props
) => {
  const activeLayer = exclusive
    ? layers.find(l => getLayerState({ layer: l }).active) || layer
    : layer;

  return {
    filtersValues: getLayerState({ layer: activeLayer }).filters || {},
    activeLayer,
    translate,
  };
})(FiltersPanelContent);
