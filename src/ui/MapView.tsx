import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { LatLng } from '../data/places';

export interface MapMarker {
  id: string;
  pos: LatLng;
  kind: 'partner' | 'osm' | 'facility' | 'me';
  color?: string;
  label?: string;
  selected?: boolean;
  duty?: boolean;
}

// OpenStreetMap's standard tiles: no API key, excellent coverage of Buea. Dark mode is a CSS filter.
const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function icon(m: MapMarker) {
  if (m.kind === 'me') {
    return L.divIcon({
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      html: `<span style="position:relative;display:block;width:22px;height:22px">
        <span style="position:absolute;inset:0;border-radius:999px;background:rgb(59 130 246/.25);animation:pulse-ring 2s infinite"></span>
        <span style="position:absolute;inset:5px;border-radius:999px;background:#3b82f6;box-shadow:0 0 0 3px #fff"></span></span>`,
    });
  }
  if (m.kind === 'facility') {
    return L.divIcon({
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: `<span style="display:grid;place-items:center;width:24px;height:24px;border-radius:8px;background:#fff;box-shadow:0 2px 8px rgb(0 0 0/.25);border:1.5px solid #d92d2d">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4.5 1h3v3.5H11v3H7.5V11h-3V7.5H1v-3h3.5z" fill="#d92d2d"/></svg></span>`,
    });
  }
  if (m.kind === 'osm') {
    const s = m.selected ? 20 : 15;
    return L.divIcon({
      className: '',
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      html: `<span style="display:block;width:${s}px;height:${s}px;border-radius:999px;background:#8a909c;border:2.5px solid #fff;box-shadow:0 2px 6px rgb(0 0 0/.3)"></span>`,
    });
  }
  const size = m.selected ? 44 : 34;
  const color = m.color ?? '#5b3fe8';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px;filter:drop-shadow(0 6px 10px rgb(0 0 0/.3));transition:all .2s">
      <svg viewBox="0 0 40 40" width="${size}" height="${size}"><path d="M20 39c-1.2 0-12.5-12.7-12.5-21.5C7.5 10.6 13.1 5 20 5s12.5 5.6 12.5 12.5C32.5 26.3 21.2 39 20 39z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
      <circle cx="20" cy="17.5" r="5.2" fill="#fff"/></svg>
      ${m.duty ? '<span style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:999px;background:#14151a;border:2px solid #fff;display:grid;place-items:center;font-size:8px;color:#fff">☾</span>' : ''}
    </span>`,
  });
}

export default function MapView({
  center,
  markers,
  onSelect,
  focus,
  dark,
}: {
  center: LatLng;
  markers: MapMarker[];
  onSelect: (id: string) => void;
  focus?: LatLng;
  dark: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, center: [center.lat, center.lng], zoom: 14, minZoom: 11, maxZoom: 18 });
    m.attributionControl.setPrefix(false);
    L.tileLayer(TILE, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const fix = window.setTimeout(() => m.invalidateSize(), 350);
    return () => {
      window.clearTimeout(fix);
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const order = { osm: 0, facility: 1, partner: 2, me: 3 } as const;
    [...markers]
      .sort((a, b) => order[a.kind] - order[b.kind] || Number(Boolean(a.selected)) - Number(Boolean(b.selected)))
      .forEach((mk) => {
        const marker = L.marker([mk.pos.lat, mk.pos.lng], { icon: icon(mk), keyboard: true, title: mk.label, zIndexOffset: mk.selected ? 1000 : 0 });
        if (mk.kind !== 'me') marker.on('click', () => select.current(mk.id));
        marker.addTo(g);
      });
  }, [markers]);

  useEffect(() => {
    if (focus && map.current) map.current.flyTo([focus.lat, focus.lng], Math.max(map.current.getZoom(), 15), { duration: 0.6 });
  }, [focus?.lat, focus?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    map.current?.setView([center.lat, center.lng], map.current.getZoom());
  }, [center.lat, center.lng]);

  return <div ref={el} className={dark ? 'map-dark h-full w-full' : 'map-light h-full w-full'} role="application" aria-label="Map of pharmacies in Buea" />;
}
