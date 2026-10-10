import "server-only";
import type { Translate } from "@zaydemy/core";
import type { CourseFormLabels } from "@/components/course-form";
import { resolvedConfig } from "./zaydemy";

export function courseFormLabels(t: Translate): CourseFormLabels {
	return {
		name: t("courses.name"),
		slug: t("courses.slug"),
		slugHint: t("courses.slugHint"),
		description: t("courses.descriptionField"),
		category: t("courses.category"),
		deliveryModes: t("courses.deliveryModes"),
		deliveryMode: {
			in_person: t("course.deliveryMode.in_person"),
			online: t("course.deliveryMode.online"),
		},
		pipeline: t("courses.pipeline"),
		pipelineHint: t("courses.pipelineHint"),
		isOpen: t("courses.isOpen"),
		stageOptions: t("courses.stageOptions"),
		stageOptionsHint: t("courses.stageOptionsHint"),
		usedIn: t("courses.usedIn"),
		save: t("courses.save"),
		cancel: t("courses.cancel"),
		errors: {
			name: t("courses.errors.name"),
			slug: t("courses.errors.slug"),
			slug_taken: t("courses.errors.slug_taken"),
			category: t("courses.errors.category"),
			delivery: t("courses.errors.delivery"),
			pipeline: t("courses.errors.pipeline"),
			stage: t("courses.errors.stage"),
		},
	};
}

/** Pipelines as select options: "default: Ön ödeme → Mülakat → …". */
export function pipelineOptions(t: Translate) {
	return Object.entries(resolvedConfig.pipelines).map(([key, stages]) => ({
		key,
		label: `${key}: ${
			stages.length === 0
				? t("courses.directEnrolment")
				: stages.map((id) => t(resolvedConfig.stages.get(id)?.label ?? id)).join(" → ")
		}`,
	}));
}
