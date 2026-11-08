/* Quote form settings. Change questions, pricing, and where answers go here. */

window.QUOTE_CONFIG = {
  // Where finished forms are POSTed as JSON. While this is empty the form runs
  // in preview mode: nothing is sent and the last screen says so.
  endpoint: '',

  // What the customer sees after submitting.
  //   'email'   = thank-you message; Brian reviews the answers and sends a quote
  //   'instant' = a price calculated right away from the pricing table below
  ending: 'email',

  phone: '(772) 215-7107',
  phoneHref: 'tel:+17722157107',

  // SAMPLE NUMBERS ONLY. Replace with real prices, then set confirmed to true.
  // While confirmed is false, the price screen is labeled as sample pricing.
  // Total = each inspection + size + stories + roof + travel - bundle savings.
  pricing: {
    confirmed: false,
    services: { wind: 125, fourpoint: 125, roof: 100 },
    bundleSavings: { 2: 25, 3: 50 }, // keyed by number of inspections chosen
    size: { 'under-1500': 0, '1500-2499': 0, '2500-3499': 25, '3500-4999': 50 },
    stories: { one: 0, two: 15, three: 30 },
    roofType: { shingle: 0, tile: 15, metal: 15, flat: 0, unsure: 0 },
    county: { martin: 0, 'st-lucie': 0, 'indian-river': 25, 'palm-beach': 25 },
    // Any of these answers skips the price and tells the customer Brian will follow up.
    manualReview: {
      services: ['unsure'],
      county: ['other'],
      propertyType: ['manufactured', 'multi'],
      size: ['5000-plus', 'unsure'],
    },
  },

  // The questions, in order.
  //   type 'single' = pick one, moves on automatically
  //   type 'multi'  = pick any, then Continue
  //   type 'fields' = typed answers
  //   summary       = the label Brian sees next to the answer
  //   showIf        = only ask when this returns true
  steps: [
    {
      id: 'services',
      type: 'multi',
      summary: 'Inspection needed',
      title: 'What do you need inspected?',
      help: 'Choose all that apply.',
      required: 'Choose at least one to continue.',
      options: [
        { value: 'wind', label: 'Wind Mitigation', desc: 'May lower your insurance costs' },
        { value: 'fourpoint', label: 'Four Point Inspection', desc: 'Roof, electrical, plumbing, HVAC' },
        { value: 'roof', label: 'Roof Certification', desc: 'Age, condition, remaining life' },
        { value: 'unsure', label: 'Not sure yet', desc: 'Brian can help you decide', exclusive: true },
      ],
    },
    {
      id: 'county',
      type: 'single',
      summary: 'County',
      title: 'Which county is the home in?',
      options: [
        { value: 'martin', label: 'Martin County' },
        { value: 'st-lucie', label: 'St. Lucie County' },
        { value: 'indian-river', label: 'Indian River County' },
        { value: 'palm-beach', label: 'Palm Beach County' },
        { value: 'other', label: 'Another county' },
      ],
    },
    {
      id: 'propertyType',
      type: 'single',
      summary: 'Property type',
      title: 'What type of home is it?',
      options: [
        { value: 'single-family', label: 'Single-family home' },
        { value: 'townhome', label: 'Townhome or villa' },
        { value: 'condo', label: 'Condo' },
        { value: 'manufactured', label: 'Mobile or manufactured home' },
        { value: 'multi', label: 'Duplex or multi-family' },
      ],
    },
    {
      id: 'size',
      type: 'single',
      summary: 'Living area',
      title: 'About how big is the home?',
      help: 'A rough guess is fine.',
      options: [
        { value: 'under-1500', label: 'Under 1,500 sq ft' },
        { value: '1500-2499', label: '1,500 to 2,499 sq ft' },
        { value: '2500-3499', label: '2,500 to 3,499 sq ft' },
        { value: '3500-4999', label: '3,500 to 4,999 sq ft' },
        { value: '5000-plus', label: '5,000 sq ft or more' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'stories',
      type: 'single',
      summary: 'Stories',
      title: (answers) => answers.propertyType === 'condo'
        ? 'How many stories is the building?'
        : 'How many stories is the home?',
      showIf: (answers) => answers.propertyType !== 'manufactured',
      options: [
        { value: 'one', label: 'One story' },
        { value: 'two', label: 'Two stories' },
        { value: 'three', label: 'Three or more' },
      ],
    },
    {
      id: 'yearBuilt',
      type: 'single',
      summary: 'Year built',
      title: 'When was the home built?',
      options: [
        { value: '2002-plus', label: '2002 or newer' },
        { value: '1990-2001', label: '1990 to 2001' },
        { value: '1970-1989', label: '1970 to 1989' },
        { value: 'pre-1970', label: 'Before 1970' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'roofType',
      type: 'single',
      summary: 'Roof type',
      title: 'What kind of roof does it have?',
      options: [
        { value: 'shingle', label: 'Shingle' },
        { value: 'tile', label: 'Tile' },
        { value: 'metal', label: 'Metal' },
        { value: 'flat', label: 'Flat' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'roofAge',
      type: 'single',
      summary: 'Roof age',
      title: 'About how old is the roof?',
      // Skipped when Wind Mitigation is the only inspection chosen.
      showIf: (answers) => String(answers.services) !== 'wind',
      options: [
        { value: 'under-5', label: 'Under 5 years' },
        { value: '5-10', label: '5 to 10 years' },
        { value: '11-15', label: '11 to 15 years' },
        { value: '16-20', label: '16 to 20 years' },
        { value: 'over-20', label: 'Over 20 years' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'timing',
      type: 'single',
      summary: 'Timing',
      title: 'When do you need it done?',
      options: [
        { value: 'asap', label: 'As soon as possible' },
        { value: 'week', label: 'Within a week' },
        { value: 'two-weeks', label: 'Within two weeks' },
        { value: 'month', label: 'Within a month' },
        { value: 'pricing', label: 'Just pricing it out' },
      ],
    },
    {
      id: 'address',
      type: 'fields',
      title: 'What’s the property address?',
      help: 'Brian uses this to look up the home and plan the visit.',
      fields: [
        { name: 'street', label: 'Street address', required: true, autocomplete: 'street-address' },
        { name: 'city', label: 'City', required: true, autocomplete: 'address-level2', half: true },
        { name: 'zip', label: 'ZIP code', required: true, emptyError: 'Enter a 5-digit ZIP code.', autocomplete: 'postal-code', inputmode: 'numeric', maxlength: 5, half: true, format: 'zip' },
      ],
    },
    {
      id: 'contact',
      type: 'fields',
      title: 'Last step: how can Brian reach you?',
      submitLabel: 'Get my quote',
      consent: 'By submitting, you agree that Reamer Homes may contact you by phone, text, or email about this request.',
      fields: [
        { name: 'firstName', label: 'First name', required: true, autocomplete: 'given-name', half: true },
        { name: 'lastName', label: 'Last name', required: true, autocomplete: 'family-name', half: true },
        { name: 'phone', label: 'Phone number', required: true, autocomplete: 'tel', type: 'tel', inputmode: 'tel', format: 'phone' },
        { name: 'email', label: 'Email address', required: true, autocomplete: 'email', type: 'email', inputmode: 'email', format: 'email' },
        { name: 'preferred', label: 'Best way to reach you', type: 'choice', default: 'Call', options: ['Call', 'Text', 'Email'] },
        { name: 'notes', label: 'Anything else Brian should know?', type: 'textarea' },
      ],
    },
  ],
};
