# CITIA-IS content sources

This file lists the factual claims shown on the CITIA-IS website and the
reference found for each one. Use it to decide what the thesis paper can
cite and what still needs a source.

Last checked: 14 November 2026.

## Read this first

- **The website text had no recorded sources.** The species facts, the
  ecological statements and the Management Recommendations were already
  in `lib/species-data.ts` and `app/species/page.tsx`, with no citation
  anywhere in the project. Who first wrote them is not recorded.
- **The references below were found by web search on the date above.**
  Only search summaries were read, not the full papers. Open and read
  each source before citing it, and take the author, year and title from
  the source itself.
- **Status meanings:**
  - *Supported*: a source agrees with the claim.
  - *Mixed*: sources disagree with each other.
  - *Does not match*: the sources found give a different figure.
  - *No source found*: nothing was found; the claim needs a reference
    or should be removed.
  - *Not checked*: the searches did not cover it.

## 1. Mahogany (*Swietenia macrophylla*)

| Claim on the site | What the sources say | Status |
| --- | --- | --- |
| Not native to the Philippines; native to tropical Central and South America | Consistent across the sources below | Supported |
| Introduced as a plantation timber species | FAO lists mahogany among the earliest Philippine plantations. Sources give first introductions between 1907 and 1913. | Supported; cite the date as a range |
| Even-pinnately compound leaves with 3–6 pairs of leaflets | World Agroforestry: paripinnate, 6 to 16 leaflets. Other floras: 3–6 pairs. | Supported |
| Leaflets are 7–15 cm long | World Agroforestry: up to 20 cm | Does not match |
| Fruit is a woody, upright, five-valved capsule, 10–15 cm | Sources give about 12.5 × 7.5 cm and 8.5 × 6.5 cm; erect, woody, 5-valved | Shape supported; size does not match |
| Tree is 25–35 m tall | Sources give 30–40 m, and 45–60 m in the wild | Does not match |
| Glossy dark green upper surface, paler underside; grey-brown fissured bark; buttressed roots | Not covered by the searches | Not checked |

Sources:

- World Agroforestry, Agroforestree Database, *Swietenia macrophylla*:
  <https://apps.worldagroforestry.org/treedb2/AFTPDFS/Swietenia_macrophylla.PDF>
- NParks Flora & Fauna Web, *Swietenia macrophylla*:
  <https://www.nparks.gov.sg/florafaunaweb/flora/3/1/3150>
- FAO, early plantations in the Philippines:
  <https://www.fao.org/3/x5596e/x5596e03.htm>
- Preprint on big-leaf mahogany in the Philippines (2023):
  <https://www.preprints.org/manuscript/202308.1852>

## 2. Ecological impact

| Claim on the site | What the sources say | Status |
| --- | --- | --- |
| Where Mahogany is dense, it can contribute to a less diverse native understory | Baguinon's Mt. Makiling work reports that Mahogany leaf extract inhibits Narra seedlings and that its leaf litter hinders germination. Tulod et al. (2017, Southern Philippines) found no significant overall difference in regeneration density between exotic stands and second-growth forest. | Mixed. The site's cautious wording ("depends on…") fits the evidence. |
| It offers fewer food and shelter resources for native wildlife than many native trees | Nothing found | No source found |
| Its effect depends on where the tree grows, how it was established and what grows alongside it | A reasonable reading of the mixed evidence, but not stated in this form by a source found | No source found |
| Mahogany is officially listed as invasive by DENR | Recent Philippine studies call it invasive. An official DENR listing was not confirmed. | Not confirmed |

Sources:

- Baguinon, *Ecological perspective on bioinvasion of the Makiling
  forest by alien plant taxa: policy implications* (AGRIS record):
  <https://agris.fao.org/search/en/records/647364cde17b74d2225448f2>
- FAO, XII World Forestry Congress paper 0524-B4:
  <https://www.fao.org/4/XII/0524-B4.htm>
- Journal of Tropical Forest Science, understory regeneration in exotic
  stands in the Southern Philippines:
  <https://jtfs.frim.gov.my/jtfs/article/download/942/789/1035>

## 3. Reference species

These three entries are labelled "Demonstration" in `lib/species-data.ts`.

| Claim on the site | What the sources say | Status |
| --- | --- | --- |
| Narra (*Pterocarpus indicus*) is the Philippine national tree | Proclamation No. 652, 1 February 1934, by Governor-General Frank Murphy | Supported |
| Narra has odd-pinnately compound leaves with 7–11 leaflets and one leaflet at the tip; flat winged seed pods | Not covered by the searches | Not checked |
| Molave (*Vitex parviflora*) is a native Philippine hardwood with palmately compound leaves, usually 3 leaflets | World Agroforestry: opposite, compound, 3-foliate; native to the Philippines. One newspaper article describes the leaves differently. | Mostly supported |
| Molave is adapted to limestone and secondary forest | Not covered | Not checked |
| Yemane (*Gmelina arborea*) is an introduced fast-growing plantation species with large simple opposite leaves | World Agroforestry has a profile. The leaf arrangement and the Philippine introduction were not confirmed. | Not confirmed |

Sources:

- Philippine Daily Inquirer, on Proclamation No. 652:
  <https://opinion.inquirer.net/?p=173928>
- World Agroforestry, *Vitex parviflora*:
  <https://apps.worldagroforestry.org/treedb2/speciesprofile.php?Spid=17969>
- World Agroforestry, *Gmelina arborea*:
  <https://apps.worldagroforestry.org/treedb2/speciesprofile.php?Spid=914>

## 4. Tree cutting and the law

| Claim on the site | What the sources say | Status |
| --- | --- | --- |
| Cutting, felling or removing trees is regulated and can carry legal consequences | Presidential Decree 705 (Revised Forestry Code) covers public and private land | Supported in general |
| (Not stated on the site) Whether a planted Mahogany on titled private land needs a cutting permit | Legal commentaries say planted trees on titled land may not need one under DENR orders. A DENR-linked article says a permit is still needed. | Mixed. Ask CENRO Iligan which rule applies and cite the law itself. |

Sources:

- Presidential Decree 705, text on FAOLEX:
  <https://faolex.fao.org/docs/pdf/phi212490.pdf>
- DENR Forest Management Bureau, timber harvesting and transport:
  <https://forestry.denr.gov.ph/fmb_web/210-timber-harvesting-and-transport/>
- Bataan provincial government, "Cutting trees in private lot still
  needs permit":
  <https://bataan.gov.ph/news/cutting-trees-in-private-lot-still-needs-permit/>

## 5. Management Recommendations

The four recommendations on the Species Guide ("Monitor what you already
see", "Plant with the wider ecosystem in mind", "Report observations
through CITIA-IS", "Consult CENRO or the relevant environmental
authority") have **no source**. They are general guidance and were not
taken from a DENR or CENRO document.

For the paper, the strongest support is a review and endorsement by
CENRO Iligan City, cited as a personal communication or an endorsement
letter.

## 6. Photographs

| Photo | Used on | Note |
| --- | --- | --- |
| `mahogany.jpg` | Landing page hero, Species Guide | No record of who took it or where |
| `ecological-impact.jpg` | Landing page "Why it matters" | No record of who took it or where |
| `mahogany-forest.jpg` | Species Guide, feature plates | No record of who took it or where |
| `field-documentation.jpg` | Feature plates | Shows a Brazilian flag patch, so it is probably not a photo from Iligan. `lib/species-data.ts` credits it as "CITIA-IS Field Documentation"; check before the paper repeats that credit. |

## 7. Wording written for the website itself

These describe how CITIA-IS behaves, so the system is their source:

- "You get a reference number as soon as the report is sent."
- "CENRO staff review every report."
- "The result is a suggestion from the AI."

The three photo tips on the Identify page ("One leaf, lying flat…",
"Daylight, without flash glare", "A plain background if you can") are
general advice with no source. Replace them if the model's training
photos call for different advice.

## What to do next

1. Read each source above and record its full citation.
2. Decide what to do about the three figures that do not match:
   leaflet length, capsule size and tree height.
3. Find a source for the wildlife claim, or remove it.
4. Ask CENRO Iligan City to review the Management Recommendations and
   to confirm the tree-cutting rule for planted trees.
5. Record where each photograph came from.
