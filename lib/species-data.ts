// lib/species-data.ts
//
// WHAT: Botanical reference data and management guidance for CITIA-IS
//   administrative review (/admin/species).
//
// THESIS RESEARCH SCOPE & MODEL ARCHITECTURE:
//   - Target Species: Big-leaf Mahogany (Swietenia macrophylla) — Confirmed thesis scope.
//   - Study Areas: Palao Medical, Dalipuga, and NPC Area in Iligan City.
//   - YOLOv8n-cls 3-Class System:
//       1. "Mahogany" (primary target)
//       2. "Non-Mahogany" (broad negative class of other trees/plants)
//       3. "Non-Tree" (broad negative class of non-leaf/backgrounds)
//   - The model does NOT identify Molave, Narra, or Yemane as individual classes;
//     these entries serve as illustrative representatives of the Non-Mahogany class.
//
// DATA HONESTY:
//   - Mahogany represents confirmed research reference data.
//   - Molave, Narra, and Yemane represent demonstration baselines.
//   - All management guidance is informational and subject to on-site CENRO assessment.
//   - AI classification never constitutes legal authorization to cut or remove trees.

export type AiModelClass = "Mahogany" | "Non-Mahogany" | "Non-Tree";
export type SpeciesClassification = Exclude<AiModelClass, "Non-Tree">;

export type ReferenceStatus = "Confirmed thesis reference" | "Demonstration";

export interface SpeciesImage {
  id: string;
  url: string;
  caption: string;
  credit?: string;
}

export interface ManagementRecommendationItem {
  id: string;
  title: string;
  purpose: string;
  guidance: string;
  verificationRequirements: string;
}

export interface SpeciesRecord {
  id: string;
  commonName: string;
  scientificName: string;
  classification: SpeciesClassification;
  referenceStatus: ReferenceStatus;
  isConfirmed: boolean;
  family: string;
  shortDescription: string;
  botanicalFeatures: {
    leaves: string;
    leafStructure?: string;
    leafletShape?: string;
    leafColorSurface?: string;
    habit?: string;
    fruitAndSeed?: string;
    barkAndForm?: string;
  };
  sourceAndScope: string;
  images: SpeciesImage[];
  studyLocations?: string[];
  managementRecommendations: ManagementRecommendationItem[];
}

export const SPECIES_CATALOG: SpeciesRecord[] = [
  {
    id: "sp-mahogany",
    commonName: "Big-leaf Mahogany",
    scientificName: "Swietenia macrophylla",
    classification: "Mahogany",
    referenceStatus: "Confirmed thesis reference",
    isConfirmed: true,
    family: "Meliaceae",
    shortDescription:
      "Canopy tree with even-pinnately compound leaves and woody seed capsules. Primary target species for CITIA-IS identification and monitoring in Iligan City.",
    botanicalFeatures: {
      leaves:
        "Even-pinnately compound leaves, alternate, with 3–6 pairs of lanceolate leaflets (7–15 cm long) with an asymmetric base. Glossy dark green upper surface, paler underside.",
      leafStructure:
        "Even-pinnately compound leaves with 3–6 pairs of lanceolate leaflets.",
      leafletShape:
        "Leaflets are approximately 7–15 cm long with an asymmetric base.",
      leafColorSurface:
        "Glossy dark-green upper surface and a paler underside, when visible in the photograph.",
      habit:
        "Large semi-deciduous canopy tree (25–35 m) often with buttressed roots and spreading crown.",
      fruitAndSeed:
        "Woody upright 5-valved capsule (10–15 cm) that splits from the base to release flat, winged samaras adapted for wind dispersal.",
      barkAndForm:
        "Grey-brown bark developing shallow longitudinal fissures on mature trunks.",
    },
    sourceAndScope:
      "Confirmed thesis reference. Primary target species under the CITIA-IS research scope. Model training and evaluation use leaf images collected across Palao Medical, Dalipuga, and NPC Area in Iligan City.",
    images: [
      {
        id: "img-mah-1",
        url: "/assets/images/mahogany.jpg",
        caption: "Leaf specimen showing even-pinnate paired leaflet structure.",
        credit: "CITIA-IS Field Documentation",
      },
      {
        id: "img-mah-2",
        url: "/assets/images/mahogany-forest.jpg",
        caption: "Mature Mahogany stand exhibiting dense canopy cover.",
        credit: "CITIA-IS Study Site Archive",
      },
      {
        id: "img-mah-3",
        url: "/assets/images/field-documentation.jpg",
        caption: "Field observation context along roadside easement in Iligan City.",
        credit: "CITIA-IS Field Documentation",
      },
    ],
    studyLocations: ["Palao Medical", "Dalipuga", "NPC Area"],
    managementRecommendations: [
      {
        id: "rec-mah-01",
        title: "Field Verification of Community Sighting Reports",
        purpose:
          "Validate YOLOv8n-cls model classifications on site before recording official CENRO observations.",
        guidance:
          "Inspect leaf arrangement (even-pinnate paired leaflets), record tree diameter (DBH), and confirm location coordinates before updating report status.",
        verificationRequirements:
          "Ground-truth leaf morphology, measure tree size, check property jurisdiction, and assess proximity to utilities or structures.",
      },
      {
        id: "rec-mah-02",
        title: "Surveillance of Volunteer Sapling Spread",
        purpose:
          "Monitor natural recruitment downwind of mature seed-bearing trees.",
        guidance:
          "Conduct visual checks near known stands following seed release, especially in Dalipuga and NPC Area boundary zones.",
        verificationRequirements:
          "Document recruit density and assess whether wildlings are spreading toward natural vegetation corridors.",
      },
      {
        id: "rec-mah-03",
        title: "Promote Native Species for Greening & Buffers",
        purpose:
          "Encourage planting of indigenous trees rather than Mahogany in community and restoration projects.",
        guidance:
          "Recommend native species (such as Narra or Molave) for local arboriculture and watershed buffer zones.",
        verificationRequirements:
          "Evaluate planting site suitability, sunlight, and soil drainage for native species establishment.",
      },
      {
        id: "rec-mah-04",
        title: "Administrative Assessment & Permitting Notice",
        purpose:
          "Ensure legal compliance under Philippine forestry regulations before any tree intervention.",
        guidance:
          "Inform community members and landowners that CITIA-IS detection is informational and does not authorize tree cutting. Tree felling or pruning requires formal CENRO assessment and DENR Tree Cutting Permits under P.D. 705.",
        verificationRequirements:
          "All physical interventions require formal on-site CENRO inspection and approved DENR documentation.",
      },
    ],
  },
  {
    id: "sp-molave",
    commonName: "Molave",
    scientificName: "Vitex parviflora",
    classification: "Non-Mahogany",
    referenceStatus: "Demonstration",
    isConfirmed: false,
    family: "Lamiaceae",
    shortDescription:
      "Native Philippine hardwood with palmately compound leaves (usually 3 leaflets), adapted to limestone and secondary forest habitats.",
    botanicalFeatures: {
      leaves:
        "Palmately compound leaves, opposite, with 3 (rarely 5) leaflets attached at a single point (contrasting with Mahogany's pinnate leaflets along a stalk).",
      habit:
        "Medium to large deciduous tree (15–25 m) with often crooked, fluted trunk and flaking greyish-brown bark.",
      fruitAndSeed: "Small rounded fleshy drupes.",
    },
    sourceAndScope:
      "Demonstration baseline. Represents the broader Non-Mahogany negative training class. The YOLOv8n-cls model predicts 'Non-Mahogany' as a broad category and does not classify Molave individually.",
    images: [],
    studyLocations: ["Dalipuga"],
    managementRecommendations: [
      {
        id: "rec-mol-01",
        title: "Non-Target Flora Verification & Native Protection",
        purpose:
          "Prevent misidentification of native compound-leaved species during field reviews.",
        guidance:
          "Confirm palmately compound leaf structure to rule out Mahogany. Molave is a protected indigenous hardwood; preserve standing trees and uphold DENR harvesting regulations.",
        verificationRequirements:
          "Verify palmately arranged leaflets and log observation as Non-Mahogany native flora in CENRO records.",
      },
    ],
  },
  {
    id: "sp-narra",
    commonName: "Narra",
    scientificName: "Pterocarpus indicus",
    classification: "Non-Mahogany",
    referenceStatus: "Demonstration",
    isConfirmed: false,
    family: "Fabaceae",
    shortDescription:
      "Philippine National Tree. Premium native hardwood with odd-pinnately compound leaves and flat, disc-shaped winged seed pods.",
    botanicalFeatures: {
      leaves:
        "Odd-pinnately compound leaves with 7–11 alternate leaflets and a distinct single terminal leaflet (Mahogany has even-pinnate paired leaflets without a terminal leaflet).",
      habit:
        "Large forest tree (25–35 m) with fluted trunk, wide buttresses, and yellow fragrant flowers.",
      fruitAndSeed: "Circular, flat disc-shaped pod (samara) with a broad papery wing.",
    },
    sourceAndScope:
      "Demonstration baseline. Represents the broader Non-Mahogany negative training class. The YOLOv8n-cls model predicts 'Non-Mahogany' as a broad category and does not classify Narra individually.",
    images: [],
    studyLocations: ["Dalipuga", "NPC Area"],
    managementRecommendations: [
      {
        id: "rec-nar-01",
        title: "Non-Target Flora Verification & Conservation Protocol",
        purpose:
          "Safeguard native Narra trees identified during field monitoring.",
        guidance:
          "Check for odd-pinnate leaf structure with a single terminal leaflet. Narra is subject to special national conservation protections; cutting is strictly regulated under DENR policies.",
        verificationRequirements:
          "Confirm leaflet arrangement to rule out Mahogany confusion. Document specimen in local flora monitoring.",
      },
    ],
  },
  {
    id: "sp-gmelina",
    commonName: "Yemane",
    scientificName: "Gmelina arborea",
    classification: "Non-Mahogany",
    referenceStatus: "Demonstration",
    isConfirmed: false,
    family: "Lamiaceae",
    shortDescription:
      "Introduced fast-growing timber species widely cultivated in commercial tree plantations. Features large simple opposite leaves.",
    botanicalFeatures: {
      leaves:
        "Simple leaves (not compound), opposite, broadly ovate to heart-shaped (cordate), 10–25 cm long with a pointed tip.",
      habit: "Fast-growing deciduous tree (15–30 m) with smooth greyish-yellow bark.",
      fruitAndSeed: "Fleshy drupe (2–3 cm) turning glossy yellow when ripe.",
    },
    sourceAndScope:
      "Demonstration baseline. Represents the broader Non-Mahogany negative training class. The YOLOv8n-cls model predicts 'Non-Mahogany' as a broad category and does not classify Yemane individually.",
    images: [],
    studyLocations: ["Palao Medical", "NPC Area"],
    managementRecommendations: [
      {
        id: "rec-gme-01",
        title: "Agroforestry Identification & Stand Demarcation",
        purpose:
          "Distinguish private commercial tree plantations from urban green spaces or native forest buffers.",
        guidance:
          "Verify simple opposite leaf morphology. Confirm whether specimen is situated on registered private tree farmland.",
        verificationRequirements:
          "Verify leaf structure and check property registration under standard CENRO commercial plantation monitoring.",
      },
    ],
  },
];

/**
 * Returns all species records in the reference catalog.
 */
export function getAllSpecies(): SpeciesRecord[] {
  return SPECIES_CATALOG;
}

/**
 * Retrieves a single species record by its unique identifier.
 */
export function getSpeciesById(id: string): SpeciesRecord | undefined {
  return SPECIES_CATALOG.find((sp) => sp.id === id);
}
