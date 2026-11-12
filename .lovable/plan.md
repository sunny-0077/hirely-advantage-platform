# Hirely Resume Template Library

## Goal
Build an extensive, searchable professional resume library—not a small collection of renamed layouts. Preserve Hirely’s sky-blue colours, readable typography, modest side margins, sidebar animation, existing routes, authentication, Master Resume information, credits and payment behaviour.

## What the inspection found
- The existing Resume Builder already has editing, live preview, five template presets, PDF/DOCX export and a user-scoped browser draft. It does not currently save multiple named versions to the account.
- Its current Templates button starts over and clears the draft; replace that path with non-destructive switching and keep starting over as a separate confirmed action.
- Master Resume stores structured career facts in the existing profile. It contains richer information than the builder supports, including publications, volunteering, languages and credential links.
- The current database has uploaded resumes, but no occupational catalogue, reusable library definitions or builder-version tables. Uploaded files must not be repurposed as editable versions.
- PDF and on-screen preview have separate rendering paths, and PDF font choices currently map to built-in fonts. Export fidelity needs checking rather than assuming it matches the preview.
- The builder still checks a legacy export entitlement. Preserve its current behaviour in this work; do not silently alter prices, credits or access rules.

## User experience
1. Open **Resume Templates** from Master Resume and My documents; retain the existing Resume Builder address and editing workflow.
2. Browse industry and professional category, or search every title and its aliases directly.
3. Filter by a relevant career level. Show popular titles, genuinely recently published titles and related roles.
4. Choose from multiple compatible designs, preview a document and use existing Master Resume facts.
5. Edit with live preview, switch templates without losing content, save named versions and reopen them from My documents.
6. Download a professionally formatted PDF through the existing export access check; preserve DOCX support.

Use spacious, structured layouts without oversized cards or tiny text. Real document thumbnails should show layout differences. Empty, loading, failed-search, unavailable-template, unsaved-edit and save-conflict states must have working controls. No fabricated example career history in personal resumes; empty previews use clearly labelled section placeholders.

## Occupational breadth and quality
- Cover every industry listed in the brief with expandable categories, including regulated professions, skilled trades, public service and emerging fields.
- Start with a versioned O*NET occupation/title import plus reviewed Hirely additions for Indian and emerging job titles. Retain source identifiers, attribution and import provenance. Target the full useful occupational breadth, not an arbitrary 20–50-title limit.
- O*NET allows reuse under CC BY 4.0 with attribution and modification notices: [licence](https://www.onetcenter.org/license_db.html), [database](https://www.onetcenter.org/database.html). ESCO provides international occupation datasets: [download](https://esco.ec.europa.eu/en/use-esco/download). Evaluate ESCO terms and overlap before adopting it; do not depend on a runtime external API.
- Normalize and review titles, aliases and duplicates before publishing. Seniority variants must be real occupational titles, not every possible prefix attached to every occupation.
- Include all requested career stages as reusable records, but maintain an explicit applicability mapping per occupation. Do not offer Founder/CEO for unrelated clinical or trade roles.
- Verify the brief’s example titles—including Senior HR Manager, Chartered Accountant, Principal Software Engineer, SEO Specialist and Operations Director—through concrete catalogue tests.
- Show catalogue coverage honestly. An imported occupation is not advertised as template-supported until compatible structures and guidance exist.

## Role-specific resume design
Separate visual design from professional structure. Reuse several genuinely distinct, restrained document designs across suitable roles rather than creating thousands of superficial templates.

Use professional-family blueprints and reviewed role overrides: clinical credentials for healthcare; projects and technical skills for engineering; publications and research for academia; client engagements for consulting; campaigns and portfolio links for creative roles; operational experience for trades. Education/projects can lead for early-career users, while relevant experience and leadership can lead for experienced users.

Every published role/level combination must resolve to at least two compatible designs and appropriate section order, optional sections, summary prompts, skills organisation and professional guidance. Guidance is not inserted as claimed skills, certifications or achievements. Unsupported combinations remain unpublished.

## Proposed database structure (technical)
All new tables live in `public`; existing profile and uploaded-resume schemas remain untouched.

| Table | Purpose and important fields |
|---|---|
| `resume_industries` | Unique slug, label, display order, publication status |
| `resume_categories` | Industry reference, unique scoped slug, label |
| `resume_occupations` | Canonical occupation, slug, primary source identifiers, publication date/status |
| `resume_occupation_categories` | Many-to-many classification for cross-industry professions |
| `resume_job_titles` | Canonical searchable titles linked to an occupation; normalized title uniqueness |
| `resume_title_aliases` | Search synonyms linked to a canonical title, with scoped uniqueness |
| `resume_career_levels` | Stable stage key, display label, sort order |
| `resume_occupation_levels` | Explicit allowed occupation/stage combinations |
| `resume_template_designs` | Versioned reusable visual definitions and renderer key, independent of personal content |
| `resume_role_blueprints` | Versioned professional section structures and guidance |
| `resume_template_assignments` | Occupation/level/blueprint/design compatibility and optional title overrides; unique combinations |
| `resume_catalogue_sources` | Dataset version, source URL/licence, attribution, import date and modifications |
| `resume_versions` | Owner UUID, name, selected title/level/design/blueprint versions, document schema version, validated content snapshot, revision counter and timestamps |

- Catalogue read policies expose only published records to signed-in users. Catalogue writes are restricted to trusted server-side imports; no new admin roles or editable browser permissions.
- Personal versions have owner-only SELECT/INSERT/UPDATE/DELETE policies using `auth.uid()` and a revision check to prevent stale tabs overwriting newer edits. No foreign keys to managed auth tables.
- Every new table migration follows CREATE → explicit GRANTs → enable RLS → policies; use the migration tool to apply it.
- Indexed, paginated search covers canonical titles and aliases, with category/industry/level filtering. Popularity initially uses an explicit editorial rank, labelled popular titles—not invented usage statistics.
- Keep reviewed catalogue seeds/import scripts outside frontend bundles. Versioned, repeatable imports use stable source IDs and upserts; publish only validated records. New data must not require redesigning the page.

## Content and compatibility safeguards
- Read Master Resume through its existing validated schema and map it deterministically into an editable snapshot. Never write back to Master Resume when choosing a template or saving a version.
- Preserve all original career facts, links, dates and additional sections; extend the document model/editor/renderers where needed instead of discarding unsupported fields.
- Template switching changes presentation and section ordering, not factual content. Hidden sections remain recoverable; users can review what is shown.
- Existing builder drafts are offered as a recoverable draft, never replaced automatically or deleted during migration. Creating a new version requires an explicit action.
- No AI generation is required for browsing, mapping or manual editing. Existing paid generators and credit handlers remain untouched.
- Keep both preview and exports driven by the same normalized document model, with multipage layout checks, long-content wrapping and supported Unicode fonts.

## Implementation sequence
1. Add the schema, repeatable source import and catalogue validation tests; inspect actual coverage and duplicate counts.
2. Add reviewed professional blueprints, career-stage applicability and compatible visual definitions.
3. Build the industry/title browser, filters, previews and entry links using existing shared controls and colours.
4. Connect deterministic Master Resume mapping and extend the existing editor, preserving legacy drafts and template-switch content.
5. Add private named-version saving, reopening and conflict handling in My documents; retain existing export access behaviour.
6. Validate search, isolation, data preservation and document exports before marking the library complete.

## Acceptance checks
- All requested industries and career stages exist; only applicable levels appear for each occupation; aliases find the intended titles and repeated imports create no duplicates.
- Every published role/level combination has multiple compatible templates; healthcare, academic, technical and business blueprints have materially different section structures.
- Concrete tests prove empty facts stay empty, no suggested qualification becomes a fact, template switching preserves all content and additional Master Resume information survives mapping.
- Signed-in end-to-end check: search a title → filter level → preview → use real Master Resume → edit → switch → save two versions → reload/open → export PDF and inspect its text/pages. Check owner isolation and concurrent-edit conflicts.
- Check desktop and phone layouts, long titles, empty results and large multi-page resumes; rerun existing Master Resume/auth/source tests and check app errors.
- If the authorized account still requires onboarding, do not bypass it or invent profile facts; report the precise remaining signed-in checks rather than claiming completion.

## Approval boundary
This proposal does not change the app or database yet. Approval starts the staged implementation above; the existing tools stay usable while the library is added.