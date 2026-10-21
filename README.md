# Zaydemy

Open-source, white-label student application and enrolment system with a plugin-based pipeline.

> **Status:** early development. APIs and the database schema may still change between versions.

## Getting started

You need Node.js 22 or newer, pnpm 10 (`corepack enable` installs it) and Docker for the database.
Any Postgres 16 works too; set `DATABASE_URL` to it and skip step 2.

```sh
# 1. Install dependencies
pnpm install

# 2. Start Postgres on localhost:5432
docker compose up -d

# 3. Configure the app
cp apps/web/.env.example apps/web/.env
#    then set BETTER_AUTH_SECRET in apps/web/.env, e.g. to the output of `openssl rand -base64 32`

# 4. Create the tables and the demo data
pnpm db:migrate
pnpm db:seed

# 5. Run it
pnpm dev
```

Open http://localhost:3000. The seed creates:

- an admin account, `admin@example.com`, with a generated password the seed prints (set
  `ADMIN_EMAIL` and `ADMIN_PASSWORD` before seeding to choose your own, or to make an existing user
  admin);
- a paid course that goes through every stage (prepayment, interview, documents, contract,
  tuition) and a free course on the empty `free` pipeline;
- a document type, a bank account for transfers and a sample enrolment contract.

Sign up with any other e-mail to try the applicant side: apply to a course on the home page, then
follow "Devam et" (continue) for the current step. Sign in as the admin to approve payments, interviews,
documents and contracts under `/admin`, where you can also search and move applications, create
courses and set their stage options (amounts, required documents...), and manage users, roles and
permissions.

Without extra settings, e-mails and SMS are printed to the server console and uploads go to
`apps/web/storage/`. Card payments, Postmark, Ekomesaj, Bunny Storage, Sentry and Discord each turn
on when their variables in `.env` are set; see `apps/web/integrations.ts`. Card payments run on
[better-payment](https://github.com/czaydev/better-payment) with iyzico sandbox keys by default.

To change the brand (name, logo, colour), the enabled plugins or the stages of each pipeline, edit
`apps/web/zaydemy.config.ts`.

### Demo Mode

To run the application in a read-only demo mode where users cannot perform write operations (except for authentication endpoints), set the `DEMO_MODE` environment variable to `true`.

```sh
DEMO_MODE=true pnpm dev
```

## Layout

```
apps/web/            Next.js app: routes and layouts only
  zaydemy.config.ts  branding, enabled plugins, pipelines
packages/core/       plugin API, pipeline engine, config + licence checks
packages/db/         Drizzle client, core schema, pipeline store
packages/auth/       better-auth on Drizzle (e-mail/password, one-time codes, Google, roles)
packages/i18n/       translator; core strings in Turkish and English
packages/ui/         design tokens and React components shared by the app and plugins
packages/tsconfig/   shared TypeScript config
plugins/             community plugins (stages, payment providers, integrations)
ee/                  commercially licensed plugins
```

## How applications move

Each course picks a named pipeline from `zaydemy.config.ts`, an ordered list of stage ids such as
`["prepayment", "interview", "documents"]`. Plugins provide the stages. When an application reaches
a stage, the stage's `onEnter` returns `wait`, `complete` or `skip`; a waiting stage is finished by
the plugin calling `engine.complete()` or `engine.reject()`. An empty pipeline enrols applicants
immediately, which suits free courses.

The stage list is frozen on the application when it is created, so changing a pipeline later never
breaks applications already in progress.

## Plugins

| Plugin | What it does |
| --- | --- |
| `payments` | Payments table, `prepayment` / `tuition` stages (amount per course, 0 skips), checkout and admin pages |
| `payment-card` | Card payments through [better-payment](https://github.com/czaydev/better-payment): iyzico, PayTR, Parampos, Akbank, Kuveyt Türk |
| `payment-bank-transfer` | Bank accounts shown to payers; transfers are reported and confirmed by staff |
| `stage-interview` | Interview stage |
| `stage-documents` | Document types, per-course document lists, uploads and review (needs a storage plugin) |
| `stage-contract` | Contract stage: the applicant accepts a policy online, or staff record a paper contract |
| `notifications` | In-app inbox plus e-mail/SMS on stage changes, payments and rejected documents |
| `storage-local`, `storage-bunny` | File storage on disk or in a Bunny.net zone |
| `mail-postmark` | E-mail through Postmark |
| `sms-ekomesaj` | SMS through Ekomesaj |
| `monitoring-sentry` | Server errors to Sentry |
| `feedback-discord` | Feedback form posting to a Discord channel |
| `redirects` | Short links at `/r/<slug>` with click counts |
| `link-in-bio` | Public `/links` page for social media bios |
| `lessons` | Manages course content (sections, lessons) with basic views |

Plugins that need credentials are switched on from environment variables in
`apps/web/integrations.ts`; the rest are listed in `apps/web/zaydemy.config.ts`. After enabling a
plugin with tables, add its `schema.ts` to `apps/web/drizzle.config.ts` and run `pnpm db:generate`.

### Transactions and events

A stage's `onEnter` receives the pipeline transaction as `db`, so rows it creates commit or roll back
with the stage change. `engine.complete()` and `engine.reject()` take an `effect` for the plugin's own
writes (marking a payment paid, recording an interview result) in the same transaction, and
`engine.transaction()` gives standalone plugin work the same guarantees. Handlers registered with
`hooks.on()` run inside the transaction and can roll it back; handlers registered with `events.on()`
run after commit and suit e-mail and other side effects.

## Writing a plugin

```ts
import { definePlugin, defineStage } from "@zaydemy/core";

export const myPlugin = definePlugin({
	id: "stage-example",
	name: "Example stage",
	version: "0.1.0",
	stages: [defineStage({ id: "example", label: "example.stage", onEnter: () => "wait" })],
	schema: {},       // Drizzle tables owned by the plugin
	adminNav: [],     // admin sidebar entries: { label, href, icon, permission }
	appNav: [],       // applicant menu entries, e.g. { label: "example.nav", href: "/examples" }
	messages: {},     // tr / en translations
	pages: [          // mounted under /admin/… or at the site root
		{ area: "admin", path: "/examples/[id]", permission: "examples.manage", load: () => import("./pages/example") },
	],
	api: [            // HTTP handlers under /api, with optional signedIn / permission checks
		{ method: "POST", path: "/examples/[id]", signedIn: true, handler: async (request, { params, session }) => new Response() },
	],
	requires: [],      // services that must be enabled, e.g. ["storage"]
	contributes: {},   // values for another plugin's extension point, e.g. payment methods
	setup({ events, hooks, engine, db, mailer, sms, storage, errorReporter }) {
		events.on("stage.entered", async ({ applicationId, stage }) => {
			/* … */
		});
	},
});
```

Plugin pages are server components and read the database through `runtime()`. Admin pages need the
listed permission (or any role when none is set); turning a plugin off removes its pages and
menu entries from the build. App pages are framed by the site header and footer; pass
`layout: "bare"` for public pages with their own look, such as `/links`.

### Interface

Pages are built from `@zaydemy/ui`: Tailwind CSS v4 with design tokens, plus server-friendly
components such as `Button`, `Card`, `Table`, `Field`, `Badge`, `Alert`, `PageHeader`, `EmptyState`
and `Steps`. The primary colour comes from `brand.theme.primary` in `zaydemy.config.ts`, and the
rest of the palette (hover, soft backgrounds, focus rings, dark mode) is derived from it.

```ts
import { Button, Card, CardContent, PageHeader } from "@zaydemy/ui";

export default function ExamplePage({ t }: PluginPageProps) {
	return (
		<main>
			<PageHeader title={t("example.title")} />
			<Card>
				<CardContent>
					<Button>{t("example.save")}</Button>
				</CardContent>
			</Card>
		</main>
	);
}
```

A plugin can also render plain semantic HTML: headings, tables, forms, inputs and buttons without
a `class` attribute are styled by the theme, so a page still fits in before it uses the components.
Navigation icons are named (`icon: "wallet"`); see `packages/ui/src/components/icon.tsx`.

### Stage options

A stage's `options` schema is also its form on the course page. Give each field a label and hint
through zod metadata, and the course editor renders and validates it:

```ts
options: z.object({
	amount: z.number().int().min(0).meta({ label: "payments.options.amount", format: "money" }),
	currency: z.string().default("TRY").meta({ label: "payments.options.currency" }),
}),
```

Supported fields are numbers (`format: "money"` takes "1.250,50" and stores minor units), strings,
URLs, string lists (comma separated) and booleans.

### Permissions

Core declares `applications.view`, `applications.manage`, `courses.manage` and `users.manage`;
plugins add their own through `permissions`. Name them for the roles page with messages under
`permissions.<namespace>.<action>`.

See `plugins/stage-interview` for a complete example.

## Development

Checks: `pnpm typecheck`, `pnpm test`, `pnpm lint`. The Postgres integration tests in `apps/web`
run when `TEST_DATABASE_URL` points at an empty database, for example
`TEST_DATABASE_URL=postgres://postgres@localhost:5432/zaydemy_test pnpm test`.

After changing a schema file, run `pnpm --filter @zaydemy/web db:generate` to add a migration.

## Licence

The core and community plugins will be released under AGPL-3.0 with an attribution requirement
("Powered by czay.dev"). Plugins in `ee/` are under a commercial licence.
