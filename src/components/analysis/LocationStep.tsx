import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  Loader2,
  MapPin,
  PencilLine,
  Search,
} from 'lucide-react';
import type { LatLng, PlaceLocation } from '../../types';
import { Button, Chip } from '../ui';
import { geocodeAddress, searchLocations } from '../../data/places';
import { formatCoord } from '../../utils/geo';
import type { SetupState } from '../../pages/SetupFlow';

type Mode = 'search' | 'pin' | 'address';

interface LocationStepProps {
  state: SetupState;
  update: (patch: Partial<SetupState>) => void;
  pinMode: boolean;
  setPinMode: (v: boolean) => void;
  onMapFocus: (loc: PlaceLocation) => void;
  onProceed: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export function LocationStep({
  state,
  update,
  pinMode,
  setPinMode,
  onMapFocus,
  onProceed,
  onBack,
  canProceed,
}: LocationStepProps) {
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [focused, setFocused] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = (q: string) => {
    setQuery(q);
    clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchLocations(q);
      setResults(res);
      setSearching(false);
    }, 200);
  };

  const selectResult = (place: PlaceLocation) => {
    update({ location: place });
    onMapFocus(place);
    setConfirmed(false);
    setFocused(false);
    setQuery(place.name);
    setResults([]);
  };

  const locateAddress = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const place = await geocodeAddress(address);
      selectResult(place);
      setMode('search');
    } finally {
      setGeocoding(false);
    }
  };

  const handlePinPlace = (ll: LatLng) => {
    const place: PlaceLocation = {
      id: `pin-${ll.lat.toFixed(4)}-${ll.lng.toFixed(4)}`,
      name: 'Pinned location',
      region: 'Placed on map',
      // Country is derived from the simulated geocoder fallback; do not hard‑code.
      country: 'Simulated',
      lat: ll.lat,
      lng: ll.lng,
      zoom: 12,
      description: `${formatCoord(ll.lat, ll.lng)} — placed manually on the map`,
    };
    update({ location: place });
    onMapFocus(place);
    setConfirmed(false);
    setPinMode(false);
  };

  // Expose pin placement to the map via a custom event
  useEffect(() => {
    const handler = (e: CustomEvent<LatLng>) => handlePinPlace(e.detail);
    window.addEventListener('aquascope:pin', handler as EventListener);
    return () => window.removeEventListener('aquascope:pin', handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const location = state.location;
  const showConfirmation = !!location && !confirmed;

  return (
    <div>
      <h2 className="text-lg font-bold text-white">Location</h2>
      <p className="mt-1 text-sm text-navy-400">
        Search for the flood-affected location, pin it on the map, or enter a
        complete address.
      </p>

      {/* Mode tabs */}
      <div className="mt-5 flex rounded-lg border border-navy-800 bg-navy-800/50 p-1">
        {(
          [
            { id: 'search', label: 'Search Location', icon: Search },
            { id: 'pin', label: 'Pin on Map', icon: MapPin },
            { id: 'address', label: 'Enter Complete Address', icon: PencilLine },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id);
              if (m.id === 'pin') setPinMode(true);
              else setPinMode(false);
            }}
            aria-pressed={mode === m.id}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
              mode === m.id
                ? 'bg-navy-900 text-brand-300 shadow-sm'
                : 'text-navy-400 hover:text-navy-200'
            }`}
          >
            <m.icon size={13} />
            <span className="hidden xl:inline">{m.label}</span>
            <span className="xl:hidden">{m.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-4"
          >
            <div ref={boxRef} className="relative">
              <label htmlFor="loc-search" className="text-xs font-semibold text-navy-200">
                Search location
              </label>
              <div className="relative mt-1.5">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  id="loc-search"
                  data-demo="location-search"
                  type="text"
                  value={query}
                  onChange={(e) => doSearch(e.target.value)}
                  onFocus={() => setFocused(true)}
                  placeholder="e.g. Trishuli, Nepal"
                  className="h-11 w-full rounded-lg border border-navy-700 bg-navy-900 pl-9 pr-9 text-sm text-white placeholder:text-navy-500 focus:border-brand-400"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-brand-500" />
                )}
              </div>
              <AnimatePresence>
                {focused && results.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-navy-800 bg-navy-900 shadow-lifted"
                  >
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => selectResult(r)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-brand-500/12"
                        >
                          <MapPin size={15} className="mt-0.5 shrink-0 text-brand-500" />
                          <span>
                            <span className="block text-sm font-semibold text-white">{r.name}</span>
                            <span className="block text-xs text-navy-400">
                              {r.region}, {r.country}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
              {focused && query.trim().length >= 2 && results.length === 0 && !searching && (
                <p className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-navy-800 bg-navy-900 px-4 py-3 text-xs text-navy-400 shadow-lifted">
                  No matching locations. Try "Trishuli", "Delhi", "New York", "Tokyo"… or use Pin on Map.
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Trishuli', 'Kathmandu', 'Pokhara', 'Delhi', 'New York', 'Tokyo', 'London', 'Paris'].map((s) => (
                <button
                  key={s}
                  onClick={() => doSearch(s)}
                  className="rounded-full border border-navy-800 bg-navy-800/50 px-2.5 py-1 text-[11px] font-medium text-navy-300 hover:bg-brand-500/12 hover:text-brand-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {mode === 'pin' && (
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/15 p-4"
          >
            <div className="flex gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-white">Pin on map</p>
                <p className="mt-1 text-xs leading-relaxed text-navy-300">
                  Click anywhere on the map to place the location marker. The map
                  will center on your pin and you can confirm the selection.
                </p>
                {pinMode && (
                  <Chip className="mt-2 border-brand-400/35 bg-navy-900 text-brand-300">
                    <MapPin size={11} /> Listening for map click…
                  </Chip>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'address' && (
          <motion.div
            key="address"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-4"
          >
            <label htmlFor="loc-address" className="text-xs font-semibold text-navy-200">
              Complete address
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="loc-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && locateAddress()}
                placeholder="e.g. Trishuli Bazar, Rasuwa, Nepal"
                className="h-11 min-w-0 flex-1 rounded-lg border border-navy-700 bg-navy-900 px-3 text-sm text-white placeholder:text-navy-500 focus:border-brand-400"
              />
              <Button onClick={locateAddress} loading={geocoding} className="shrink-0">
                Locate
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-navy-400">
              Address geocoding is simulated in this demo build.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected location */}
      <AnimatePresence>
        {location && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
                <MapPin size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{location.name}</p>
                <p className="text-xs text-navy-400">
                  {location.region}, {location.country}
                </p>
                <p className="mt-1 font-mono text-[11px] text-navy-400">
                  {formatCoord(location.lat, location.lng)}
                </p>
                {location.description && (
                  <p className="mt-1 text-[11px] text-navy-400">{location.description}</p>
                )}
              </div>
              {confirmed && <Check size={18} className="shrink-0 text-green-500" />}
            </div>

            {showConfirmation && (
              <div className="mt-4 border-t border-navy-800/60 pt-4">
                <p className="text-sm font-semibold text-navy-100">
                  Is this the location you want to analyze?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => { setConfirmed(true); }} icon={<Check size={14} />}>
                    Confirm Location
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      update({ location: null });
                      setConfirmed(false);
                      setQuery('');
                    }}
                  >
                    Change Location
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled>
          <ChevronLeft size={14} /> Back
        </Button>
        <Button onClick={onProceed} disabled={!canProceed || !confirmed}>
          Continue to AOI
        </Button>
      </div>
    </div>
  );
}
