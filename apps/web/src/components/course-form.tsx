"use client";

import {
	Alert,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CheckboxField,
	Field,
	Input,
	Select,
	Textarea,
} from "@zaydemy/ui";
import { useActionState } from "react";
import { type CourseFormState, saveCourse } from "@/server/actions/courses";
import type { StageSection } from "@/server/courses";

export interface CourseFormLabels {
	name: string;
	slug: string;
	slugHint: string;
	description: string;
	category: string;
	deliveryModes: string;
	deliveryMode: Record<string, string>;
	pipeline: string;
	pipelineHint: string;
	isOpen: string;
	stageOptions: string;
	stageOptionsHint: string;
	usedIn: string;
	save: string;
	cancel: string;
	errors: Record<NonNullable<CourseFormState["error"]>, string>;
}

/** Create/edit form for a course, including the options of each pipeline stage. */
export function CourseForm({
	initial,
	categories,
	pipelines,
	sections,
	labels,
}: {
	initial: Record<string, string>;
	categories: { id: string; name: string }[];
	pipelines: { key: string; label: string }[];
	sections: StageSection[];
	labels: CourseFormLabels;
}) {
	const [state, action, pending] = useActionState(saveCourse, {});
	const values = state.values ?? initial;
	const modes = new Set((values.deliveryModes ?? "").split(",").filter(Boolean));
	const invalid = (name: string) => (state.error === "stage" && state.field === name) || undefined;
	const invalidField = sections.flatMap((section) =>
		section.fields
			.filter((field) => state.field === `${section.id}.${field.key}`)
			.map((field) => `${section.label}: ${field.label}`),
	)[0];

	return (
		// Re-mount on every result so inputs pick up the values sent back with an error.
		<form key={JSON.stringify(state)} action={action} className="grid gap-6 lg:grid-cols-3">
			{values.id ? <input type="hidden" name="id" value={values.id} /> : null}
			<div className="grid content-start gap-6 lg:col-span-2">
				{state.error ? (
					<Alert variant="destructive">
						{labels.errors[state.error]}
						{state.error === "stage" && invalidField ? ` (${invalidField})` : ""}
					</Alert>
				) : null}
				<Card>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<Field label={labels.name} htmlFor="name" className="sm:col-span-2">
							<Input
								id="name"
								name="name"
								defaultValue={values.name}
								required
								aria-invalid={state.error === "name" || undefined}
							/>
						</Field>
						<Field label={labels.slug} htmlFor="slug" hint={labels.slugHint}>
							<Input
								id="slug"
								name="slug"
								defaultValue={values.slug}
								className="font-mono"
								aria-invalid={state.error === "slug" || state.error === "slug_taken" || undefined}
							/>
						</Field>
						<Field label={labels.category} htmlFor="categoryId">
							<Select id="categoryId" name="categoryId" defaultValue={values.categoryId} required>
								{categories.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</Select>
						</Field>
						<Field label={labels.description} htmlFor="description" className="sm:col-span-2">
							<Textarea
								id="description"
								name="description"
								defaultValue={values.description}
								rows={3}
							/>
						</Field>
						<fieldset className="grid gap-2 sm:col-span-2">
							<legend className="mb-2 font-medium text-sm">{labels.deliveryModes}</legend>
							<div className="flex flex-wrap gap-4">
								{Object.entries(labels.deliveryMode).map(([mode, label]) => (
									<CheckboxField
										key={mode}
										name="deliveryModes"
										value={mode}
										defaultChecked={modes.has(mode)}
									>
										{label}
									</CheckboxField>
								))}
							</div>
						</fieldset>
					</CardContent>
				</Card>

				{sections.length > 0 ? (
					<Card>
						<CardHeader>
							<CardTitle>{labels.stageOptions}</CardTitle>
							<CardDescription>{labels.stageOptionsHint}</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-6">
							{sections.map((section) => (
								<fieldset
									key={section.id}
									className="grid gap-4 border-t pt-5 first:border-0 first:pt-0"
								>
									<legend className="contents">
										<span className="font-medium">{section.label}</span>
										<span className="text-muted-foreground text-xs">
											{labels.usedIn}: {section.pipelines.join(", ")}
										</span>
									</legend>
									<div className="grid gap-4 sm:grid-cols-2">
										{section.fields.map((field) => {
											const name = `stage.${section.id}.${field.key}`;
											if (field.kind === "boolean") {
												return (
													<CheckboxField
														key={name}
														name={name}
														defaultChecked={values[name] === "true" || values[name] === "on"}
													>
														{field.label}
													</CheckboxField>
												);
											}
											return (
												<Field key={name} label={field.label} hint={field.hint} htmlFor={name}>
													<Input
														id={name}
														name={name}
														defaultValue={values[name]}
														placeholder={field.placeholder}
														type={field.kind === "url" ? "url" : "text"}
														inputMode={
															field.kind === "money" || field.kind === "number"
																? "decimal"
																: undefined
														}
														aria-invalid={invalid(`${section.id}.${field.key}`)}
													/>
												</Field>
											);
										})}
									</div>
								</fieldset>
							))}
						</CardContent>
					</Card>
				) : null}
			</div>

			<div className="grid content-start gap-6">
				<Card>
					<CardContent className="grid gap-4">
						<Field label={labels.pipeline} htmlFor="pipeline" hint={labels.pipelineHint}>
							<Select id="pipeline" name="pipeline" defaultValue={values.pipeline || "default"}>
								{pipelines.map((p) => (
									<option key={p.key} value={p.key}>
										{p.label}
									</option>
								))}
							</Select>
						</Field>
						<CheckboxField name="isOpen" defaultChecked={values.isOpen === "on"}>
							{labels.isOpen}
						</CheckboxField>
						<div className="flex gap-2 border-t pt-4">
							<Button type="submit" disabled={pending}>
								{labels.save}
							</Button>
							<a
								href="/admin/courses"
								className="inline-flex h-9 items-center px-3 text-muted-foreground text-sm hover:text-foreground"
							>
								{labels.cancel}
							</a>
						</div>
					</CardContent>
				</Card>
			</div>
		</form>
	);
}
