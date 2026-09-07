const STYLE_PREFIX = 'Premium editorial medical illustration for a luxury healthcare clinic magazine cover. Minimalist composition, soft diffused natural lighting, muted sophisticated earth tones with deep cerulean-teal (#1C89A1) accents. Clean white or light cream background with elegant depth. No text, no logos, no watermarks, no letters, no words. Photorealistic with subtle artistic touch, high-end aesthetic.'

const PROMPTS = {
  '15-pravil-grudnogo-vskarmlivaniya': {
    scene: 'A serene mother gently holding her newborn baby, soft morning light, cozy atmosphere with natural fabrics, intimate bonding moment, warm pastel tones',
  },
  'abnormalnyy-mazok-chto-delat': {
    scene: 'A microscope in a modern clinical laboratory, glass slides with cytology samples, clean white surfaces, subtle emerald lighting accents, precise medical diagnostics',
  },
  'adenomioz-prichiny-simptomy-lechenie': {
    scene: 'Abstract medical illustration of female reproductive health, soft organic shapes in muted rose and emerald tones, delicate anatomical silhouette, empathetic and clinical',
  },
  'autoimmunyye-zabolevaniya-u-zhenshchin': {
    scene: 'Elegant laboratory scene with blood test tubes and immune system visualization, abstract antibody shapes, clinical precision, emerald and gold accents on white',
  },
  'bol-v-grudi-i-risk-raka': {
    scene: 'A woman during a calm mammology consultation, doctor examining with ultrasound, modern medical office, reassuring and professional atmosphere, soft lighting',
  },
  'chto-takoe-fibroadenoma': {
    scene: 'Ultrasound probe on clean medical surface, modern breast diagnostics equipment, clinical white and emerald tones, professional medical environment',
  },
  'endometrioz-prichiny-simptomy': {
    scene: 'Abstract artistic representation of endometriosis awareness, delicate organic cellular structures in soft pink and emerald, medical illustration style, elegant and informative',
  },
  'endometrioz-vs-rak-endometriya': {
    scene: 'Split composition showing two contrasting medical conditions, diagnostic tools on white surface, biopsy instruments, clinical comparison, emerald accent dividing line',
  },
  'eroziya-sheyki-matki': {
    scene: 'Modern colposcope in a bright gynecological office, clean clinical environment, reassuring medical setting, soft natural light from window, emerald accents',
  },
  'fibroadenoma-chastye-voprosy': {
    scene: 'A doctor in white coat reviewing patient questions on a tablet, warm consultation room, empathetic medical conversation, soft emerald and cream tones',
  },
  'gipotireoz-simptomy-lechenie': {
    scene: 'Elegant still life with thyroid hormone test tube (TSH label), medical stethoscope, and pill organizer, clean white marble surface, emerald accents, clinical precision',
  },
  'gormonal-naya-terapiya-pri-menopauze': {
    scene: 'Elegant woman in her 50s in a modern medical consultation, hormone therapy discussion, warm professional atmosphere, books and medical references visible, emerald tones',
  },
  'kak-izbezhat-operatsii-na-grudi': {
    scene: 'Minimally invasive medical equipment (VAB device) on sterile white surface, alternative to surgery concept, clean modern clinical aesthetic, emerald accents',
  },
  'kak-podgotovitsya-k-mammografii': {
    scene: 'Modern mammography machine in a bright clean room, preparation checklist on clipboard nearby, welcoming medical environment, soft lighting, emerald and white',
  },
  'kak-podgotovitsya-k-priemu-endokrinologa': {
    scene: 'A neatly organized preparation for a doctor visit: medical records folder, hormone test results, list of medications, pen on clean white desk, emerald file folder',
  },
  'kak-podgotovitsya-k-priemu-ginekologa': {
    scene: 'Calm modern gynecological office interior, comfortable examination chair visible in background, fresh flowers on desk, welcoming medical space, soft emerald accents',
  },
  'kak-podgotovitsya-k-vab': {
    scene: 'Patient preparation kit on white medical tray: ultrasound images, consent form, sterile supplies, clean modern clinical setting, precise and reassuring, emerald accents',
  },
  'kak-prokhodit-priem-ginekologa': {
    scene: 'Doctor and patient having a calm conversation in a modern consultation room, medical computer screen in background, empathetic professional interaction, emerald and cream',
  },
  'kak-prokhodit-uzi-molochnyh-zhelez': {
    scene: 'Close-up of breast ultrasound being performed, ultrasound screen showing scan image, clean medical environment, gentle professional procedure, emerald and white tones',
  },
  'kishechnik-i-nastroenie': {
    scene: 'Artistic representation of gut-brain connection, beautiful array of probiotic-rich foods (fermented vegetables, yogurt), brain silhouette, emerald botanical elements, clean white background',
  },
  'kista-molochnoy-zhelezy': {
    scene: 'Ultrasound image of breast cyst on a clean medical monitor, doctor reviewing results, modern diagnostic equipment, clinical precision, emerald and blue accents on white',
  },
  'mammografiya-ili-uzi': {
    scene: 'Side-by-side elegant composition: mammography machine and ultrasound probe, comparing two diagnostic methods, clean white clinical space, emerald dividing accent',
  },
  'metabolicheskoe-zdorovye-i-ves': {
    scene: 'Artistic flat lay with healthy foods (avocado, nuts, salmon), glucose meter, measuring tape on white marble surface, metabolic health concept, emerald and warm accents',
  },
  'mylnaya-opera-o-kistoznoy-mastopatii': {
    scene: 'Medical consultation scene with ultrasound images of breast tissue on lightbox, doctor reviewing with patient, calm and informative atmosphere, emerald accents',
  },
  'perimenopauza-vs-menopauza': {
    scene: 'Elegant timeline visualization showing life stages of a woman, soft gradient from warm to cool tones, abstract feminine silhouettes at different ages, emerald accents',
  },
  'pervichnaya-medpomoshch-zhenshchinam': {
    scene: 'Warm doctor-patient relationship scene, trusted female physician with patient records spanning years, personal medical history folder, cozy professional office, emerald and cream',
  },
  'pitaniye-i-gormony': {
    scene: 'Beautiful overhead shot of hormone-balancing foods: leafy greens, walnuts, flaxseeds, avocado, arranged artistically on white surface with emerald ceramic dishes',
  },
  'pitaniye-pri-spkya': {
    scene: 'Elegant plate with low-glycemic-index meal: grilled salmon, colorful vegetables, quinoa, anti-inflammatory spices, clean white table setting, emerald napkin accent',
  },
  'profilakticheskiy-skrining-zhenshchin': {
    scene: 'Organized screening timeline checklist with age milestones, medical tests icons, stethoscope and calendar on white desk, systematic preventive care concept, emerald highlights',
  },
  'rannyaya-diagnostika-raka-grudi': {
    scene: 'Pink awareness ribbon alongside modern diagnostic tools (mammogram, ultrasound probe), hopeful and empowering composition, soft lighting, emerald and pink on white',
  },
  'simptomy-gipotireoza-i-gipertireoza': {
    scene: 'Split artistic composition: left side showing cold/slow hypothyroidism symptoms (ice, fatigue), right showing warm/fast hyperthyroidism (heat, energy), thyroid gland center, emerald accents',
  },
  'stres-i-gormony': {
    scene: 'Abstract visualization of stress hormones and menstrual cycle disruption, cortisol molecule artistic rendering, calendar with irregular marks, soft emerald and muted coral tones',
  },
  'tazovye-boli-u-zhenshchin': {
    scene: 'Empathetic medical illustration of pelvic pain diagnosis, gentle doctor consultation, anatomical reference chart in background, soft reassuring colors, emerald and warm neutrals',
  },
  'testirovaniye-gormonov-menopauza': {
    scene: 'Elegant laboratory scene with hormone test results paper, FSH and estradiol levels chart, medical interpretation concept, clean clinical aesthetic, emerald and gold accents',
  },
  'tonkoigolnaya-punktsionnaya-biopsiya': {
    scene: 'Fine needle aspiration biopsy setup: thin needle, ultrasound probe, and cytology slides on sterile medical tray, precise minimally invasive procedure concept, emerald and white',
  },
  'top-5-obrashcheniy-2025': {
    scene: 'Modern clinic reception with five symbolic icons representing top medical consultations, clean infographic style, professional healthcare statistics, emerald and white palette',
  },
  'vab-ili-operatsiya': {
    scene: 'Comparison composition: VAB device vs surgical scalpel on clean white surface, minimally invasive vs traditional approach, modern medical choice, emerald dividing accent line',
  },
  'zabolevaniya-schitovidnoy-zhelezy': {
    scene: 'Elegant medical illustration of butterfly-shaped thyroid gland, hormone molecules floating around it, clinical endocrinology concept, emerald and soft blue on white',
  },
  'zdorovye-grudi-samoosmotr': {
    scene: 'Self-examination awareness illustration, woman performing breast self-check, educational medical poster style, empowering and calm, soft pink and emerald on white',
  },
  'zhenskiy-stres-osobennosti': {
    scene: 'Abstract artistic representation of female stress response, brain and hormonal system visualization, calming and scientific, soft warm tones with emerald accents, elegant composition',
  },
}

const AVAILABLE_MODELS = [
  { id: 'black-forest-labs/flux.2-pro', name: 'FLUX 2 Pro', description: 'Best quality, photorealistic' },
  { id: 'google/gemini-3-pro-image-preview', name: 'Nano Banana Pro', description: 'Gemini 3 Pro, high quality' },
  { id: 'google/gemini-3.1-flash-image-preview', name: 'Nano Banana 2', description: 'Gemini 3.1 Flash, up to 4K' },
  { id: 'google/gemini-2.5-flash-image', name: 'Nano Banana', description: 'Gemini 2.5 Flash' },
  { id: 'bytedance/seedream-4.5', name: 'Seedream 4.5', description: 'ByteDance, high quality' },
  { id: 'bytedance/seedream-5-lite', name: 'Seedream 5.0 Lite', description: 'ByteDance, fast' },
  { id: 'openai/gpt-image-1.5', name: 'GPT Image 1.5', description: 'OpenAI quality' },
]

function buildPrompt(slug) {
  const entry = PROMPTS[slug]
  if (!entry) return null
  return `${STYLE_PREFIX} ${entry.scene}`
}

function listPrompts() {
  return Object.entries(PROMPTS).map(([slug, data]) => ({
    slug,
    scene: data.scene,
    fullPrompt: `${STYLE_PREFIX} ${data.scene}`,
  }))
}

export { STYLE_PREFIX, PROMPTS, AVAILABLE_MODELS, buildPrompt, listPrompts }
