# Evidence base — internal only

**This file is never shown to users.** No route renders it and no card cites it.
It exists so a dietitian can sign off on what the app tells people, and so the
next person to touch `data/foods.json` knows which numbers rest on measurement
and which rest on judgement.

Last reviewed: 2026-07-09. Reviewed by: _(pending dietitian sign-off)_

---

## 1. The decision rule (this is the thing to sign)

No diabetes guideline anywhere — ADA included — publishes a "times per week"
number for an individual food. Guidelines recommend eating *patterns* and
carbohydrate amounts per meal. So the weekly count on each card is **not** a
research finding. It is a house rule, derived deterministically from measured
glycaemic index and the food's role, and it needs professional sign-off rather
than a citation.

The rule, in full (`scripts/frequency-numbers.mjs`):

| Condition | Answer |
|---|---|
| Portion says "None at all", no fallback amount | Never |
| Glucose / Lucozade | Never, except to treat a low sugar |
| `role: sugar`, or `baseVerdict: red`, or alcohol | About 1 time a month |
| Sugar-free and starch-free green food (veg, green soup, plain protein, healthy fat, plain low-GI drink) | Every day |
| Salt, seasoning cube (no sugar, no starch; the limit is the amount, not the day) | Every day |
| Legume | 4 times a week |
| Dairy | green 4, yellow 3 |
| Any drink not covered above | 2 times a week |
| Fruit | high GI 2, otherwise 3 |
| Everything else (starch, grain, tuber) | high GI 2, otherwise 3 |

**Asymmetry rule, deliberate.** Evidence that a food is *worse* than we thought
is acted on from a single credible in-vivo measurement. Evidence that a food is
*better* than we thought requires two independent sources. Under-calling risk
harms a person with diabetes; over-calling it only inconveniences them.

**"Every day" still never applies to a food carrying sugar or starch.** The salt
and seasoning-cube exception is narrow and keyed on `role: condiment` with
`gi: low` and `carbLoad: low`. It is not a loosening of the sugar/starch gate.

---

## 2. Glycaemic index — measured values

GI bands are the ISO 26642-2010 thresholds: **low ≤55, medium 56–69, high ≥70**
([international tables, Atkinson et al.](https://ajcn.nutrition.org/article/S0002-9165(22)00494-4/fulltext)).

### Nigerian staples, measured in vivo

| Food | Measured GI | Source | Confidence |
|---|---|---|---|
| Fufu / akpu | 97.0 (diabetics), 94.8 (healthy) | [Makurdi dough-staples study](https://wjmbs.com.ng/index.php/wjmbs/article/view/41) | High |
| Garri / eba | 84.1 (diabetics), 80.6 (healthy) | Makurdi, as above | High |
| Pounded yam | 81.0 (diabetics), 80.8 (healthy) | Makurdi, as above | High |
| Amala (yam flour) | 69.3 (diabetics), 71.6 (healthy) | Makurdi, as above | Medium |
| Amala / agidi / eba, general | 82–99 | [GI compendium of non-western foods](https://www.nature.com/articles/s41387-020-00145-w) | High |
| Jollof rice | 98.9 | [Nigerian J. Nutritional Sciences](https://www.ajol.info/index.php/njns/article/view/216815) | Medium |
| Wheat flour dough (swallow) | 97.4 | Nigerian J. Nutr. Sci., as above | Medium |
| Pineapple | 94.9 | Nigerian J. Nutr. Sci., as above | Medium |
| Banana | 99.3 | Nigerian J. Nutr. Sci., as above | Low (see §3) |
| Boiled yam | 94 single food, 84 with fried egg | [SW Nigeria, n=80 healthy adults](https://www.sciencepublishinggroup.com/article/10.11648/10069896) | High (paper read, not just abstract) |
| Unripe plantain, **boiled** | 89 single food, 88 with stew | SW Nigeria, n=80, as above | High |
| Unripe plantain **flour** meal (plantain amala) | **52.80** | [Unripe plantain / red banana flour meals, n=12 healthy](https://bio-research.com.ng/index.php/home/article/view/259) | Medium (n=12) |
| Unripe red banana flour meal | 54.96 | as above | Medium |
| Plantain: boiled 96.5, roasted 92.0, fried 88.8 | | Nigerian staples study | Medium |
| Nigerian staples generally (tuwo, abacha, rice, plantain) | 75–97 | [ScienceDirect overview](https://pubmed.ncbi.nlm.nih.gov/36584553/) | High |

### The pairing mechanic is supported by measurement

The whole product rests on "add soup and meat and it slows the sugar". The SW
Nigeria study (n=80) measured exactly this, and the effect is real and large:

| Meal | GI alone | GI paired |
|---|---|---|
| Boiled yam | 94 | **84** with fried egg |
| Unripe plantain | 89 | 88 with stew |
| Boiled rice | 93 | lower in every mixed meal |
| Ogi (pap) | 92 | lower in every mixed meal |

"The GI of boiled-rice (93) and ogi (92) as single foods were significantly
higher than when eaten as mixed meals." Note the size of the effect varies by
what is added: a protein (egg) moved yam 10 points; a stew moved plantain 1.
The app should not promise that any pairing rescues any starch.

### Legumes — low, and this is well supported

| Food | Measured GI | Source | Confidence |
|---|---|---|---|
| African yam bean | 17 ± 6 | [Boiled legumes eaten in Nigeria](https://www.researchgate.net/publication/286364768_Glycemic_response_of_some_boiled_legumes_commonly_eaten_in_nigeria) | High |
| Brown cowpea (beans) | 29 ± 9 | as above | High |
| White cowpea | 30–41 | as above | High |

Confirms `cooked-beans`, `moi-moi`, `akara`, `african-yam-bean` as low GI.

### Rice

Parboiled rice GI **50–60**, consistently lower than white rice
([pilot trial in healthy and T2D adults](https://pmc.ncbi.nlm.nih.gov/articles/PMC12155248/)).
Supports `parboiled-rice: gi medium` and its 3×/week versus white rice's 2×.

---

## 3. Where sources conflict, and how it was resolved

**Banana.** Nigerian study measures 99.3. International tables put banana near
**51**. That is not a small disagreement, it spans the entire scale, and the
Nigerian figure would make a banana redder than white bread. Almost certainly a
methodological artefact (small n, reference food, ripeness). **Resolution: keep
`gi: medium`.** Do not act on the outlier. This is why single-study values are
not applied blindly.

**Pineapple.** Nigerian 94.9 vs international ~59. App already says `high`.
Kept, because tightening on one credible source is allowed by the asymmetry rule.

**Amala (yam flour).** Makurdi measures 69.3, which is *medium*. The compendium
puts amala in the 82–99 band. Two sources, one says medium, one says high.
**Resolution: keep `gi: high`** (the conservative reading). The earlier
suspicion that the app was wrong here did not survive cross-checking.

**Sweet potato.** Boiled sweet potato measures **41–50** (low) in Jamaican
cultivars. That would be a *loosening*, and the asymmetry rule requires two
independent sources; there is no Nigerian in-vivo measurement. **Resolution:
keep `gi: medium`.** Revisit if a second source appears.

**Plantain: the form is the food.** A first reading suggested the literature
contradicted itself — boiled unripe plantain at 89, yet "unripe plantain flour
GI 52.8, recommended for diabetic Nigerians". It does not contradict. They are
different foods:

- **Boiled** unripe plantain: **89** (n=80 healthy, paper read in full). High.
- Unripe plantain **flour** dough, i.e. plantain amala: **52.80** (n=12). Low.

Drying plantain into flour changes its starch. So `boiled-plantain-unripe:
gi high` stands on strong evidence, and the 52.8 figure never applied to it.
Beware secondary summaries that say "unripe plantain is low GI" without naming
the preparation; a boiled finger and a ball of plantain amala are not the same
food.

**Do not cite these for plantain.** [PMC5156628](https://pmc.ncbi.nlm.nih.gov/articles/PMC5156628/)
is a **rat** study on plantain-soybean-cassava blends, and the Springer
"blood glucose lowering" paper is also in rats. Neither supports a human GI
claim. They surface high in searches for plantain GI.

**Unresolved: roasted plantain.** The Nigerian staples overview puts roasted
plantain at **92** (high). A 60-subject study of processed unripe plantain
meals reports roasted as having the **lowest** GI of the preparations tested.
The full text is paywalled and the number could not be read. **Resolution: keep
`boli: gi high`**, the conservative reading, and flag it. This is the single
open question a dietitian should settle.

**`amala-plantain` (plantain flour swallow) stays `gi: medium`.** One verified
direct measurement (52.80) says low. That is a *loosening*, and the asymmetry
rule requires two independent sources; the second candidate is paywalled and
unverified. Medium already sits between the two readings. Revisit when the
60-subject paper can be read.

---

## 4. Corrections applied to `data/foods.json`

Applied by `scripts/evidence-gi.mjs`. Each is a **tightening**, per the
asymmetry rule.

| Food | Was | Now | Why |
|---|---|---|---|
| `boiled-plantain-unripe` | gi low, green | gi high, yellow | Measured 89 boiled. "Low GI / green" was not defensible. |
| `unripe-plantain-porridge` | gi low, green | gi high, yellow | Same plantain base. |
| `boiled-plantain-ripe` | gi medium | gi high | Boiled plantain 96.5; ripe is not gentler than unripe. |
| `boli` (roasted plantain) | gi medium | gi high | Roasted plantain 92.0. |
| `wheat-swallow` | gi medium | gi high | Wheat flour dough 97.4. |

Deliberately **not** changed: `amala-plantain` (plantain-flour amala has no
direct measurement; the 82–99 band is for yam-flour amala), `sweet-potato`,
`banana`, and every food with no in-vivo Nigerian data.

**Frequency inconsistency fixed.** `garri-eba` (GI 84), `amala-yam` and `lafun`
said "3 times a week" while `pounded-yam` (GI 81) and `white-rice` said "2".
That was legacy prose ("a few times a week"), not evidence.

Frequency is now `stricter(rule, stored)`. Deriving from the rule **alone** was
tried and rejected: the rule sees only `role`, `gi` and `carbLoad`, so it made
cow leg, cow tail, kidney and canned sardine into *daily* foods (they are green,
sugar-free proteins) and moved bacon and processed sausage from 2 to 3 times a
week. The stored number carried dietitian judgement about organ meat, saturated
fat, salt and processing that the rule cannot see. Taking the stricter of the
two keeps that judgement, and still fixes the eba/pounded-yam inconsistency.

Net effect: **11 foods tightened, 0 loosened**, plus the two condiments below.

| Food | Was | Now |
|---|---|---|
| Eba, amala (yam flour), lafun | 3×/wk | 2×/wk (GI 84, 82–99) |
| Boiled unripe plantain, unripe plantain porridge | 3×/wk | 2×/wk (GI 89) |
| Watermelon | 3×/wk | 2×/wk (high GI) |
| Oats | 4×/wk | 3×/wk (still a starch) |
| Pomelo, baobab, star fruit, mulberry | 4×/wk | 3×/wk (fruit rule) |
| Salt, seasoning cube | 3×/wk | Every day, with the amount capped |

Salt at "3 times a week" was never true; people cook with it daily. WHO caps the
**amount** (<5 g/day), which the portion field carries. Both are sugar-free and
starch-free, so the sugar/starch gate does not apply. `frequency-numbers.mjs`
asserts both really are `role: condiment`, `gi: low`, `carbLoad: low` before
allowing it.

### Knock-on effect worth knowing

Marking boiled ripe plantain as high GI means the verdict engine now seeds a
meal containing it at RED (any high-GI, non-green starch does). So
"beans + ripe plantain" moved from YELLOW to RED. That follows from the measured
value (96.5) and matches how eba and dodo already behave, but it is a visible
product change and the dietitian should be asked to confirm it.

---

## 5. Safety claims — comorbid conditions

| Claim in app | Evidence | Confidence |
|---|---|---|
| Star fruit is dangerous in kidney disease | Caramboxin is renally cleared; in severe CKD a single fruit can cause seizures, coma, death. Oxalate causes acute tubular necrosis. ([Brazilian J. Nephrology](https://www.bjnephrology.org/en/article/why-eating-star-fruit-is-prohibited-for-patients-with-chronic-kidney-disease/), [mechanisms review](https://www.sciencedirect.com/science/article/abs/pii/S0041010120303925)) | High. If anything the app **understates** this. |
| Salt harms heart and kidneys even when sugar is fine | WHO recommends <5 g salt/day. | High |
| Alcohol: never on an empty stomach, eat first | Alcohol inhibits gluconeogenesis; hypoglycaemia can strike up to **24 hours** later, especially on insulin or secretagogues. ADA: ≤1 drink/day women, ≤2 men. ([ADA](https://diabetes.org/health-wellness/alcohol-and-diabetes)) | High |
| Red/organ meat caution for BP, cholesterol, kidney | ADA advises minimising red meat and ultra-processed food. | Medium |
| Juicing removes fibre and raises sugar faster | Guideline-consistent (whole fruit preferred over juice). | High |

**Gap closed.** The alcohol cards said "no more than once a month" but never
warned about **delayed hypoglycaemia up to 24 hours later**, which is the thing
that actually harms people on insulin or secretagogues. Beer, pito, palm wine
and local gin now carry an `alcohol` health note (`scripts/health-notes.mjs`):
*"Alcohol can drop your sugar dangerously low, even a whole day after you drink.
This is worse if you take insulin or sugar-lowering tablets. Never drink on an
empty stomach. Eat first, and check your sugar before you sleep."*

---

## 6. What has no evidence, and never will

Roughly 260 of the 327 foods have no published GI value for their Nigerian
preparation, and no trial will ever be run on gizdodo, abacha or most soups.
For those, `gi` and `carbLoad` are dietitian judgement from composition. That is
legitimate and it is what a clinic would do, but **it is judgement, not
measurement**, and this file is the place that says so.

Source tiers used throughout: peer-reviewed in-vivo measurement > compendium /
systematic review > guideline body > secondary summary. No card cites a source,
by design — the evidence lives here.
