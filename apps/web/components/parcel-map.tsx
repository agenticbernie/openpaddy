'use client';

import { center as turfCenter } from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import MapGL, {
  Layer,
  type MapRef,
  NavigationControl,
  Source,
} from 'react-map-gl/maplibre';

export type ParcelVisualStatus = 'non_compliant' | 'ripening' | 'ready';

export interface MapParcelItem {
  id: string;
  geometry: string;
  area_ha: number;
  status: ParcelVisualStatus;
}

export interface ParcelMapHandle {
  captureSnapshot: () => string | null;
}

const OSM_RASTER_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const ParcelMap = forwardRef<
  ParcelMapHandle,
  { parcels: MapParcelItem[] }
>(function ParcelMap({ parcels }, ref) {
  const mapRef = useRef<MapRef | null>(null);

  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      try {
        const canvas = mapRef.current?.getMap()?.getCanvas();
        return canvas ? canvas.toDataURL('image/png') : null;
      } catch {
        return null;
      }
    },
  }));

  const geojson = useMemo(() => {
    const features = parcels.flatMap((p) => {
      try {
        const parsed = JSON.parse(p.geometry) as GeoJSON.Geometry;
        return [
          {
            type: 'Feature' as const,
            properties: {
              id: p.id,
              area_ha: p.area_ha,
              status: p.status,
              fillColor:
                p.status === 'ready'
                  ? '#15803d'
                  : p.status === 'ripening'
                    ? '#d97706'
                    : '#dc2626',
            },
            geometry: parsed,
          },
        ];
      } catch {
        return [];
      }
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [parcels]);

  const initialView = useMemo(() => {
    if (geojson.features.length > 0) {
      try {
        const c = turfCenter(geojson);
        const [lng, lat] = c.geometry.coordinates;
        return { longitude: lng, latitude: lat, zoom: 12.5 };
      } catch {
        // fallback
      }
    }
    return { longitude: 105.5582, latitude: 10.0621, zoom: 12 };
  }, [geojson]);

  return (
    <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <MapGL
        ref={mapRef}
        initialViewState={initialView}
        mapStyle={OSM_RASTER_STYLE}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <Source id="parcels-source" type="geojson" data={geojson}>
          <Layer
            id="parcels-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': 0.55,
            }}
          />
          <Layer
            id="parcels-outline"
            type="line"
            paint={{
              'line-color': '#0f172a',
              'line-width': 2,
            }}
          />
        </Source>
      </MapGL>
    </div>
  );
});
