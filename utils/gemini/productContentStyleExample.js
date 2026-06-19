// Reference style for Gemini — structure, depth, and tone (English source).
// Model must mirror this quality in am, ru, and en JSON output.

const STYLE_REFERENCE_PROSE = `Give your child an unforgettable journey through time with the Classical Train play set. This detailed retro train is more than just a toy—it's a real interactive attraction that brings the atmosphere of classic railways right into your nursery.

Key Features:
- Full remote control: Using a convenient remote (27 MHz), the young conductor can control the train's movement forward and backward.
- Realistic smoke effect: Pour a little water into the special locomotive compartment, and it will begin to release safe "cold steam," mimicking a real steam engine.
- Light and sound effects: A bright headlight illuminates the path in the dark, while thematic horn and clatter sounds make the play incredibly lifelike.
- Retro design: The vibrant red-and-green locomotive and finely detailed wagons (coal tender, passenger car, and "Express" freight car) create an aesthetic classic look.

What's in the Box:
1. Locomotive with steam generator and lights.
2. "Coal Carriage" tender for transporting coal.
3. Passenger car with a classic design.
4. "Express" freight car for important deliveries.
5. Track set to build a spacious circular route (assembled size: ~162x84 cm).
6. Remote control.

Specifications:
Power: 6 x AA batteries (4 for the locomotive and 2 for the remote, not included).
Material: High-quality, impact-resistant plastic.`;

const STYLE_REFERENCE_JSON_EN = {
  description: {
    en: "Give your child an unforgettable journey through time with the Classical Train play set. This detailed retro train is more than just a toy—it's a real interactive attraction that brings the atmosphere of classic railways right into your nursery.",
  },
  keyFeatures: [
    {
      label: { en: "Full remote control" },
      value: {
        en: "Using a convenient remote (27 MHz), the young conductor can control the train's movement forward and backward.",
      },
    },
    {
      label: { en: "Realistic smoke effect" },
      value: {
        en: 'Pour a little water into the special locomotive compartment, and it will begin to release safe "cold steam," mimicking a real steam engine.',
      },
    },
    {
      label: { en: "Light and sound effects" },
      value: {
        en: "A bright headlight illuminates the path in the dark, while thematic horn and clatter sounds make the play incredibly lifelike.",
      },
    },
    {
      label: { en: "Retro design" },
      value: {
        en: 'The vibrant red-and-green locomotive and finely detailed wagons (coal tender, passenger car, and "Express" freight car) create an aesthetic classic look.',
      },
    },
  ],
  whatsIncluded: [
    { en: "Locomotive with steam generator and lights." },
    { en: '"Coal Carriage" tender for transporting coal.' },
    { en: "Passenger car with a classic design." },
    { en: '"Express" freight car for important deliveries.' },
    {
      en: "Track set to build a spacious circular route (assembled size: ~162x84 cm).",
    },
    { en: "Remote control." },
  ],
  poweredBy: {
    en: "6 x AA batteries (4 for the locomotive and 2 for the remote, not included).",
  },
  material: {
    en: "High-quality, impact-resistant plastic.",
  },
};

module.exports = {
  STYLE_REFERENCE_PROSE,
  STYLE_REFERENCE_JSON_EN,
};
