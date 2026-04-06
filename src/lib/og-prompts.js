const STYLE_PREFIX = 'Premium editorial medical illustration for a luxury healthcare clinic social media card. Minimalist composition, soft diffused natural lighting, muted sophisticated earth tones with deep emerald green (#1B6B5A) accents. Clean white or light cream background with elegant depth. No text, no logos, no watermarks, no letters, no words, no numbers. Photorealistic with subtle artistic touch, high-end aesthetic. Wide 16:9 aspect ratio.'

const OG_PROMPTS = {
  'index': {
    scene: 'Modern premium medical clinic facade with glass and natural wood, welcoming entrance with green plants, bright daylight, minimalist architectural design, warmth and trust',
  },
  'about': {
    scene: 'Elegant interior of a modern medical clinic: reception area with natural light, green plants, comfortable seating, medical diplomas on the wall, professional and warm atmosphere',
  },
  'mammology': {
    scene: 'Modern breast diagnostics: ultrasound machine with clean screen, professional medical instruments on white surface, gentle clinical environment, emerald and white tones',
  },
  'gynecology': {
    scene: 'Calm modern gynecological consultation room, comfortable setting, fresh flowers, medical equipment in soft focus, welcoming professional space, emerald accents',
  },
  'endocrinology': {
    scene: 'Elegant endocrinology scene: thyroid gland artistic visualization, hormone test tubes with color-coded labels, medical stethoscope, clean white surface, emerald and blue accents',
  },
  'nutrition': {
    scene: 'Beautiful overhead shot of balanced nutrition consultation: colorful fresh foods arrangement, medical notebook with nutrition plan, professional dietary science, emerald ceramic dishes on white',
  },
  'vab': {
    scene: 'Minimally invasive medical procedure concept: VAB biopsy device on sterile white surface, ultrasound probe nearby, precise surgical precision, modern clinical aesthetic, emerald accents',
  },
  'second-opinion': {
    scene: 'Doctor reviewing medical documents and scans at a clean desk, second opinion concept, patient X-ray and MRI images on lightbox, thoughtful professional evaluation, emerald and warm tones',
  },
  'prices': {
    scene: 'Clean modern medical reception desk with price list, transparent healthcare costs concept, stethoscope and calculator on white marble, professional trust, emerald accents',
  },
  'contacts': {
    scene: 'Aerial view of a beautiful city district with parks and modern buildings, medical clinic location marked, urban navigation concept, soft emerald overlay on white and green cityscape',
  },
  'doctors': {
    scene: 'Team of professional doctors in white coats standing together, diverse medical specialists, confident and approachable, modern clinic hallway, bright natural light, emerald accents',
  },
  'fibroadenoma': {
    scene: 'Ultrasound probe on clean medical surface with breast scan on monitor, modern breast diagnostics, reassuring clinical environment, emerald and white tones',
  },
  'mastopatiya': {
    scene: 'Medical consultation scene: doctor explaining breast health to patient with ultrasound images, calm diagnostic atmosphere, modern mammology office, emerald accents',
  },
  'kista-molochnoy-zhelezy': {
    scene: 'Ultrasound image of breast on a clean medical monitor, aspiration needle kit on sterile tray, precise diagnostics concept, clinical emerald and blue accents on white',
  },
  'eroziya-sheyki-matki': {
    scene: 'Modern colposcope in a bright gynecological office, clean clinical environment, reassuring medical setting, soft natural light, emerald and white',
  },
  'gipotireoz': {
    scene: 'Elegant still life with thyroid hormone test tube, medical stethoscope, and pill organizer on clean white marble surface, endocrinology diagnostics, emerald accents',
  },
  'adenomioz': {
    scene: 'Abstract medical illustration of female reproductive health, soft organic shapes in muted rose and emerald tones, delicate anatomical silhouette, empathetic and clinical',
  },
  'endometrioz': {
    scene: 'Artistic representation of endometriosis awareness, delicate organic cellular structures in soft pink and emerald, medical illustration style, elegant and informative',
  },
  'tireoidit-khashimoto': {
    scene: 'Butterfly-shaped thyroid gland artistic illustration with immune system elements, autoimmune concept visualization, clinical endocrinology, emerald and soft blue on white',
  },
  'dlya-inogorodnikh': {
    scene: 'Travel and medical care concept: suitcase, airplane ticket, and medical folder on clean white surface, out-of-town patient journey, emerald and warm travel tones',
  },
  'nashi-rezultaty': {
    scene: 'Abstract data visualization of medical achievements: growth charts, statistics, and positive outcomes, clean infographic style, professional healthcare analytics, emerald and gold on white',
  },
  'media': {
    scene: 'TV studio setting with medical expert on camera, professional broadcast journalism, media appearance concept, studio lights and microphones, emerald and warm studio tones',
  },
  'blog': {
    scene: 'Open medical journal with stethoscope and reading glasses, knowledge sharing concept, stack of medical publications, clean academic aesthetic, emerald bookmark accent',
  },
  'tax-form': {
    scene: 'Tax deduction document and medical receipt on white desk, healthcare tax benefit concept, official stamp, pen, organized paperwork, emerald folder accent',
  },
  'licenses': {
    scene: 'Official medical license certificate with gold seal on white surface, framed diplomas in background, professional credentials, trust and authority, emerald and gold tones',
  },
  'privacy-policy': {
    scene: 'Privacy and data protection concept: locked padlock on clean white surface, shield icon, medical records secured, trust and confidentiality, emerald and silver tones',
  },
  'prices-full': {
    scene: 'Detailed medical price list on clean white clipboard, transparent healthcare pricing, stethoscope and official document, professional pricing structure, emerald accents',
  },
}

function buildOgPrompt(slug) {
  const entry = OG_PROMPTS[slug]
  if (!entry) return null
  return `${STYLE_PREFIX} ${entry.scene}`
}

function listOgPrompts() {
  return Object.entries(OG_PROMPTS).map(([slug, data]) => ({
    slug,
    scene: data.scene,
    fullPrompt: `${STYLE_PREFIX} ${data.scene}`,
  }))
}

export { OG_PROMPTS, STYLE_PREFIX, buildOgPrompt, listOgPrompts }
