# CITIA-IS: Community-Driven Mahogany Tree Identification and Recommendation Management Information System Using YOLOv8

> **Undergraduate Thesis Proposal**  
> **Degree:** Bachelor of Science in Information Systems  
> **Institution:** Mindanao State University – Iligan Institute of Technology (MSU-IIT)  
> **Stakeholder / Focus Area:** CENRO Iligan City (Palao Medical, Dalipuga, NPC Area)

---

## 🌿 About CITIA-IS

**CITIA-IS** is a web-based, role-based environmental management information system anchored on **Citizen Science**. It enables community members to perform fast, browser-based AI identification of Mahogany (*Swietenia macrophylla*) leaves and log environmental sightings without requiring account creation. 

Simultaneously, the platform provides local authorities at **CENRO Iligan City** with centralized monitoring, automated observation records, and data-driven decision support to replace paper-based and informal field documentation workflows.

### Primary Gaps Addressed
1. **Taxonomic Specificity Gap:** Addresses invasive tree species specifically (*Swietenia macrophylla*) rather than generic non-specific vegetation.
2. **User Accessibility Gap:** Removes the requirement for specialized forestry hardware or mandatory user registration for public reporting.
3. **Public Reporting Gap:** Transforms unstructured community observations into actionable, spatial database records accessible to local decision-makers.

---

## 🚀 Core Features & UX Architecture

CITIA-IS enforces a clean separation of roles to ensure maximum accessibility and institutional control:
PUBLIC / GUEST USER (No Account Required)
└── Identify (YOLOv8 Leaf Classification)
└── Learn (Ecological Guidance & Invasive Impact)
└── Report (GIS Sighting Submission)

CENRO / ADMIN (Authentication Required)
└── Review & Verify Sightings
└── Centralized Environmental Dashboard
└── Spatial & Ecological Field Analytics

---

### Public Features
* **AI-Assisted Mahogany Identification:** Upload or capture leaf imagery for real-time classification (`Mahogany`, `Non-Mahogany`, `Non-Tree`).
* **Ecological Insights:** Access species characteristics, invasive impact summaries, and recommended mitigation actions.
* **GIS Sighting Submission:** Report tree coordinates directly from standard mobile or desktop web browsers.

### CENRO Administrative Features
* **Centralized Reporting Dashboard:** Aggregate community observations and manage field verification statuses.
* **Spatial & Ecological Monitoring:** Monitor localized invasive density across pilot zones in Iligan City.
* **Audit & Records Management:** Transition paper records to structured digital records.

---

## 🏗️ System Architecture

CITIA-IS is built on a **Three-Tier Architecture**:

1. **Presentation Tier (Frontend):** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
2. **Application Tier (Backend API & AI):** Python, FastAPI, YOLOv8 (`YOLOv8n-cls` mode)
3. **Data Tier (Database):** PostgreSQL

---

## 🛠️ Tech Stack

| Domain | Technology | Usage |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14+ (App Router) | Responsive UI, SSR, Routing |
| **Language** | TypeScript | Type-safe web development |
| **Styling & UI** | Tailwind CSS / shadcn/ui | Civic environmental design system |
| **Icons** | Lucide React | Contextual UI icons |
| **Backend Framework** | FastAPI (Python) | High-performance inference API & routes |
| **AI Classifier** | YOLOv8n-cls | Transfer learning leaf identification |
| **Database** | PostgreSQL | Relational storage for sightings & logs |

---


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
