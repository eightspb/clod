> **Исторический документ** (последнее изменение 2026-04-01). Актуальное состояние проекта — в `README.md`; стек с сентября 2026 года — Astro 7, `@astrojs/db` заменён на drizzle + libsql.

# User Research Plan: Клиника Одинцова

**Project:** Expert Medical Clinic Website Redesign
**Target Audience:** Russian women 30–65 years old, breast health and women's health concerns
**Research Period:** March–May 2026
**Last Updated:** March 30, 2026

---

## Research Objectives

### Primary Goals

1. **Validate the shift from aggressive to evidence-based positioning** — understand if women respond better to transparent, truthful claims about doctor expertise than overstatements like "№1 in Russia" or "99% success"

2. **Understand decision-making barriers in breast and women's health diagnostics** — identify psychological, financial, and informational obstacles that prevent anxious women from scheduling appointments or choosing procedures

3. **Evaluate the effectiveness of "second opinion" messaging** — test whether the free second opinion offer resonates as a trust-builder or feels like a sales tactic in a medical context

4. **Assess website navigation and confidence for non-urgent scenarios** — how do women move from initial browsing to appointment booking when they're not in acute pain or obvious risk?

5. **Measure doctor E-E-A-T credibility signals** — validate that doctor profiles (publications, TV appearances, education, patient reviews) effectively reduce anxiety and increase trust

6. **Identify information gaps in the sales funnel** — what questions or concerns are not addressed on the site that cause hesitation or drop-off?

---

## Research Questions

### Strategic Questions (High Priority)

1. **What emotional barriers prevent women from contacting the clinic?**
   - Fear of diagnosis / "what if they find something?"
   - Distrust of medical providers in Russia (overdiagnosis, unnecessary treatments)
   - Cost concerns (is pricing transparency sufficient?)
   - Cultural or taboo feelings about breast/gynecological exams

2. **Does the "truthful copy + free second opinion" messaging reduce anxiety or create skepticism?**
   - Do phrases like "We explain the next step without pressure" feel genuine or evasive?
   - Does "бесплатное второе мнение" (free second opinion) strengthen trust or trigger suspicion of low quality?

3. **Which doctor credentials matter most for trust in a Russian medical context?**
   - Scientific publications vs. TV appearances vs. years of experience?
   - ProDoctorov ratings vs. clinic branding?
   - Does a "д.м.н." (PhD in medicine) override younger doctors?

4. **How do women prefer to learn about procedures (VAB, mammography, screening)?**
   - Written explanations on the website?
   - Video demonstrations?
   - Doctor consultation (first appointment)?
   - Patient testimonials / user reviews?

5. **What information architecture helps non-medical women understand "second opinion" vs. "full consultation" vs. "procedure"?**
   - Are the three hero slide scenarios clear enough?
   - Do women understand the "expected duration" and "next steps" for each journey?

### Tactical Questions

6. How do women navigate from the homepage to a specific service (e.g., VAB) vs. doctor selection?

7. Do women read the FAQ sections or skip to booking/contact buttons?

8. Is the mobile "sticky CTA" (call / book) prominent and clear enough to drive action?

9. What role does the blog play in building authority and reducing anxiety?

10. Do women prefer to call first or submit documents for second opinion remotely?

---

## Recommended Methods & Timeline

| Method | Objective | Sample | Duration | Timeline | Priority |
|--------|-----------|--------|----------|----------|----------|
| **In-depth interviews** | Understand anxieties, decision barriers, trust signals, info needs | 8–10 women (mix: past patients + prospects) | 45–60 min each | Weeks 1–4 | Critical |
| **Usability testing** | Test website navigation, hero copy, call-to-action clarity, second opinion flow | 5–6 women, 3 tasks each | 30–40 min each | Weeks 2–5 | Critical |
| **Survey (online)** | Quantify attitudes toward transparency, pricing, doctor credentials | 150–200 responses | 5–10 min | Weeks 3–6 | High |
| **Doctor credential A/B test** | Validate which E-E-A-T signals (publications, TV, education) drive conversions | Running on site, 2 variants | 2–4 weeks | Weeks 4–7 | Medium |
| **Content audit + heatmap review** | Identify what on-page content drives clicks vs. drop-off (use existing analytics) | Existing analytics + session replay | Continuous | Weeks 1–8 | Medium |
| **Competitive analysis** | Benchmark against other Russian medical sites (trust cues, copy tone, pricing) | 5–7 competitor sites | 1 week | Week 1 | Low |

**Total Research Duration:** 8 weeks
**Start Date:** Week of March 31, 2026
**End Date:** Week of May 26, 2026

---

## User Segments to Study

### Segment 1: Anxious Prospects (Primary)
**Characteristics:**
- 35–55 years old (family/career pressure)
- No current appointment scheduled; browsing out of concern (not acute pain)
- Distrusts medical overdiagnosis; hesitant about unnecessary procedures
- Budget-conscious; concerned about cost surprises
- Often researches extensively before calling

**Key Questions:**
- What reassures you most: doctor credentials, patient reviews, pricing transparency, or procedure explanations?
- How do you decide whether to call a clinic vs. researching more online?
- What would make you feel confident that the doctor won't push you into unnecessary treatment?

**Research Methods:** In-depth interviews (6), usability testing (3), survey

---

### Segment 2: Second Opinion Seekers (Secondary)
**Characteristics:**
- 40–65 years old (often already diagnosed or offered surgery elsewhere)
- Actively searching for reassurance / alternative opinions
- Moderate-to-high health literacy (has medical records)
- Rational decision-maker; wants doctor-to-doctor discussion, not reassurance theatre
- Likely to convert quickly (high intent)

**Key Questions:**
- How did you find Клиника Одинцова? (referral, search, ad?)
- What's your biggest concern about the operation/diagnosis you were offered?
- Would you rather submit documents online or have a first appointment in person?

**Research Methods:** In-depth interviews (4), survey, A/B testing of second opinion CTA

---

### Segment 3: Doctor Shoppers (Tertiary)
**Characteristics:**
- 30–50 years old (tech-savvy, often younger professionals)
- Browsing specifically for a doctor match (not just a clinic)
- Influenced by doctor's online presence, reviews, credentials
- May comparison-shop across multiple doctors in one clinic
- Likely to read full doctor bio and patient reviews

**Key Questions:**
- How do you evaluate a doctor's credibility online?
- What would make you book with one doctor over another in the same clinic?
- Do you read about their education, publications, media appearances?

**Research Methods:** Usability testing (doctor card interaction), survey, analytics review

---

### Segment 4: Past Patients (Validation)
**Characteristics:**
- 40–65 years old (established relationship with clinic)
- Already committed; now booking follow-ups or referring friends
- High satisfaction (assumption)
- Can validate what messaging resonated during their initial discovery

**Key Questions:**
- When you first found the clinic, what made you trust it enough to call?
- Was there anything on the website that confused or worried you?
- What would you tell a friend who's hesitant about coming?

**Research Methods:** Brief interviews (2–3), open-ended survey questions

---

## Interview Guide

### Session Structure: 60 minutes

---

### Warm-Up (5 minutes)

**Goals:** Build rapport, set context, explain confidentiality

**Script:**

> "Thank you for taking the time today. My name is [Name], and I'm helping Клиника Одинцова understand how women think about health decisions and how the website can be more helpful. There are no right or wrong answers — I'm curious about your honest experience and thoughts. Everything you share is confidential and will be anonymized. Does that sound okay?"

**Questions:**
1. How are you doing today? (Small talk)
2. Have you participated in user research before?

---

### Context: Current Health & Medical Behaviors (8 minutes)

**Goals:** Understand baseline anxiety level, medical decision-making style, where they get information

**Questions:**

3. Tell me about your experience with medical appointments in Russia. What's been your typical approach — do you research a lot beforehand, or do you mostly trust your GP's referral?

4. When it comes to breast health or women's health specifically, what's top of mind for you right now? (Probe: screening, follow-up, preventive care, concern)

5. If you were going to choose a new doctor for a health concern, where would you start? (Web search? Referral? Rating sites?)

6. What typically worries you *before* a medical appointment?

---

### Deep Dive: Concerns, Barriers, Decision-Making (25 minutes)

**Goals:** Understand emotional blockers, trust factors, and what information changes their mind

**Questions:**

7. I want to understand hesitation around medical decisions. Have you ever put off or postponed a doctor's appointment? What held you back?

8. Tell me about the last time a doctor recommended a procedure or treatment that you weren't sure about. How did you decide what to do?

9. **On overdiagnosis / distrust:** In Russia, there's sometimes concern that doctors recommend unnecessary treatments to increase revenue. How much does that worry concern you when choosing a clinic or doctor?

10. **On transparency:** When you read a doctor's clinic website, what makes you feel like they're being honest with you vs. just selling? (Probe: specific language, pricing clarity, patient reviews, doctor backgrounds)

11. **On cost:** How much do you research pricing before booking a medical appointment? Is cost transparency a major factor in your decision?

12. What would make you most confident that a particular clinic or doctor wouldn't push you into unnecessary treatment?

---

### Concept Reaction: Website Messaging (15 minutes)

**Goals:** Test the new "truthful copy" positioning and second opinion messaging

**Show the hero section (screenshot or live demo):**

> *"Вакуумная аспирационная биопсия по показаниям и под УЗ-контролем. Обсуждаем объём вмешательства, показания и дальнейшее наблюдение заранее."*
> (VAB by indication and under ultrasound control. We discuss the scope, indications, and follow-up monitoring in advance.)

**Questions:**

13. What's your immediate reaction to that statement? (Does it feel reassuring, clinical, evasive? Why?)

14. Compare this to: "Вакуумная аспирационная биопсия — самое деликатное удаление образований без скальпеля." (VAB is the most delicate removal of lesions without a scalpel.)
    Which sounds more trustworthy to you? Why?

15. **On second opinion:** The clinic offers "бесплатное второе мнение" (free second opinion). What's your reaction? Does it feel like a trust-builder, or does it raise suspicion?

16. Show doctor profile cards. Which credentials make you most confident in a doctor's expertise?
    - Years of experience (30 лет в практике)?
    - Scientific publications (68 научных работ)?
    - TV appearances (Выступления в СМИ)?
    - ProDoctorov rating?
    - Advanced degrees (д.м.н.)?

17. Look at the blog section. How important is it to you that a clinic publishes educational articles? Would that make you trust them more?

---

### Scenarios & Task-Based (Optional, 10 minutes — if time)

**For usability testing portion, give specific tasks:**

18. *"Imagine you were diagnosed with a suspicious lesion and offered surgery at another clinic. You want a second opinion. How would you approach finding this clinic on their website? Walk me through what you'd click."*

19. *"Show me how you would find out what ВАБ procedure actually is before calling."*

20. *"Find a specific doctor you'd want to see. How would you decide?"*

(Observe: Do they look for "Второе мнение" page? Do they call numbers? Do they read doctor bios?)

---

### Wrap-Up (2 minutes)

**Questions:**

21. Is there anything else about choosing a clinic or doctor that we didn't cover?

22. Can we follow up if we have clarifying questions?

---

### Interviewer Notes

- **Tone:** Empathetic, non-judgmental. This is a sensitive topic (health anxiety, medical trauma, distrust).
- **Probes:** When answers are vague ("it felt off"), dig deeper: "Can you give me an example?" or "What specifically made you feel that way?"
- **Listen for emotional language:** Anxiety triggers, trust signals, cultural assumptions about Russian medicine.
- **Observe:** Body language, hesitation, where they spend time on the website.

---

## Usability Test Script

### Session Structure: 40 minutes

**Participants:** 5–6 women from Segments 1 & 2 (anxious prospects + second opinion seekers)

---

### Warm-Up (5 minutes)

> "Today we're testing the Клиника Одинцова website. I want to see how easy or confusing it is for someone looking for information about breast health. You won't be graded — if something is hard to find or unclear, that's helpful feedback. Think out loud as you explore."

---

### Task 1: First Impression (5 minutes)

**Task:** "You just arrived on the website. Without clicking anything, tell me what this clinic is about in your own words. What services stand out to you?"

**Observe:**
- Do they understand VAB as the main service?
- Do they notice the second opinion offer?
- Do they feel anxious or reassured by the hero messaging?

---

### Task 2: Learn About a Procedure (8 minutes)

**Scenario:** "Imagine you were referred to an ultrasound and the radiologist mentioned a small lesion. You're worried about what happens next. Find information about what ВАБ is and whether it might apply to your situation."

**Observe:**
- Do they go to `/vab` directly, search the hero slides, or ask for menu?
- Do they find the FAQ and understand it?
- What information is missing?
- Do they feel more or less anxious after reading?

---

### Task 3: Choose a Doctor (8 minutes)

**Scenario:** "You want to see a specific doctor for a consultation. Find a doctor you'd feel comfortable with and explain why."

**Observe:**
- Do they click on `/doctors`?
- Do they read full bios or just look at photos?
- What matters: name, experience, reviews, credentials?
- Do they compare multiple doctors or choose the first one?

---

### Task 4: Book a Second Opinion (8 minutes)

**Scenario:** "You have ultrasound images from another clinic and want a second opinion. Walk me through how you'd submit them."

**Observe:**
- Do they click "Второе мнение" in the nav?
- Do they find the form or try to call first?
- Is the form clear (what to upload, what happens next)?
- Do they understand pricing (free)?

---

### Follow-Up Questions (5 minutes)

23. Was anything confusing or hard to find?
24. What made you trust (or distrust) the clinic based on what you saw?
25. Would you call them or submit documents online? Why?

---

## Survey Design

**Platform:** Typeform or Google Forms (embedded on site exit intent or sent via email)
**Duration:** 5–10 minutes
**Target:** 150–200 responses

### Core Questions

**Demographics (Branching):**

1. Age range: 30–40 / 40–50 / 50–65 / 65+
2. Have you visited the Клиника Одинцова website before? Yes / No
3. Are you currently: Looking for initial consultation / Seeking second opinion / Follow-up patient / Researching for a friend

**Trust & Transparency (Likert scale 1–5):**

4. The clinic's website makes me feel confident they won't recommend unnecessary treatment.
   1 = Strongly disagree ... 5 = Strongly agree

5. I prefer when a clinic is transparent about what a procedure involves and its risks, even if it sounds scary.
   1 = Strongly disagree ... 5 = Strongly agree

6. A "free second opinion" offer makes me more likely to contact a clinic.
   1 = Strongly disagree ... 5 = Strongly agree

**Doctor Credentials (Rank by importance):**

7. When choosing a doctor, rank these by how much they matter to you:
   - Years of clinical experience
   - Scientific publications / research
   - Media appearances (TV, articles)
   - Patient reviews on ProDoctorov
   - Educational degree (MD, PhD, etc.)
   - Recommendation from someone you know

**Information Architecture:**

8. How would you prefer to learn about a medical procedure?
   - Written explanation on website
   - Video demo
   - Patient testimonial
   - Doctor consultation (first appointment)

9. If you had a concern that wasn't addressed on the website, would you: Call directly / Email / Browse more / Go to a different clinic

**Barriers (Multiple choice):**

10. What makes you hesitant about booking a medical appointment for breast/gynecological health? (Select all)
    - Fear of what they might find
    - Worry about unnecessary treatment
    - Cost concerns
    - Uncomfortable with the topic
    - Don't know where to start
    - Bad past medical experience
    - Don't trust doctors in Russia
    - No barrier — I'd book

**Open-ended:**

11. What's one thing this clinic could do on their website to make you more likely to book an appointment?

---

## Success Metrics

### Quantitative Metrics (from existing analytics + survey)

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| **Second opinion form submissions** | Current rate | +30% increase after messaging refinement | Post-research (6 weeks) |
| **Hero slide interaction** | % of users who click through all 3 slides | 50%+ of visitors engage >1 slide | Ongoing tracking |
| **Doctor page click-through** | From home → doctor profile | 35%+ of visitors view ≥1 doctor | Ongoing tracking |
| **"Запись" (Book) CTA engagement** | Calls vs. form submissions | 40% calls, 60% form submissions (or inverse) | Baseline → Target |
| **Time to conversion** | Avg. days from first visit to appointment booking | <7 days for 60% of prospects | Post-messaging update |
| **Mobile sticky CTA taps** | % of mobile users who tap call/book button | >15% of mobile sessions | Current tracking |
| **Blog article engagement** | Avg. time on blog article, scroll depth | >2 min read time, 70%+ scroll depth | Ongoing tracking |
| **FAQ section engagement** | % of users reading FAQ before/after copy test | +20% engagement | A/B test period |

### Qualitative Metrics (from interviews + usability tests)

| Finding | Validation Target | Method |
|---------|------------------|--------|
| **Anxiety reduction** | 70%+ of prospects report feeling "more reassured" after viewing doctor profiles and FAQ | Interview post-website review |
| **Trust in "truthful copy"** | 80%+ prefer transparent language ("обсуждаем показания") over bold claims ("самое деликатное") | Survey + interview reactions |
| **Second opinion conversion** | 60%+ of second opinion seekers would contact the clinic after reading the process | Usability task completion |
| **Doctor E-E-A-T effectiveness** | 75%+ cite specific doctor credential (publications, degree, experience) as trust driver | Interview question 16 |
| **Information clarity** | 85%+ can explain VAB in own words after reading the website | Usability task 2 completion |
| **Navigation confidence** | 80%+ can find their desired action (book, learn, view doctor) in <3 clicks | Usability task completion times |
| **Mobile UX satisfaction** | 70%+ find sticky CTA helpful and not intrusive | Survey + mobile usability test |

---

## Research Plan: Week-by-Week Breakdown

### Week 1 (March 31 — April 6)
- Finalize interview guides and survey questions
- Set up recruitment channels (email list, referral partner, incentive structure)
- Conduct competitive analysis of 5–7 Russian medical clinic sites
- Set baseline analytics (heatmaps, session replays, conversion rates)

### Week 2–4 (April 7–27)
- Conduct 8–10 in-depth interviews (Segments 1, 2, 4)
- Begin usability testing (5–6 participants, 2–3 per week)
- Launch online survey (incentivize with clinic discount or small gift card)
- Daily synthesis: note emerging themes, refine follow-up questions

### Week 5–6 (April 28 — May 11)
- Complete usability testing (remaining sessions)
- Continue survey responses (aim for 150–200)
- Analyze interview transcripts: affinity mapping, theme clustering
- Prepare preliminary findings report

### Week 7 (May 12–18)
- A/B test doctor credential variants (if time + resources)
- Synthesize all findings: create affinity map, recommendations doc
- Prepare highlight reel (key quotes, video clips)
- Draft final report with actionable recommendations

### Week 8 (May 19–25)
- Present findings to clinic stakeholders
- Prioritize recommendations by impact/effort
- Plan next sprint: messaging updates, website redesigns, A/B tests

---

## Recruitment Strategy

### Who to Recruit

**Ideal Participants:**
- Russian-speaking women, 30–65 years old
- Visited clinic website, submitted form, or called in last 3 months (+ prospects with no contact)
- No active acute medical crisis (research focus, not sales support)
- Available for 45–60 min interview or 40 min usability test
- Comfortable discussing health topics candidly

### Recruitment Channels

1. **Clinic's existing email list** — contact past patients + newsletter subscribers
2. **Referral partners** — ask clinic staff for recommendations (colleagues' relatives, trusted friends)
3. **Screened cold outreach** — post on Russian mom/women's health forums (Pikabu, women's VK communities)
4. **Incentives** — offer small gift card (500–1000 ₽) or clinic discount coupon (10% off next visit)
5. **Professional recruiters** — if budget allows, hire a Russian user research recruiter (e.g., YouScan, Respondent.io with Russia support)

### Screener Questions

- "Have you had a medical appointment in Russia in the last 12 months?"
- "Are you comfortable discussing women's health topics?"
- "What's your main reason for visiting the Клиника Одинцова website?" (open)
- Availability (dates/times)
- Device preference (in-person, video, phone)

---

## Analysis & Synthesis

### Affinity Mapping

**Process:**
1. Transcribe interviews (or take detailed notes) — one observation per sticky note
2. Group by theme: Anxiety triggers | Trust signals | Information needs | Decision barriers | Design confusions | Competitive context
3. Sub-themes: e.g., under "Anxiety triggers" — fear of diagnosis, fear of cost, fear of unnecessary surgery, cultural taboos
4. Count frequency: How many participants mentioned each theme?
5. Prioritize by impact: What affects the largest % of your audience?

### Jobs-to-Be-Done Analysis

**For each segment, identify the "job":**
- **Anxious Prospect:** "I need to feel confident that seeking a second opinion is the right decision and won't lead to unnecessary treatment"
- **Second Opinion Seeker:** "I need a quick, professional reassurance that my diagnosis is correct and my options are explained clearly"
- **Doctor Shopper:** "I need to find a doctor whose expertise and communication style match my needs"

### Impact/Effort Matrix

Plot recommended changes:
- **High Impact, Low Effort:** Do first (e.g., add FAQ about cost transparency)
- **High Impact, High Effort:** Plan for next sprint (e.g., video doctor testimonials)
- **Low Impact, Low Effort:** Nice-to-haves (e.g., subtle copy tweaks)
- **Low Impact, High Effort:** Deprioritize (e.g., full website redesign)

### Documentation

**Deliverables:**
1. **Research Report** (15–20 pages)
   - Executive summary (1 page)
   - Methodology (participants, methods, timeline)
   - Key findings (5–8 major themes)
   - Recommendations (prioritized by impact)
   - Appendix: transcripts, video clips, raw data

2. **Highlight Reel** (5–10 quotes + 1–2 video excerpts)
   - "When I see that the clinic publishes articles, I feel like they actually care about patient education, not just selling"
   - "The phrase 'без давления' [without pressure] — I appreciated that because most doctors push you"
   - "Free second opinion? In Russia, that makes me worried it's low quality"

3. **Persona Documents** (1-page for each segment)
   - Name, photo, background
   - Key anxieties and trust signals
   - Jobs to be done
   - Relevant quotes

4. **Journey Map** (1 visual per segment)
   - Touchpoints: homepage → learn about services → choose doctor → book appointment
   - Emotions at each stage
   - Pain points and opportunities

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Low recruitment** (hard to find participants) | Delays research, small sample size reduces confidence | Start recruiting early; offer higher incentives; use multiple channels; partner with clinic staff |
| **Participant no-shows** | Wasted time, schedule delays | Confirm 24h before; use video call (reduces friction); have waitlist of backup participants |
| **Sensitive topic** | Participants uncomfortable discussing health | Build rapport, emphasize confidentiality, experienced interviewer, normalize health discussion |
| **Biased sample** | Only enthusiastic/dissatisfied patients show up | Recruit both patients AND prospects; use targeted email + cold outreach |
| **Analysis paralysis** | Too much data, hard to prioritize | Set clear decision rules before analysis; use affinity mapping + voting; timebox synthesis |
| **Findings ignored** | Recommendations not acted upon | Present findings to decision-makers weekly; frame as revenue impact, not just UX; prioritize by business goal |

---

## Budget Estimate (Optional)

| Item | Estimated Cost |
|------|----------------|
| Recruitment incentives (8–10 interviews × 500 ₽) | 5,000 ₽ |
| Survey incentives (100 responses × 200 ₽) | 20,000 ₽ |
| Usability testing incentives (6 × 500 ₽) | 3,000 ₽ |
| Transcription service (8–10 hours × 600 ₽/hr) | 6,000 ₽ |
| Session recording + storage (Maze, Lookback, or similar) | 5,000–10,000 ₽ |
| **Total (internal team) — Low estimate** | **39,000–44,000 ₽** |
| **With external recruiter or consultant (30% markup)** | **51,000–57,000 ₽** |

---

## Success Criteria for Research

**The research is successful if:**

1. ✅ We identify 3–5 major anxiety barriers preventing women from contacting the clinic
2. ✅ We validate whether "truthful copy" is more trusted than bold claims in Russian medical context
3. ✅ We learn which doctor E-E-A-T signals matter most (publications vs. TV vs. degree)
4. ✅ We find 2–3 quick wins (low-effort, high-impact messaging changes)
5. ✅ We identify 1–2 priority redesigns (e.g., second opinion form, doctor profile, CTA placement)
6. ✅ We get 15+ direct quotes from participants that inform messaging
7. ✅ We recommend a data-driven A/B test plan for the next quarter
8. ✅ Recommendations are presented to stakeholders and prioritized for implementation by end of May 2026

---

## Next Steps (Post-Research)

**Immediate (Week of May 26):**
- Present findings to clinic leadership + marketing team
- Create implementation backlog (prioritized by impact/effort)

**Short-term (June 2026):**
- Update hero messaging and FAQ based on findings
- Redesign second opinion form if needed
- A/B test 2–3 high-impact changes (messaging, CTA placement, doctor credentials display)

**Medium-term (July–August 2026):**
- Refine doctor profiles based on trust signals identified
- Create new FAQs or blog articles addressing identified info gaps
- Track conversion metrics (second opinion forms, appointment bookings, blog engagement)

**Long-term (Q3 2026):**
- Second round of research (validate changes; measure lift)
- Expand to other segments (e.g., male patients for endocrinology)
- Build continuous research program (ongoing feedback loops)

---

## Stakeholders & Approval

| Role | Approval Needed? | Contact | Notes |
|------|-----------------|---------|-------|
| Clinic Director | Yes | [Name] | Budget, messaging sign-off |
| Marketing Lead | Yes | [Name] | Will implement recommendations |
| Patient Relations | Inform | [Name] | Can help recruit participants |
| Lead Doctor(s) | Inform | Dr. Odintsov, Dr. Prikhodko | May provide input on clinical accuracy |

---

## Appendix: Sample Recruitment Email

---

**Subject:** Ваше мнение поможет улучшить сайт клиники — участвуйте в исследовании

Привет, [Name]!

Мы совершенствуем сайт Клиники Одинцова, чтобы сделать его более полезным для пациентов вроде вас.

Нам нужна ваша помощь. Мы ищем женщин, которые согласны на 45-60 минут поговорить о том, как они выбирают врача и что помогает им доверять медицинской клинике.

**За участие вы получите:**
- Подарочный сертификат на 1000 рублей (в клинику или на другие нужды)
- Возможность повлиять на развитие клиники
- Интересный разговор (мы обещаем!)

**Как это работает:**
- Видео-звонок или личная встреча (ваш выбор)
- Абсолютно конфиденциально — имена и данные не публикуются
- Никакого продажного давления — только вопросы

[Ссылка на форму регистрации или Calendly]

Вопросы? Напишите мне: [Email]

Спасибо,
[Your Name]
User Research, Клиника Одинцова

---

**End of User Research Plan**
