const STYLE_PREFIX = 'Premium editorial medical illustration for a luxury healthcare clinic magazine cover. Minimalist composition, soft diffused natural lighting, muted sophisticated earth tones with deep cerulean-teal (#1C89A1) accents. Clean white or light cream background with elegant depth. No text, no logos, no watermarks, no letters, no words. Photorealistic with subtle artistic touch, high-end aesthetic.'

const PROMPTS = {
  '15-pravil-grudnogo-vskarmlivaniya': {
    scene: 'A serene mother gently holding her newborn baby, soft morning light, cozy atmosphere with natural fabrics, intimate bonding moment, warm pastel tones',
  },
  'abnormalnyy-mazok-chto-delat': {
    scene: 'A microscope in a modern clinical laboratory, glass slides with cytology samples, clean white surfaces, subtle cerulean-turquoise (#1C89A1) lighting accents, precise medical diagnostics',
  },
  'adenomioz-prichiny-simptomy-lechenie': {
    scene: 'Abstract medical illustration of female reproductive health, soft organic shapes in muted rose and cerulean-turquoise (#1C89A1) tones, delicate anatomical silhouette, empathetic and clinical',
  },
  'autoimmunyye-zabolevaniya-u-zhenshchin': {
    scene: 'Elegant laboratory scene with blood test tubes and immune system visualization, abstract antibody shapes, clinical precision, cerulean-turquoise (#1C89A1) and gold accents on white',
  },
  'bol-v-grudi-i-risk-raka': {
    scene: 'A fully clothed adult woman and a female physician discussing grayscale ultrasound images on a tablet across a desk, reassuring mammology consultation, no examination, cream-white room with cerulean-turquoise (#1C89A1) upholstery',
  },
  'chto-takoe-fibroadenoma': {
    scene: 'Ultrasound probe on clean medical surface, modern breast diagnostics equipment, clinical white and cerulean-turquoise (#1C89A1) tones, professional medical environment',
  },
  'endometrioz-prichiny-simptomy': {
    scene: 'Abstract artistic representation of endometriosis awareness, delicate organic cellular structures in soft pink and cerulean-turquoise (#1C89A1), medical illustration style, elegant and informative',
  },
  'endometrioz-vs-rak-endometriya': {
    scene: 'Comparison of endometriosis and endometrial cancer diagnostics: two pale blush ceramic uterus models with ovaries and fallopian tubes, ultrasound probe on one side, microscope and histology slides on the other, fine cerulean-turquoise (#1C89A1) dividing accent, no digestive organs or exposed tissue',
  },
  'eroziya-sheyki-matki': {
    scene: 'Modern colposcope in a bright gynecological office, clean clinical environment, reassuring medical setting, soft natural light from window, cerulean-turquoise (#1C89A1) accents',
  },
  'fibroadenoma-chastye-voprosy': {
    scene: 'A doctor in white coat reviewing patient questions on a tablet, warm consultation room, empathetic medical conversation, soft cerulean-turquoise (#1C89A1) and cream tones',
  },
  'gipotireoz-simptomy-lechenie': {
    scene: 'Elegant still life with thyroid hormone test tube (TSH label), medical stethoscope, and pill organizer, clean white marble surface, cerulean-turquoise (#1C89A1) accents, clinical precision',
  },
  'gormonal-naya-terapiya-pri-menopauze': {
    scene: 'Elegant woman in her 50s in a modern medical consultation, hormone therapy discussion, warm professional atmosphere, books and medical references visible, cerulean-turquoise (#1C89A1) tones',
  },
  'kak-izbezhat-operatsii-na-grudi': {
    scene: 'Minimally invasive medical equipment (VAB device) on sterile white surface, alternative to surgery concept, clean modern clinical aesthetic, cerulean-turquoise (#1C89A1) accents',
  },
  'kak-podgotovitsya-k-mammografii': {
    scene: 'Modern mammography machine in a bright clean room, preparation checklist on clipboard nearby, welcoming medical environment, soft lighting, cerulean-turquoise (#1C89A1) and white',
  },
  'kak-podgotovitsya-k-priemu-endokrinologa': {
    scene: 'A neatly organized preparation for a doctor visit: medical records folder, hormone test results, list of medications, pen on clean white desk, cerulean-turquoise (#1C89A1) file folder',
  },
  'kak-podgotovitsya-k-priemu-ginekologa': {
    scene: 'Calm modern gynecological office interior, comfortable examination chair visible in background, fresh flowers on desk, welcoming medical space, soft cerulean-turquoise (#1C89A1) accents',
  },
  'kak-podgotovitsya-k-vab': {
    scene: 'Preparation for vacuum-assisted breast biopsy: grayscale breast-tissue ultrasound prints with a dark oval lesion, blank consent form, gloves and sterile supplies on a white tray, cerulean-turquoise (#1C89A1) clipboard, no pregnancy scans, fetuses or procedure',
  },
  'kak-prokhodit-priem-ginekologa': {
    scene: 'Doctor and patient having a calm conversation in a modern consultation room, medical computer screen in background, empathetic professional interaction, cerulean-turquoise (#1C89A1) and cream',
  },
  'kak-prokhodit-uzi-molochnyh-zhelez': {
    scene: 'Close-up of a linear ultrasound transducer in its holder beside an ultrasound console, grayscale tissue scan on screen, gel bottle and folded cerulean-turquoise (#1C89A1) towel, equipment only, no people or procedure',
  },
  'kishechnik-i-nastroenie': {
    scene: 'Artistic representation of gut-brain connection, beautiful array of probiotic-rich foods (fermented vegetables, yogurt), brain silhouette, cerulean-turquoise (#1C89A1) botanical elements, clean white background',
  },
  'kista-molochnoy-zhelezy': {
    scene: 'Ultrasound monitor showing grayscale speckled tissue with one well-defined dark oval fluid pocket, linear transducer in its holder, clean white clinical desk, cerulean-turquoise (#1C89A1) upholstery, no people or pregnancy images',
  },
  'mammografiya-ili-uzi': {
    scene: 'Side-by-side comparison of an unused mammography X-ray unit and an ultrasound console with linear transducer in a bright empty clinic, cerulean-turquoise (#1C89A1) dividing accent, no people or examination',
  },
  'metabolicheskoe-zdorovye-i-ves': {
    scene: 'Artistic flat lay with healthy foods (avocado, nuts, salmon), glucose meter, measuring tape on white marble surface, metabolic health concept, cerulean-turquoise (#1C89A1) and warm accents',
  },
  'mylnaya-opera-o-kistoznoy-mastopatii': {
    scene: 'Medical consultation scene with ultrasound images of breast tissue on lightbox, doctor reviewing with patient, calm and informative atmosphere, cerulean-turquoise (#1C89A1) accents',
  },
  'perimenopauza-vs-menopauza': {
    scene: 'Elegant timeline visualization showing life stages of a woman, soft gradient from warm to cool tones, abstract feminine silhouettes at different ages, cerulean-turquoise (#1C89A1) accents',
  },
  'pervichnaya-medpomoshch-zhenshchinam': {
    scene: 'Warm doctor-patient relationship scene, trusted female physician with patient records spanning years, personal medical history folder, cozy professional office, cerulean-turquoise (#1C89A1) and cream',
  },
  'pitaniye-i-gormony': {
    scene: 'Beautiful overhead shot of hormone-balancing foods: leafy greens, walnuts, flaxseeds, avocado, arranged artistically on white surface with cerulean-turquoise (#1C89A1) ceramic dishes',
  },
  'pitaniye-pri-spkya': {
    scene: 'Elegant plate with low-glycemic-index meal: grilled salmon, colorful vegetables, quinoa, anti-inflammatory spices, clean white table setting, cerulean-turquoise (#1C89A1) napkin accent',
  },
  'profilakticheskiy-skrining-zhenshchin': {
    scene: 'Preventive screening timeline for adult women: three circular portraits around ages 30, 45 and 60 linked by a cerulean-turquoise (#1C89A1) line above a desk with a calendar grid, checkmarks, stethoscope and folder, no children or men',
  },
  'rannyaya-diagnostika-raka-grudi': {
    scene: 'Pink awareness ribbon alongside modern diagnostic tools (mammogram, ultrasound probe), hopeful and empowering composition, soft lighting, cerulean-turquoise (#1C89A1) and pink on white',
  },
  'simptomy-gipotireoza-i-gipertireoza': {
    scene: 'Split artistic composition: left side showing cold/slow hypothyroidism symptoms (ice, fatigue), right showing warm/fast hyperthyroidism (heat, energy), thyroid gland center, cerulean-turquoise (#1C89A1) accents',
  },
  'stres-i-gormony': {
    scene: 'Abstract visualization of stress hormones and menstrual cycle disruption, cortisol molecule artistic rendering, calendar with irregular marks, soft cerulean-turquoise (#1C89A1) and muted coral tones',
  },
  'tazovye-boli-u-zhenshchin': {
    scene: 'Empathetic medical illustration of pelvic pain diagnosis, gentle doctor consultation, anatomical reference chart in background, soft reassuring colors, cerulean-turquoise (#1C89A1) and warm neutrals',
  },
  'testirovaniye-gormonov-menopauza': {
    scene: 'Elegant laboratory scene with hormone test results paper, FSH and estradiol levels chart, medical interpretation concept, clean clinical aesthetic, cerulean-turquoise (#1C89A1) and gold accents',
  },
  'tonkoigolnaya-punktsionnaya-biopsiya': {
    scene: 'Fine-needle aspiration biopsy preparation: a slim capped syringe, linear ultrasound transducer and cytology slides on a sterile tray with folded cerulean-turquoise (#1C89A1) drape, equipment only, no people, procedure or biological tissue',
  },
  'top-5-obrashcheniy-2025': {
    scene: 'Empty modern clinic reception with five cerulean-turquoise (#1C89A1) pictograms on frosted glass: ultrasound transducer, consultation speech bubbles, magnifying glass over a scan, calendar grid, butterfly-shaped thyroid gland, no writing',
  },
  'vab-ili-operatsiya': {
    scene: 'Comparison of unused instruments on two clean sterile trays: white and cerulean-turquoise (#1C89A1) vacuum-assisted biopsy handpiece versus polished surgical scalpel, thin turquoise dividing line, no specimen samples, biological tissue, blood or people',
  },
  'zabolevaniya-schitovidnoy-zhelezy': {
    scene: 'Elegant medical illustration of butterfly-shaped thyroid gland, hormone molecules floating around it, clinical endocrinology concept, cerulean-turquoise (#1C89A1) and soft blue on white',
  },
  'zdorovye-grudi-samoosmotr': {
    scene: 'Breast health awareness and self-check reminders: pink awareness ribbon beside a standing mirror and blank calendar grid with a turquoise circled square, folded cerulean-turquoise (#1C89A1) linen on a cream-white vanity, no people or examination',
  },
  'zhenskiy-stres-osobennosti': {
    scene: 'Abstract artistic representation of female stress response, brain and hormonal system visualization, calming and scientific, soft warm tones with cerulean-turquoise (#1C89A1) accents, elegant composition',
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
