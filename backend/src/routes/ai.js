const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// NLP keyword patterns for extraction
const INCIDENT_TYPES = [
  'theft', 'robbery', 'assault', 'murder', 'rape', 'kidnapping', 'fraud',
  'burglary', 'vandalism', 'harassment', 'domestic violence', 'accident',
  'missing person', 'cyber crime', 'drug trafficking', 'extortion', 'arson',
  'cheating', 'Eve teasing', 'chain snatching', 'vehicle theft', 'house breaking'
];

const MONTH_MAP = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function extractName(text) {
  // Match "my name is X", "I am X", "complainant X", "name: X"
  const patterns = [
    /(?:my name is|i am|complainant|reported by|name[:\s]+)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/i,
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/m,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractPhone(text) {
  const match = text.match(/(?:mobile|phone|contact|number)?[:\s]*(\+?91[-.\s]?)?([6-9]\d{9})/i);
  return match ? match[2] : null;
}

function extractIncidentType(text) {
  const lower = text.toLowerCase();
  for (const type of INCIDENT_TYPES) {
    if (lower.includes(type)) return type.charAt(0).toUpperCase() + type.slice(1);
  }
  return null;
}

function extractDate(text) {
  // Match DD/MM/YYYY or DD-MM-YYYY
  let match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  }
  // Match "15th January 2024" or "January 15, 2024"
  match = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
  if (match) {
    return `${match[3]}-${MONTH_MAP[match[2].toLowerCase()]}-${match[1].padStart(2,'0')}`;
  }
  match = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    return `${match[3]}-${MONTH_MAP[match[1].toLowerCase()]}-${match[2].padStart(2,'0')}`;
  }
  return null;
}

function extractLocation(text) {
  // Match "at X", "near X", "in X", "from X", "location: X"
  const patterns = [
    /(?:at|near|in|from|location[:\s]+|occurred at|happened at|incident at)\s+([A-Z][a-zA-Z\s,]{3,50}?)(?:\.|,|on|at|\n|$)/i,
    /(?:area|street|road|nagar|colony|sector|ward|village|town)\s*[:\s]*([a-zA-Z\s,]{3,50}?)(?:\.|,|\n|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

// POST /api/ai/extract - Extract complaint fields from text
router.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: 'Text is too short for extraction' });
    }

    const extracted = {
      complainant_name: extractName(text),
      mobile: extractPhone(text),
      incident_type: extractIncidentType(text),
      date: extractDate(text),
      location: extractLocation(text),
      confidence: {}
    };

    // Confidence scores
    extracted.confidence = {
      complainant_name: extracted.complainant_name ? 0.75 : 0,
      mobile: extracted.mobile ? 0.95 : 0,
      incident_type: extracted.incident_type ? 0.85 : 0,
      date: extracted.date ? 0.90 : 0,
      location: extracted.location ? 0.70 : 0,
    };

    res.json({
      extracted,
      original_text: text,
      extracted_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('AI extract error:', err);
    res.status(500).json({ error: 'AI extraction failed' });
  }
});

// POST /api/ai/suggest-type - Suggest incident type categories
router.post('/suggest-type', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const lower = (text || '').toLowerCase();
    const suggestions = INCIDENT_TYPES.filter(t => {
      const words = t.split(' ');
      return words.some(w => lower.includes(w));
    }).slice(0, 5);

    res.json({ suggestions: suggestions.length > 0 ? suggestions : INCIDENT_TYPES.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ error: 'Suggestion failed' });
  }
});

module.exports = router;
