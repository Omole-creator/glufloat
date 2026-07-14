# Evidence base — internal only

**This file is never shown to users.** No route renders it and no card cites it.
It exists so a dietitian can sign off on what the app tells people, and so the
next person to touch `data/foods.json` knows which numbers rest on measurement
and which rest on judgement.

Last reviewed: 2026-07-11. Reviewed by: _(pending dietitian sign-off)_

**Top three questions for the dietitian**, in order: (1) is `parboiled-rice`
medium or high — see §3; (2) confirm the weekly counts in §1, which are still a
house rule; (3) set a gram anchor for cooked pasta — see the end of §4.

---

## 0. A note on the July 2026 research synthesis

A research document on the glycaemic index of Nigerian foods was supplied by the
founder in July 2026 and is the source of the changes marked *(2026-07)* below.

**It is a secondary AI-generated synthesis. Its bracketed citations are not
resolvable from the text, so nothing in it is a primary source.** It was
therefore used **only to tighten, never to loosen** — see the asymmetry rule in
§1, and the six refusals in §3. Where it conflicts with a paper we read in full,
the paper wins. It repeats, in particular, the plantain flour-versus-boiled
mix-up this file already documents.

Its genuinely new and useful contributions were the **mixed-meal measurements**
(§2) and an independent route to the **weekly frequency numbers** (§1).

---

## 1. The decision rule (this is the thing to sign)

No diabetes guideline anywhere — ADA included — publishes a "times per week"
number for an individual food. Guidelines recommend eating *patterns* and
carbohydrate amounts per meal. So the weekly count on each card is **not** a
research finding. It is a house rule, derived deterministically from measured
glycaemic index and the food's role, and it needs professional sign-off rather
than a citation.

**It does, however, now have outside convergence (2026-07).** Reasoning from a
different starting point — a 21-meal week (3 meals × 7 days), allocated so that
low-GI food dominates — the synthesis lands on **high GI ≤ 2 meals a week,
medium GI 3–5, low GI the majority**. That is what `capFor()` already produces
(high 2, medium/low 3, legume 4, daily for sugar-free green food). Two unrelated
routes reaching the same numbers is worth recording, and it means our "2 times a
week" for eba is not arbitrary. **This is convergence, not a citation.** It does
not remove the need for sign-off.

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

**Nigerian mixed meals, as actually eaten (2026-07).** These are the numbers that
most directly support the product, because they are the real plate, not a lab
single food:

| Meal | The swallow alone | Eaten with the soup |
|---|---|---|
| Eba + efo-egusi | 99 | **74** |
| Amala + efo riro | 97 | **75** |
| Fufu + okra or ewedu | ~92 | **78–80** |
| Boiled rice, in a mixed meal | 93 | **74–78** |

The soup moves a swallow by roughly 20 GI points. That is large, it is measured,
and it is the whole mechanic. **But every one of those meals is still high GI
(≥70).** So the soup is a real improvement and not a rescue, which is exactly why
the engine also requires a small size before it will show green.

**The warning case, and it matters.** *Beans porridge + soaked garri* measures
**96**, although beans alone is 40–56 (low). A low-GI food does not protect a
plate; the worst thing on the plate sets it. `verdictEngine.ts` already catches
this one: soaked garri is a high-GI **drink**, so the sweet-drink override hard-
locks the meal RED and returns early. Verified by driving the engine, not by
reading it.

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

### Refused loosenings from the 2026-07 synthesis

The synthesis asks for six foods to be marked **safer** than the app says. **All
six are refused**, on the asymmetry rule: making a food look better needs two
independent sources, and a secondary summary is not one. They are listed here so
that the next person does not "discover" them and quietly apply them.

| Food | Synthesis says | We keep | Why we hold |
|---|---|---|---|
| `boiled-plantain-unripe` | GI ~45, low | **high** | We measured 89 (n=80, **full paper read**). The 45–52 band is plantain **FLOUR** (amala), a different food. Drying changes the starch. This is the single most repeated error about plantain. |
| `boiled-plantain-ripe` | ~54 | **high** | Same study: 96.5. Ripe is not gentler than unripe. |
| `sweet-potato` | 41, low | **medium** | Already refused above. Still no Nigerian in-vivo measurement. Needs a genuine second source. |
| `brown-rice`, `ofada-rice` | ~50, low | **medium** | One secondary source. They do gain: both now say 3 times a week (§4), so the better swap finally reads better than white rice. |
| `agbalumo` | 28, low | **medium** | One secondary source. |
| `cashew-fruit` | 31.6, low | **medium** | One secondary source. |

**`parboiled-rice` is the reverse case, and it is the top open question.** The
synthesis calls it **high**; we hold **medium** on a measured pilot trial in
healthy and T2D adults (GI 50–60). The synthesis supplies no counter-*number*,
only a general classification, and parboiled is the rice most Nigerians actually
eat: marking it high would drop it to 2 a week and seed staple meals RED. **Held
at medium. This is the first thing to put in front of the dietitian.**

Also noted, not acted on: palm wine measures **11** (we say medium; the frequency
is pinned to monthly by the alcohol rule regardless, so the band is not doing any
work), and plain popcorn's literature spans **55–89**, which straddles two bands.
Both left as they are.

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
| `whole-wheat-bread` | gi medium | gi high | Commercial finely-milled wholemeal bread measures 70–80, and that is what is sold here. Coarse stone-ground loaves measure 61–65, but nobody in Lagos is buying those. Conservative reading of a genuinely mixed literature (59–80). |

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

### 2026-07 corrections

**Two GI tightenings**, the only two the synthesis supports in the direction the
asymmetry rule permits:

| Food | Was | Now | Why |
|---|---|---|---|
| `tuwo-masara` | gi medium | gi **high** | Measured **86.8**. Its old description ("a touch friendlier than rice tuwo") could not stand next to that, and was rewritten. |
| `tuwo-dawa` | gi medium | gi **high** | Measured **85.3**. Whole grain, but still high. Drops 3 → 2 a week on its own. |

Both now seed a meal RED, as every high-GI non-green starch does. Tuwo masara +
efo riro + fish moved from GREEN to YELLOW, and reaches green only at a small
size. That is correct: 86.8 is not a friendly number.

**The medium-GI band was incoherent, and it is now fixed.** `capFor()` said a
medium-GI starch may be eaten 3 times a week, but **23 of the 28 medium-GI
starches said 2**, because `stricter(rule, stored)` preserved whatever legacy
prose was stored. The visible damage: **brown rice and ofada, the better swaps,
were capped HARDER than parboiled rice** — the card was telling people to eat
less of the healthier rice. This is the eba-versus-pounded-yam bug again.

`derive()` in `frequency-numbers.mjs` now takes **the rule alone for
`role: "starch"`**, and keeps `stricter(rule, stored)` for every other role.
The scoping is the whole point and must not be widened: on a starch, `gi` and
`carbLoad` are the only things that decide, so the stored number was only prose.
On a **protein or dairy** the stored number carries dietitian judgement the rule
is blind to — organ meat, saturated fat, salt, processing — which is why cow leg,
kidney, sardine, bacon and sausage must keep it.

Effect: **22 medium-GI starches move 2 → 3 a week** (sweet potato, brown rice,
ofada, basmati, cocoyam, water yam, ikokore, achicha, ekpang nkukwo, sweet potato
porridge, spaghetti, macaroni, abacha, gizdodo, popcorn, boiled and roasted and
tinned corn, aadun, golden morn, amala plantain-flour, potato salad), and
tuwo dawa moves **3 → 2**. No high-GI starch moved. **No meat, dairy, fruit,
legume or drink moved at all.** A new assertion in the script bounds the
exception: a high-GI starch may never say more than 2 a week, and a red one never
a weekly number at all.

**A gram-anchor bug, found while checking the above.** `130g` is the cooked-BEANS
anchor. It had been pasted onto rice, where the anchor is `90g` for half a cup:

- `parboiled-rice` said *half a cup, cooked (about 130g)* — 40g more than white
  rice for the same words. It is medium GI, the same band as brown, ofada and
  basmati, so it now takes the same size they do: *three-quarters of a cup
  (120g)*, and its `portionIcon` moved from `half-cup` to `three-quarter-cup`.
- `ofe-akwu` told people to eat it with *half a cup of white rice (about 130g)*,
  while the White Rice card itself says **90g**. Corrected to 90g.
- `native-rice` said *half a cup (about 130g)* in its pairing while its own
  portion field said **90g**. It was contradicting itself. Corrected to 90g.

Still open: `spaghetti` and `macaroni` say *half a cup, cooked (about 130g)*.
Half a cup of cooked pasta is nearer **70–80g**; 130g is closer to a full cup.
Left alone because no house anchor for pasta exists to correct it against.
**A dietitian should set the pasta anchor.**

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

## 6. Food and medicine: the risk the app was missing

Everything above asks "will this raise my sugar". Our users are also **on
tablets**, and some of these foods change what a tablet does. Searched PubMed
directly (E-utilities) rather than by web summary.

### Acted on: grapefruit and pomelo

Grapefruit blocks the gut enzyme (CYP3A4) that breaks down many common tablets,
so the drug builds up in the blood. Quantified in humans: **a daily glass of
grapefruit juice raises simvastatin and lovastatin blood levels by about 260%
when taken together, and atorvastatin by about 80% whenever taken**
([Lee, Morris & Wald, *Am J Med* 2016, PMID 26299317](https://pubmed.ncbi.nlm.nih.gov/26299317/)).
It does the same to calcium-channel blockers used for blood pressure (87 PubMed
hits). People with diabetes very often take a statin, a blood-pressure tablet,
or both.

**Pomelo (shaddock) does the same thing.** It is the parent species of
grapefruit and carries the same furanocoumarins (26 PubMed hits for pomelo ×
CYP3A4 / drug interaction).

The app had both as green fruit with **no warning at all**. Both now carry a
`citrus` health note. Confidence: **High** — human, quantified, replicated.

**Sweet orange and tangerine do not do this** and must never be added to
`CITRUS_IDS`. Only furanocoumarin citrus.

### The systematic sweep

Every food was checked, at the level the literature exists at. **230 of the 327
foods** were queried directly against PubMed (E-utilities), twice each — once for
food-drug interaction, once for glycaemic index. That is 460 queries. The
remaining **97 are composite dishes** (egusi soup, meat pie, chin chin, jollof).
No study exists on a dish; studies exist on its ingredients, and every ingredient
is in the query map (`scripts/` sweep, kept out of the repo as it is one-off).

Result: **168 of 230 foods have some GI literature; 62 have none at all** and
never will (suya, moi moi, akara, pap, most proteins). Those keep dietitian
judgement, as section 7 says.

### Checked, and the answer was NO — which is the useful part

Raw hit counts are not evidence. Garlic returns 604 PubMed hits for
"drug interaction OR warfarin", ginger 249, turmeric 3,052. It would have been
easy, and wrong, to warn on all three.

A **systematic review of randomised controlled trials** of herb-warfarin
interaction settles it:
*"Ginseng, ginger, garlic, and cranberry had no significant effect on the PK
parameters"*, and *"ginger, garlic, aged garlic ... did not significantly alter
the PD parameters"*
([PLoS One 2017, PMID 28797065](https://pubmed.ncbi.nlm.nih.gov/28797065/)).

So **garlic and ginger carry no warning**, and the app keeps telling people to
use them as much as they like in cooking. Turmeric's literature is nearly all in
vitro or at supplement doses; a pinch of curry powder is not a supplement.
**No card changed.** Warning people off garlic, ginger and curry would have been
a real harm dressed up as caution.

### Found, deliberately NOT acted on

**Okra and metformin.** One study reports that the water-soluble fraction of
okra reduces metformin absorption, and concludes okra "should not be taken
concurrently with metformin"
([Khatun et al., *ISRN Pharm* 2011, PMID 22389848](https://pubmed.ncbi.nlm.nih.gov/22389848/)).
**It is a rat study, and it is the only one.** Okra soup is a staple, the app
correctly calls it one of the best things a Nigerian with diabetes can eat, and
a warning here could push people off a genuinely good food. Adding a medical
instruction ("separate your metformin from your okra") on the strength of one
rodent experiment is not something this app should do on its own.
**Confidence: Low. For the dietitian to decide.** A separate 2023 human RCT
(PMID 37507536) found okra pods *helped* glycaemic control as an adjuvant.

**Bitter leaf, bitter kola, hibiscus (zobo).** Each has a real literature on
lowering blood glucose or blood pressure (35, 18 and 96 PubMed hits). If they
genuinely lower glucose, they could stack with medication and cause a hypo. None
is well enough established in humans at food-portion doses to put a warning on a
card. **Open questions, listed here so they are not forgotten.**

**Nigerian soup leaves.** The sweep added the soup ingredients the first pass
missed. Uziza (*Piper guineense*, 131 hits), scent leaf (*Ocimum gratissimum*,
85), oha (*Pterocarpus*, 37) and utazi (*Gongronema latifolium*, 19) all have a
blood-glucose literature. Same reasoning as above: plausible, not established at
the amount that goes in a pot of soup. Ogbono (*Irvingia*, 8), ewedu
(*Corchorus*, 5) and afang (*Gnetum*, 1) are thin. **Open.**

**Method note, learned the hard way.** Never guess a PMID. Twice while doing this
an invented ID returned a real paper on an unrelated subject (chamomile, then
lorazepam in children with malaria), which would have been cited as evidence for
a food claim. Always `esearch` first, then `efetch` the ID it returns. And check
the species: several top hits for plantain and okra GI are **rat** studies.

---

## 7. What has no evidence, and never will

Roughly 260 of the 327 foods have no published GI value for their Nigerian
preparation, and no trial will ever be run on gizdodo, abacha or most soups.
For those, `gi` and `carbLoad` are dietitian judgement from composition. That is
legitimate and it is what a clinic would do, but **it is judgement, not
measurement**, and this file is the place that says so.

Source tiers used throughout: peer-reviewed in-vivo measurement > compendium /
systematic review > guideline body > secondary summary. No card cites a source,
by design — the evidence lives here.

---

## 8. The dietitian review, returned 2026-07-12

The 12-question pack (`Glufloat-Dietitian-Review.docx` at the repo root) came
back marked up. **It is NOT signed.** Name, registration number, signature and
the Approved box are all blank; only a date. So this is clinical input, and the
frequency rule in section 1 **still does not have sign-off**. Founder's
instruction: nothing on the website may say so.

### Acted on

- **Salt and seasoning (Q1).** She called the row vague and gave the real
  number: **under 5g of salt a day, about one level teaspoon**, which is the WHO
  figure. Seasoning cubes to be replaced with **onions, turmeric, garlic and
  local spices**. The old warning said "use only a pinch"; a pinch and 5g cannot
  both be the number, so the number won. Applied in `NOTES.salt`
  (`health-notes.mjs`) and `DIETICIAN_*` (`clear-instructions.mjs`).
  - This also exposed a live bug: salt and the seasoning cube are **yellow**
    condiments, so `canBeEveryday()` in `lib/frequency.ts` returned false and the
    card was rendering **"About 2 times a week"** for salt, which means nothing.
    `DAILY_BUT_LIMITED` now mirrors the set in `frequency-numbers.mjs`.
- **Okra and metformin (Q5).** She asked for a *gentle* warning. See below for
  why it is not a red one.
- **Ogbono (Q6).** The only plant of the eight she wanted flagged, and her reason
  was **fat, not blood sugar** — correct, ogbono is an oilseed. It already
  carried the palm-oil note, which blamed the oil alone; it now names the seed.
- **Beans with ripe plantain (Q7).** She rejected RED and said **YELLOW, keep the
  plantain small**. Implemented as a legume bonus in `verdictEngine.ts`, gated so
  beans can never rescue a starch that is already red: **beans with dodo stays
  red**, because frying is what makes dodo red, and her instruction was about
  boiled plantain. The `beans-and-plantain` card was already yellow and already
  said "keep the plantain small"; only the meal builder was wrong.

### Checked, and the answer was NO — which is the useful part

- **Seven of the eight plants need no warning.** She declined uziza, scent leaf,
  zobo/hibiscus, oha, bitter leaf, utazi and bitter kola. That is a considered
  rejection of the whole "these plants drop blood sugar on their own" premise,
  from someone who sees patients, and it is worth as much as the one she did
  flag. Do not re-litigate it without new evidence.
- **Okra is not dangerous, and the note must not say it is.** The only evidence
  pointing that way is a **rat** study (Khatun, ISRN Pharmacology, 2011); the 2023
  RCT in people found okra *improved* control. Okra is a green staple. A red box
  under a green headline would tell people to stop eating one of the best foods on
  the list, which is false and is the more likely way to do harm. Hence the new
  `medicineNote` field: a calm grey box that says *when to take the tablet*, never
  *avoid the food*. **Do not move this into `healthNote`.**
- Garlic, ginger and curry powder (Q12): no warning needed at cooking amounts.
  Grapefruit (Q9) and the strictness rule (Q2): she approved neither and rejected
  neither — see below.

### Left as they were

Boli (Q3, "I do not know, leave it"), plantain amala (Q4, medium and twice a week
is right), the alcohol warning (Q10, correct as written), and all six existing
comorbidity warnings (Q11, "All correct").

### Still open — go back to her

1. **The signature**, plus name and registration number.
2. **Q9, grapefruit: no mark at all.** The warning is live and well-evidenced
   (section 6), but she has not confirmed it.
3. **Q2, the strictness rule: no box ticked**, and "No" typed on the *"what should
   it say instead"* line, which could mean either thing.
4. **She struck through the two evidence notes at the back** with no comment. One
   of them is why **banana is not a red food** (99 in one Nigerian study vs about
   51 internationally, and we kept the middle). If that strike means she disagrees,
   banana changes. Do not guess it.
