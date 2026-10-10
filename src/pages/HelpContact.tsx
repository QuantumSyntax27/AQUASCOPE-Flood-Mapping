import { motion } from 'framer-motion';
import { useState } from 'react';
import { Badge, Button, Card, CardHeader } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { Link } from 'react-router-dom';
import { Info, Mail, Phone, Shield, MapPin, Users } from 'lucide-react';

/** GETTING STARTED STEPS based on actual implementation */
const gettingStartedSteps = [
  {
    step: 1,
    title: 'Open the application',
    description:
      'Navigate to the AQUASCOPE homepage. The application loads with a cinematic space sequence, then transitions to the home dashboard.',
  },
  {
    step: 2,
    title: 'Provide a location or AOI',
    description:
      'Enter a location name (e.g., "Trishuli, Nepal") or define an Area of Interest (AOI) as a GeoJSON polygon. The backend can derive a default corridor if no AOI is provided.',
  },
  {
    step: 3,
    title: 'Select an event date',
    description:
      'Choose a flood event date in YYYY-MM-DD format. The date must not be in the future.',
  },
  {
    step: 4,
    title: 'Run the analysis',
    description:
      'Click "Start Analysis" or use the analysis workflow. The 6-stage pipeline begins: satellite scene discovery, preprocessing, AI flood mapping, infrastructure impact, connectivity analysis, and validation.',
  },
  {
    step: 5,
    title: 'View results across pages',
    description:
      'Results appear on multiple pages: Dashboard (KPIs, maps), Flood Detection (flood extent), Infrastructure (roads/buildings/bridges), Connectivity (settlements), and Validation (EMSR927 comparison).',
  },
  {
    step: 6,
    title: 'Understand data source status',
    description:
      'All results include a "source" field: "REAL" (real API data) or "FALLBACK" (deterministic mock). The current build uses mock data by default. This is indicated by "Demo / Simulated Data" badges and disclaimer text.',
  },
];

/** FAQ data — verified against actual code and documentation */
const faqItems = [
  {
    id: 1,
    question: 'What is AQUASCOPE?',
    answer:
      'AQUASCOPE is a satellite-powered flood impact mapping and disaster intelligence platform. It uses Sentinel-1 satellite imagery to map flood extents, assess infrastructure impact, and analyze road connectivity in flood-affected areas. The platform runs in demo mode with simulated data for interface validation.',
  },
  {
    id: 2,
    question: 'What problem does AQUASCOPE aim to solve?',
    answer:
      'During flood events, responders need rapid knowledge of where flood water is, what infrastructure it touches, and which communities have lost road access. Manual flood mapping is slow, optical satellites are blocked by clouds, and infrastructure impact is rarely quantified consistently. AQUASCOPE addresses this by using Synthetic Aperture Radar (SAR) from Sentinel-1 satellites, which penetrate clouds and provide all-weather monitoring capability.',
  },
  {
    id: 3,
    question: 'How does flood mapping from satellite imagery work?',
    answer:
      'AQUASCOPE follows a 6-stage pipeline: 1) Satellite scene discovery (Sentinel-1 pre-event/co-event/post-event scenes), 2) Preprocessing (radiometric calibration, terrain correction, alignment to common CRS), 3) AI flood mapping (change detection on preprocessed data to produce flood probability maps), 4) Infrastructure impact (intersection with OpenStreetMap roads, buildings, bridges — reported as "potentially affected," never as destruction), 5) Connectivity analysis (road graph modification, identification of potentially road-disconnected settlements), 6) Validation (comparison against EMSR927 reference mapping with IoU, Dice, precision, recall, F1 metrics). The current implementation uses deterministic mock services for all stages.',
  },
  {
    id: 4,
    question: 'What is an Area of Interest (AOI)?',
    answer:
      'An AOI is a polygonal region that bounds the area where AQUASCOPE will analyze flood impact. It can be provided as GeoJSON coordinates or derived from a location name. If omitted, the backend derives a default corridor around the specified location.',
  },
  {
    id: 5,
    question: 'What is Sentinel-1?',
    answer:
      'Sentinel-1 is an ESA satellite mission providing C-band Synthetic Aperture Radar (SAR) imagery. It operates in Ascending and Descending pass directions. SAR is useful for flood mapping because it penetrates cloud cover and provides all-weather, day-and-night observation capability.',
  },
  {
    id: 6,
    question: 'Why is Synthetic Aperture Radar (SAR) useful for flood mapping?',
    answer:
      'SAR is useful for flood mapping because it penetrates cloud cover, works day and night, and detects changes in surface backscatter caused by flooding. However, SAR data is affected by terrain-induced effects such as layover and shadow, especially in mountainous areas. The current AQUASCOPE implementation uses mock SAR data for demonstration purposes.',
  },
  {
    id: 7,
    question: 'What do REAL, MOCK, DEMO, and FALLBACK mean in AQUASCOPE?',
    answer:
      'All AQUASCOPE services have dual implementation: they try a real API first, then fall back to a deterministic mock. Source tracking is mandatory on all results. "REAL" means the data was resolved by the real API/live service. "FALLBACK" means the data was resolved by the deterministic mock service. "DEMO / SIMULATED DATA" appears in the UI to indicate the current build uses simulated data for interface validation. "Mock" and "Fallback" are used interchangeably to describe the deterministic fallback behavior.',
  },
  {
    id: 8,
    question: 'Why might an analysis return no results or all zeros?',
    answer:
      'In the current demo/build, analysis returns mock data by design. If real API credentials are unavailable, the deterministic mock engages automatically and produces structured results with explicit "FALLBACK" source tracking. Analysis may also return limited or zero results if the AOI, event date, or scene selection does not match the mock scenario data (Trishuli, Nepal, 26 August 2026).',
  },
  {
    id: 9,
    question: 'How should users interpret the displayed flood extent?',
    answer:
      'The displayed flood extent in the current build is simulated flood extent generated by the mock flood mask service. It is indicated as "Simulated flood extent" in the UI. The binary mask (0 = non-flood, 1 = flood) is produced by applying a validation-selected threshold to simulated flood probabilities. Key limitations: SAR layover/shadow in steep terrain, bounding-box area approximation, and the fact that flood overlap does not automatically mean destruction. Users should verify results with local field information before operational use.',
  },
  {
    id: 10,
    question: 'Does AQUASCOPE currently provide real-time flood monitoring?',
    answer:
      'No. AQUASCOPE is a demonstration and development platform. All analysis results are produced by mock services using deterministic simulated data. It does not connect to real-time satellite data feeds or provide real-time monitoring. Real API integration (Copernicus Data Space, OSM, etc.) is planned for future phases but not currently active.',
  },
  {
    id: 11,
    question: 'Can AQUASCOPE confirm that a location is safe or that a road is passable?',
    answer:
      'No. AQUASCOPE reports "potentially affected" infrastructure and "potentially road-disconnected" settlements based on mock overlay of flood masks with OpenStreetMap data. The system explicitly states that "potentially affected" does not mean "destroyed" or "impassable." Field verification is always required before operational decisions. The connectivity analysis models road removal from the graph and identifies settlements without a valid route, but these are model outputs, not ground truth.',
  },
  {
    id: 12,
    question: 'How can users report a problem or ask for help?',
    answer:
      'Users can contact the AQUASCOPE team via the email addresses listed on the Team & Contact page. For technical issues, feedback, or unanswered questions, use the "Ask a Question" search feature on the Help & Contact page, which directs to team contact options if the question cannot be answered from the knowledge base.',
  },
  {
    id: 12,
    question: 'What are the current limitations of AQUASCOPE?',
    answer:
      'Key limitations: 1) All mock results are DEMO/SIMULATED DATA with no real satellite observations. 2) Flood overlap does not imply destruction — "potentially affected" ≠ "destroyed". 3) Terrain uncertainty: SAR layover and shadow in steep slopes reduce detection reliability. 4) AOI area calculations use bounding-box approximation — not precise geospatial analysis. 5) Validation metrics are zero when no real reference data (EMSR927) is available. 6) Results are preliminary and should be verified with local field information before operational use. 7) The mock threshold (0.52) is demonstration-only. 8) Co-event scene often unavailable, requiring fallback to pre-event or post-event scenes. 9) No operational use case supported. Full scientific integrity statement is available in the README and Help & Contact page.',
  },
];

export function HelpContact() {
  const [faqExpanded, setFaqExpanded] = useState(
    new Set(faqItems.map((item) => item.id)),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<faqItems | null>(null);
  const [showAskQuestion, setShowAskQuestion] = useState(false);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);

  const handleSearch = () => {
    const normalized = searchQuery.toLowerCase().trim();
    if (!normalized) {
      setSearchResults(null);
      return;
    }

    const results = faqItems.filter((item) => {
      const lowerQuestion = item.question.toLowerCase();
      const lowerAnswer = item.answer.toLowerCase();
      return (
        lowerQuestion.includes(normalized) ||
        lowerAnswer.includes(normalized) ||
        normalized.split(' ').some((q) => lowerQuestion.includes(q))
      );
    });

    if (results.length > 0) {
      setSearchResults(results);
    } else {
      setShowAskQuestion(true);
    }
  };

  const handleAsk = () => {
    if (!searchQuery.trim()) return;
    setAskAnswer(searchQuery);
    setShowAskQuestion(false);
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-navy-950">
      <PageHeader
        title="AQUASCOPE Help"
        subtitle="Understanding the platform, navigating features, interpreting results, and current limitations"
      />

      <div className="mx-auto max-w-2xl space-y-6 px-6 pb-10">
        {/* --- Welcome --- */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-lg text-navy-300 leading-relaxed">
            This section helps you understand the AQUASCOPE platform, navigate its
            available features, interpret displayed results, and understand current
            limitations. Keep language simple and professional.
          </p>
        </motion.div>

        {/* --- Getting Started --- */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card>
            <CardHeader title="Getting Started" subtitle="Step-by-step guide" />
            <ol className="space-y-4 pt-3">
              {gettingStartedSteps.map((s) => (
                <li key={s.step} className="flex items-start gap-3">
                  <span className="font-semibold text-navy-300">{s.step}. </span>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{s.title}</h4>
                    <p className="text-[12px] text-navy-400 leading-relaxed">{s.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </motion.div>

        {/* --- FAQ --- */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card>
            <CardHeader title="Frequently Asked Questions" subtitle="Search or browse common questions" />
            <div className="space-y-2">
              {faqItems.map((item) => (
                <div key={item.id} className="border-b border-navy-800/50 last:border-0">
                  <button
                    onClick={() => setFaqExpanded((prev) => prev.has(item.id) ? prev.delete(item.id) : prev.add(item.id))}
                    className={classNames(
                      'w-full text-left padding-2 text-left cursor-pointer select-none',
                      faqExpanded.has(item.id) ? 'after:content-after-before after:before:absolute after:before:left-0 after:before/w-1/2 after:before rounded-md after:before:bg-navy-800 after:before:text-white after:content-[' + '"' + '▼' + ']' + ']' : ''
                    )}
                    dangerouslySetInnerHTML={{ __html: item.question }}
                  />
                  {faqExpanded.has(item.id) && (
                    <p className="mt-2 text-[12px] text-navy-400 leading-relaxed">{item.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* --- Ask a Question --- */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card>
            <CardHeader title="Ask a Question" subtitle="Search the AQUASCOPE help resources to find an answer" />
            <div className="p-4 space-y-3">
              <div>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Type your question..."
                  className="flex-1 border rounded-lg p-2 text-sm text-white focus:bg-navy-800 focus:outline-none"
                  aria-label="Search question"
                />
                <button
                  onClick={handleSearch}
                  className="bg-indigo-600 text-white px-4 rounded-lg text-sm hover:bg-indigo-500 transition-colors"
                  disabled={!searchQuery.trim()}
                  aria-label="Search"
                >
                  Search
                </button>
              </div>

              {searchResults && searchResults.length > 0 && (
                <div className="mt-3 space-y-3 max-w-lg">
                  {searchResults.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-navy-800/50">
                      <h4 className="font-medium text-white line-clamp-2">{item.question}</h4>
                      <p className="text-[12px] text-navy-400 line-clamp-3">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {showAskQuestion && (
                <p className="mt-3 text-center text-navy-400">
                  We couldn't find a reliable answer in the current AQUASCOPE help resources. Please contact our team for assistance.
                </p>
              )}

              {showAskQuestion && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href="mailto:10325210011@stu.srmuniversity.ac.in"
                    className="self-end text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                    target="_blank"
                    rel="noopener"
                  >
                    Hitesh Chhabra
                  </a>
                  <a
                    href="mailto:10325210003@stu.srmuniversity.ac.in"
                    className="self-end text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                    target="_blank"
                    rel="noopener"
                  >
                    Mohit Bajiya
                  </a>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}